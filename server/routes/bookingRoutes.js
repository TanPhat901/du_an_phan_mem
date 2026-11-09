const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const { pool, isDbConnected } = require('../config/db');

let fallbackPartners = [];

const isPeakHour = (startTimeStr) => {
  const hour = parseInt(String(startTimeStr || '0').split(':')[0], 10);
  return hour >= 17 && hour < 21;
};

const resolvePeakFlag = (isPeakValue, startTimeStr) => {
  if (typeof isPeakValue === 'boolean') return isPeakValue;
  return isPeakHour(startTimeStr);
};

const parseBookingNumericId = (rawId) => {
  const cleaned = String(rawId || '').replace(/^BK-/i, '').trim();
  const id = Number(cleaned);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const extractOptionalUser = (req) => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    const err = new Error('Authorization header không hợp lệ.');
    err.status = 401;
    throw err;
  }
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET chưa được cấu hình.');
    err.status = 500;
    throw err;
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    const err = new Error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
    err.status = 401;
    throw err;
  }
};

const mapBookingRow = (b) => ({
  id: `BK-${b.booking_id}`,
  bookingId: Number(b.booking_id),
  courtId: Number(b.court_id),
  courtName: b.court_name || 'Sân thể thao',
  address: b.court_address || '',
  subCourtId: b.sub_court_id ? Number(b.sub_court_id) : null,
  subCourtName: b.sub_court_name || null,
  customerName: b.customer_name || b.user_full_name || 'Khách đặt sân',
  phone: b.customer_phone || b.user_phone || '',
  date: b.booking_date_str || '',
  timeSlot: b.time_slot || '—',
  totalPrice: parseFloat(b.total_amount || 0),
  paymentMethod: b.payment_method || 'Tại quầy',
  paymentStatus: b.payment_status || 'PENDING',
  status: b.status,
  statusLabel:
    b.status === 'CONFIRMED'
      ? 'Đã xác nhận'
      : b.status === 'CANCELLED'
        ? 'Đã hủy'
        : 'Hoàn thành',
  cancelReason: b.cancel_reason || '',
  note: b.note || '',
  createdAt: b.created_at
});

const BOOKING_SELECT_SQL = `
  SELECT
    b.booking_id,
    b.user_id,
    b.court_id,
    b.sub_court_id,
    TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date_str,
    b.status,
    b.total_amount,
    b.cancel_reason,
    b.customer_name,
    b.customer_phone,
    b.payment_method,
    b.payment_status,
    b.note,
    b.created_at,
    c.name AS court_name,
    c.address AS court_address,
    sc.name AS sub_court_name,
    u.full_name AS user_full_name,
    u.phone AS user_phone,
    COALESCE(
      TO_CHAR(ts.start_time, 'HH24:MI') || ' - ' || TO_CHAR(ts.end_time, 'HH24:MI'),
      '—'
    ) AS time_slot
  FROM bookings b
  LEFT JOIN courts c ON b.court_id = c.court_id
  LEFT JOIN users u ON b.user_id = u.user_id
  LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
  LEFT JOIN time_slots ts ON ts.slot_id = bd.slot_id
  LEFT JOIN sub_courts sc ON sc.sub_court_id = COALESCE(bd.sub_court_id, b.sub_court_id)
`;

// GET /api/bookings/my - Lịch đặt sân của người dùng đang đăng nhập
router.get('/my', authMiddleware, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }
  try {
    const userId = Number(req.user.userId);
    const result = await pool.query(
      `${BOOKING_SELECT_SQL}
       WHERE b.user_id = $1
       ORDER BY b.booking_date DESC, b.created_at DESC`,
      [userId]
    );
    return res.json({
      success: true,
      source: 'PostgreSQL Database',
      data: result.rows.map(mapBookingRow)
    });
  } catch (err) {
    console.error('Lỗi lấy lịch đặt của tôi:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tải lịch đặt sân.' });
  }
});

