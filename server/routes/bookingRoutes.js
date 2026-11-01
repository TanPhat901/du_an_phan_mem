const express = require('express');
const router = express.Router();
const { pool, isDbConnected } = require('../config/db');

// In-memory store for fallback
let fallbackBookings = [
  {
    id: 'BK-101',
    courtName: 'The Yard Padel Club Thảo Điền',
    customerName: 'Nguyễn Văn Minh',
    phone: '0901234567',
    date: '2026-11-05',
    timeSlot: '18:00 - 19:00',
    totalPrice: 280000,
    status: 'Đã xác nhận',
    createdAt: new Date().toISOString()
  }
];

let fallbackPartners = [];

// GET /api/bookings
router.get('/', async (req, res) => {
  if (isDbConnected()) {
    try {
      const result = await pool.query(`
        SELECT 
          b.booking_id AS id,
          c.name AS court_name,
          u.full_name AS customer_name,
          u.phone,
          b.booking_date,
          b.total_amount AS total_price,
          b.status,
          b.created_at
        FROM bookings b
        LEFT JOIN courts c ON b.court_id = c.court_id
        LEFT JOIN users u ON b.user_id = u.user_id
        ORDER BY b.created_at DESC
      `);

      const bookings = result.rows.map(b => ({
        id: `BK-${b.id}`,
        courtName: b.court_name || 'Sân thể thao',
        customerName: b.customer_name || 'Khách đặt sân',
        phone: b.phone || '0901234567',
        date: b.booking_date ? new Date(b.booking_date).toISOString().split('T')[0] : '',
        timeSlot: '20:00 - 21:00',
        totalPrice: parseFloat(b.total_price),
        status: b.status === 'CONFIRMED' ? 'Đã xác nhận' : (b.status === 'CANCELLED' ? 'Đã hủy' : 'Hoàn thành'),
        createdAt: b.created_at
      }));

      return res.json({ success: true, source: 'PostgreSQL Database', data: bookings });
    } catch (err) {
      console.warn('⚠️ Lỗi truy vấn bookings PostgreSQL:', err.message);
    }
  }

  res.json({
    success: true,
    source: 'Memory Fallback',
    data: fallbackBookings
  });
});

// POST /api/bookings - Create booking
router.post('/', async (req, res) => {
  const { courtId, courtName, customerName, phone, date, timeSlot, totalPrice } = req.body;

  if (!customerName || !phone || !date || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin: Tên, SĐT, Ngày và Khung giờ chơi.'
    });
  }

  const price = totalPrice || 280000;
  const name = courtName || 'The Yard Sport Arena';

  if (isDbConnected()) {
    try {
      // 1. Ensure user exists or create guest user
      let userId = 5; // Default demo user
      const userRes = await pool.query('SELECT user_id FROM users WHERE phone = $1 OR email = $2', [phone, `${phone}@guest.sportsbooking.vn`]);
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].user_id;
      } else {
        const newUser = await pool.query(
          `INSERT INTO users (full_name, email, password_hash, phone, role, status)
           VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE') RETURNING user_id`,
          [customerName, `${phone}@guest.sportsbooking.vn`, 'guest123', phone]
        );
        userId = newUser.rows[0].user_id;
      }

      // 2. Insert into bookings
      const bookingRes = await pool.query(
        `INSERT INTO bookings (user_id, court_id, booking_date, status, total_amount)
         VALUES ($1, $2, $3, 'CONFIRMED', $4) RETURNING *`,
        [userId, courtId || 1, date, price]
      );

      const savedBooking = bookingRes.rows[0];

      // 3. Insert into booking_details
      const slotRes = await pool.query('SELECT slot_id FROM time_slots WHERE court_id = $1 LIMIT 1', [courtId || 1]);
      const slotId = slotRes.rows.length > 0 ? slotRes.rows[0].slot_id : 1;

      await pool.query(
        `INSERT INTO booking_details (booking_id, court_id, slot_id, booking_date, price)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [savedBooking.booking_id, courtId || 1, slotId, date, price]
      );

      return res.status(201).json({
        success: true,
        source: 'PostgreSQL Database',
        message: 'Đặt sân thành công! Nhân viên sẽ liên hệ xác nhận trong ít phút.',
        data: {
          id: `BK-${savedBooking.booking_id}`,
          courtName: name,
          customerName,
          phone,
          date,
          timeSlot,
          totalPrice: price,
          status: 'Đã xác nhận'
        }
      });
    } catch (err) {
      console.warn('⚠️ Lỗi chèn booking vào PostgreSQL:', err.message);
    }
  }

  // Fallback
  const newBooking = {
    id: `BK-${Date.now().toString().slice(-4)}`,
    courtId,
    courtName: name,
    customerName,
    phone,
    date,
    timeSlot,
    totalPrice: price,
    status: 'Đã xác nhận',
    createdAt: new Date().toISOString()
  };

  fallbackBookings.unshift(newBooking);

  res.status(201).json({
    success: true,
    source: 'Memory Fallback',
    message: 'Đặt sân thành công! Nhân viên sẽ liên hệ xác nhận trong ít phút.',
    data: newBooking
  });
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