// GET /api/bookings - Lấy lịch đặt theo JWT hoặc tra cứu theo SĐT (?phone=...)
router.get('/', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  let authUser = null;
  try {
    authUser = extractOptionalUser(req);
  } catch (err) {
    return res.status(err.status || 401).json({ success: false, message: err.message });
  }

  try {
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone.trim() : '';

    if (authUser && authUser.role === 'ADMIN') {
      const result = await pool.query(
        `${BOOKING_SELECT_SQL} ORDER BY b.created_at DESC`
      );
      return res.json({ success: true, source: 'PostgreSQL Database', data: result.rows.map(mapBookingRow) });
    }

    if (authUser) {
      const result = await pool.query(
        `${BOOKING_SELECT_SQL}
         WHERE b.user_id = $1
         ORDER BY b.booking_date DESC, b.created_at DESC`,
        [Number(authUser.userId)]
      );
      return res.json({ success: true, source: 'PostgreSQL Database', data: result.rows.map(mapBookingRow) });
    }

    if (phoneQuery.length >= 8) {
      const result = await pool.query(
        `${BOOKING_SELECT_SQL}
         WHERE b.customer_phone = $1 OR u.phone = $1
         ORDER BY b.booking_date DESC, b.created_at DESC`,
        [phoneQuery]
      );
      return res.json({ success: true, source: 'PostgreSQL Database', data: result.rows.map(mapBookingRow) });
    }

    return res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập hoặc cung cấp số điện thoại để tra cứu lịch đặt sân.'
    });
  } catch (err) {
    console.warn('⚠️ Lỗi truy vấn bookings PostgreSQL:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách đặt sân.' });
  }
});

// POST /api/bookings - Tạo đơn đặt sân thật (kiểm tra slot trống + chống đặt trùng)
router.post('/', async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu để đặt sân.' });
  }

  let authUser = null;
  try {
    authUser = extractOptionalUser(req);
  } catch (err) {
    return res.status(err.status || 401).json({ success: false, message: err.message });
  }

  const {
    courtId,
    subCourtId,
    slotId,
    customerName,
    phone,
    date,
    timeSlot,
    paymentMethod,
    note
  } = req.body || {};

  const parsedCourtId = Number(courtId);
  const parsedSubCourtId = subCourtId ? Number(subCourtId) : null;
  const parsedSlotId = slotId ? Number(slotId) : null;

  if (
    !Number.isSafeInteger(parsedCourtId) || parsedCourtId <= 0 ||
    typeof customerName !== 'string' || !customerName.trim() ||
    typeof phone !== 'string' || !phone.trim() ||
    typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    (!parsedSlotId && (typeof timeSlot !== 'string' || !timeSlot.trim()))
  ) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin hợp lệ: Cụm sân, Tên, SĐT, Ngày chơi và Khung giờ.'
    });
  }

  const cleanName = customerName.trim();
  const cleanPhone = phone.trim();
  const cleanPayment = typeof paymentMethod === 'string' && paymentMethod.trim() ? paymentMethod.trim() : 'Tại quầy';
  const cleanNote = typeof note === 'string' && note.trim() ? note.trim() : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Kiểm tra cụm sân đang hoạt động
    const courtRes = await client.query(
      `SELECT court_id, name, address, price_per_slot, operational_status, is_visible
       FROM courts
       WHERE court_id = $1`,
      [parsedCourtId]
    );
    if (courtRes.rowCount === 0 || !courtRes.rows[0].is_visible || courtRes.rows[0].operational_status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Cụm sân không tồn tại hoặc đã tạm ngưng hoạt động.' });
    }
    const courtRow = courtRes.rows[0];

    // 2. Kiểm tra sân con nếu được chọn
    let resolvedSubCourtId = null;
    let resolvedSubCourtName = null;
    let normalPrice = Number(courtRow.price_per_slot || 200000);
    let peakPrice = normalPrice;

    if (parsedSubCourtId) {
      if (!Number.isSafeInteger(parsedSubCourtId) || parsedSubCourtId <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Mã sân con không hợp lệ.' });
      }
      const scRes = await client.query(
        `SELECT sub_court_id, name, normal_price, peak_price, status, is_visible
         FROM sub_courts
         WHERE sub_court_id = $1 AND court_id = $2`,
        [parsedSubCourtId, parsedCourtId]
      );
      if (scRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Sân con không thuộc cụm sân đã chọn.' });
      }
      const sc = scRes.rows[0];
      if (sc.status !== 'ACTIVE' || !sc.is_visible) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Sân con này hiện đang bảo trì hoặc tạm đóng.' });
      }
      resolvedSubCourtId = Number(sc.sub_court_id);
      resolvedSubCourtName = sc.name;
      normalPrice = Number(sc.normal_price);
      peakPrice = Number(sc.peak_price);
    }

    // 3. Xác định khung giờ trong time_slots
    let slotRes;
    if (parsedSlotId && Number.isSafeInteger(parsedSlotId)) {
      slotRes = await client.query(
        `SELECT slot_id,
                TO_CHAR(start_time, 'HH24:MI') AS start_label,
                TO_CHAR(end_time, 'HH24:MI') AS end_label,
                TO_CHAR(start_time, 'HH24:MI:SS') AS start_full,
                TO_CHAR(end_time, 'HH24:MI:SS') AS end_full,
                is_peak
         FROM time_slots
         WHERE slot_id = $1 AND court_id = $2 AND is_active = TRUE`,
        [parsedSlotId, parsedCourtId]
      );
    } else {
      slotRes = await client.query(
        `SELECT slot_id,
                TO_CHAR(start_time, 'HH24:MI') AS start_label,
                TO_CHAR(end_time, 'HH24:MI') AS end_label,
                TO_CHAR(start_time, 'HH24:MI:SS') AS start_full,
                TO_CHAR(end_time, 'HH24:MI:SS') AS end_full,
                is_peak
         FROM time_slots
         WHERE court_id = $1 AND is_active = TRUE
           AND (TO_CHAR(start_time, 'HH24:MI') || ' - ' || TO_CHAR(end_time, 'HH24:MI')) = $2
         LIMIT 1`,
        [parsedCourtId, timeSlot.trim()]
      );
    }

    if (slotRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Khung giờ bạn chọn không tồn tại hoặc chưa được mở tại cụm sân này.'
      });
    }

    const slotRow = slotRes.rows[0];
    const resolvedSlotId = Number(slotRow.slot_id);
    const resolvedSlotLabel = `${slotRow.start_label} - ${slotRow.end_label}`;
    const authoritativePrice = resolvePeakFlag(slotRow.is_peak, slotRow.start_full) ? peakPrice : normalPrice;

    // 4. Kiểm tra lịch khóa sân (court_blocks)
    const slotStartTs = `${date} ${slotRow.start_full}`;
    const slotEndTs = `${date} ${slotRow.end_full}`;
    const blockRes = await client.query(
      `SELECT reason
       FROM court_blocks
       WHERE court_id = $1
         AND (sub_court_id IS NULL OR ($2::bigint IS NOT NULL AND sub_court_id = $2))
         AND TO_CHAR(start_at, 'YYYY-MM-DD HH24:MI:SS') < $4
         AND TO_CHAR(end_at, 'YYYY-MM-DD HH24:MI:SS') > $3
       LIMIT 1`,
      [parsedCourtId, resolvedSubCourtId, slotStartTs, slotEndTs]
    );
    if (blockRes.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Khung giờ này hiện đang bị khóa (${blockRes.rows[0].reason}).`
      });
    }

    // 5. Xác định user_id (từ JWT nếu đăng nhập, hoặc tài khoản khách theo SĐT)
    let userId;
    if (authUser && Number.isSafeInteger(Number(authUser.userId))) {
      userId = Number(authUser.userId);
    } else {
      const guestEmail = `${cleanPhone}@guest.sportsbooking.vn`;
      const existingGuest = await client.query(
        'SELECT user_id FROM users WHERE phone = $1 OR LOWER(email) = $2 LIMIT 1',
        [cleanPhone, guestEmail.toLowerCase()]
      );
      if (existingGuest.rowCount > 0) {
        userId = Number(existingGuest.rows[0].user_id);
      } else {
        const randomHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        const newGuest = await client.query(
          `INSERT INTO users (full_name, email, password_hash, phone, role, status)
           VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE') RETURNING user_id`,
          [cleanName, guestEmail.toLowerCase(), randomHash, cleanPhone]
        );
        userId = Number(newGuest.rows[0].user_id);
      }
    }

    const paymentStatus = cleanPayment.toLowerCase().includes('tại quầy') ? 'PENDING' : 'PAID_ONLINE';

    // 6. Chèn đơn đặt vào bookings
    const bookingRes = await client.query(
      `INSERT INTO bookings (
         user_id, court_id, sub_court_id, booking_date, status, total_amount,
         customer_name, customer_phone, payment_method, payment_status, note
       )
       VALUES ($1, $2, $3, $4::date, 'CONFIRMED', $5, $6, $7, $8, $9, $10)
       RETURNING booking_id, created_at`,
      [
        userId,
        parsedCourtId,
        resolvedSubCourtId,
        date,
        authoritativePrice,
        cleanName,
        cleanPhone,
        cleanPayment,
        paymentStatus,
        cleanNote
      ]
    );
    const savedBooking = bookingRes.rows[0];

    // 7. Chèn booking_details (unique index chống đặt trùng slot đang active)
    await client.query(
      `INSERT INTO booking_details (booking_id, court_id, sub_court_id, slot_id, booking_date, price, active_flag)
       VALUES ($1, $2, $3, $4, $5::date, $6, 1)`,
      [savedBooking.booking_id, parsedCourtId, resolvedSubCourtId, resolvedSlotId, date, authoritativePrice]
    );

    // 8. Ghi lịch sử trạng thái
    await client.query(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason)
       VALUES ($1, NULL, 'CONFIRMED', $2, $3)`,
      [savedBooking.booking_id, userId, 'Khách hàng đặt sân trực tuyến']
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      source: 'PostgreSQL Database',
      message: 'Đặt sân thành công! Lịch chơi của bạn đã được giữ chỗ.',
      data: {
        id: `BK-${savedBooking.booking_id}`,
        bookingId: Number(savedBooking.booking_id),
        courtId: parsedCourtId,
        courtName: courtRow.name,
        address: courtRow.address,
        subCourtId: resolvedSubCourtId,
        subCourtName: resolvedSubCourtName,
        customerName: cleanName,
        phone: cleanPhone,
        date,
        timeSlot: resolvedSlotLabel,
        totalPrice: authoritativePrice,
        paymentMethod: cleanPayment,
        paymentStatus,
        status: 'CONFIRMED',
        statusLabel: 'Đã xác nhận',
        note: cleanNote || '',
        createdAt: savedBooking.created_at
      }
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Khung giờ này vừa có người khác đặt! Vui lòng chọn khung giờ khác.'
      });
    }
    console.error('❌ Lỗi tạo booking PostgreSQL:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo đơn đặt sân lúc này.' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id/cancel - Người chơi tự hủy lịch đặt của mình
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  const bookingId = parseBookingNumericId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ success: false, message: 'Mã đơn đặt sân không hợp lệ.' });
  }

  const userId = Number(req.user.userId);
  const isAdmin = req.user.role === 'ADMIN';
  const cancelReason =
    typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim().slice(0, 500)
      : 'Khách hàng chủ động hủy lịch';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      'SELECT booking_id, user_id, status FROM bookings WHERE booking_id = $1 FOR UPDATE',
      [bookingId]
    );
    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt sân.' });
    }

    const row = existingRes.rows[0];
    if (!isAdmin && Number(row.user_id) !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bạn không có quyền hủy đơn đặt sân của người khác.' });
    }
    if (row.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Đơn đặt sân này đã được hủy trước đó.' });
    }
    if (row.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Không thể hủy đơn đặt sân đã hoàn thành.' });
    }

    await client.query(
      `UPDATE bookings
       SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = $1, updated_at = NOW()
       WHERE booking_id = $2`,
      [cancelReason, bookingId]
    );

    await client.query(
      'UPDATE booking_details SET active_flag = NULL WHERE booking_id = $1',
      [bookingId]
    );

    await client.query(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason)
       VALUES ($1, $2, 'CANCELLED', $3, $4)`,
      [bookingId, row.status, userId, cancelReason]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: `Đã hủy đơn đặt BK-${bookingId} và mở lại khung giờ trống.`,
      data: { id: `BK-${bookingId}`, bookingId, status: 'CANCELLED', statusLabel: 'Đã hủy', cancelReason }
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Lỗi hủy booking:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể hủy đơn đặt sân lúc này.' });
  } finally {
    client.release();
  }
});

// POST /api/bookings/partner - Partner application
router.post('/partner', async (req, res) => {
  const { facilityName, ownerName, phone, address, courtCount } = req.body;
  if (!facilityName || !ownerName || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đủ tên cụm sân, người đại diện và số điện thoại!'
    });
  }

  const partnerId = `PTR-${Date.now()}`;
  fallbackPartners.push({
    id: partnerId,
    facilityName,
    ownerName,
    phone,
    address,
    courtCount: courtCount || 1,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({
    success: true,
    message: 'Gửi yêu cầu hợp tác thành công! Đội ngũ SportsBooking sẽ liên hệ hỗ trợ bạn sớm nhất.',
    data: { id: partnerId, facilityName, ownerName, phone }
  });
});

module.exports = router;
