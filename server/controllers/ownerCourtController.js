const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const isPeakHour = (startTimeStr) => {
  const hour = parseInt(String(startTimeStr || '0').split(':')[0], 10);
  return hour >= 17 && hour < 21;
};

const resolvePeakFlag = (isPeakValue, startTimeStr) => {
  if (typeof isPeakValue === 'boolean') return isPeakValue;
  return isPeakHour(startTimeStr);
};

const parseTimeToMinutes = (rawTime) => {
  if (typeof rawTime !== 'string') return null;
  const match = rawTime.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return null;
  }
  const hhmm = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  return {
    minutes: hours * 60 + mins,
    hhmm,
    pgTime: `${hhmm}:00`
  };
};

const minutesToTimeObj = (totalMins) => {
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const hhmm = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  return {
    minutes: totalMins,
    hhmm,
    pgTime: `${hhmm}:00`
  };
};

const getSlotDurationMinutes = (startTimeStr, endTimeStr) => {
  const st = parseTimeToMinutes(startTimeStr);
  const et = parseTimeToMinutes(endTimeStr);
  if (!st || !et || et.minutes <= st.minutes) return 60;
  return et.minutes - st.minutes;
};

const parseBookingNumericId = (rawId) => {
  const cleaned = String(rawId || '').replace(/^BK-/i, '').trim();
  const id = Number(cleaned);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getTodayLocalYMD = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// GET /api/owner/courts
const getMyCourts = async (req, res) => {
  try {
    const userId = Number(req.user.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Thông tin tài khoản không hợp lệ.'
      });
    }

    // Kiểm tra quyền hiện tại trong PostgreSQL.
    const ownerResult = await pool.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1
         AND role = 'OWNER'
         AND status = 'ACTIVE'`,
      [userId]
    );

    if (ownerResult.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không có quyền quản lý sân.'
      });
    }

    // Chỉ lấy sân con thuộc các cụm sân của chủ sân hiện tại.
    const result = await pool.query(
      `SELECT
         sc.sub_court_id,
         sc.court_id,
         sc.name,
         sc.sport_type_id,
         st.name AS sport_name,
         sc.description,
         sc.surface_type,
         sc.amenities,
         sc.image_url,
         sc.normal_price,
         sc.peak_price,
         sc.status,
         sc.is_visible
       FROM sub_courts sc
       JOIN courts c ON c.court_id = sc.court_id
       JOIN sport_types st
         ON st.sport_type_id = sc.sport_type_id
       WHERE c.owner_id = $1
       ORDER BY sc.court_id, sc.sub_court_id`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách sân thành công.',
      total: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách sân:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Không thể lấy danh sách sân.'
    });
  }
};


const createSubCourt = async (req, res) => {
  try {
    const userId = Number(req.user.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không hợp lệ.'
      });
    }

    const {
      court_id,
      name,
      sport_type_id,
      description,
      surface_type,
      amenities = [],
      image_url,
      normal_price,
      peak_price
    } = req.body || {};

    const courtId = Number(court_id);
    const sportTypeId = Number(sport_type_id);
    const normalPrice = Number(normal_price);
    const peakPrice = Number(peak_price);

    if (
      !Number.isSafeInteger(courtId) || courtId <= 0 ||
      !Number.isSafeInteger(sportTypeId) || sportTypeId <= 0 ||
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 150 ||
      normal_price === undefined || normal_price === null ||
      normal_price === '' ||
      peak_price === undefined || peak_price === null ||
      peak_price === '' ||
      !Number.isFinite(normalPrice) || normalPrice < 0 ||
      !Number.isFinite(peakPrice) || peakPrice < normalPrice ||
      !Array.isArray(amenities) ||
      !amenities.every(x => typeof x === 'string') ||
      [description, surface_type, image_url].some(
        x => x != null && typeof x !== 'string'
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu sân không hợp lệ. Kiểm tra tên, môn thể thao và giá sân.'
      });
    }

    // Kiểm tra tài khoản OWNER còn hoạt động
    // và thực sự sở hữu cụm sân được yêu cầu.
    const ownerCheck = await pool.query(
      `SELECT c.court_id
       FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1
         AND u.user_id = $2
         AND u.role = 'OWNER'
         AND u.status = 'ACTIVE'`,
      [courtId, userId]
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thêm sân vào cụm sân này.'
      });
    }

    const sportCheck = await pool.query(
      'SELECT sport_type_id FROM sport_types WHERE sport_type_id = $1',
      [sportTypeId]
    );

    if (sportCheck.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Môn thể thao không tồn tại.'
      });
    }

    const result = await pool.query(
      `INSERT INTO sub_courts (
        court_id, name, sport_type_id,
        description, surface_type, amenities, image_url,
        normal_price, peak_price
      )
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9)
      RETURNING *`,
      [
        courtId,
        name.trim(),
        sportTypeId,
        description || null,
        surface_type || null,
        amenities,
        image_url || null,
        normalPrice,
        peakPrice
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Thêm sân con thành công.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Lỗi thêm sân:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Không thể thêm sân con.'
    });
  }
};

// PUT /api/owner/courts/:subCourtId
// Chỉ cập nhật sân con thuộc cụm sân của chủ sân đang đăng nhập.
const updateSubCourt = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const subCourtId = Number(req.params.subCourtId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(subCourtId) || subCourtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã sân con không hợp lệ.' });
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu cập nhật không hợp lệ.' });
    }

    const allowed = [
      'name', 'sport_type_id', 'description', 'surface_type', 'amenities',
      'image_url', 'normal_price', 'peak_price', 'status', 'is_visible'
    ];
    const keys = Object.keys(body);
    if (!keys.length || keys.some(key => !allowed.includes(key))) {
      return res.status(400).json({ success: false, message: 'Trường cập nhật không được hỗ trợ.' });
    }

    const owner = await pool.query(
      `SELECT u.user_id FROM users u
       WHERE u.user_id = $1 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [userId]
    );
    if (!owner.rowCount) {
      return res.status(403).json({ success: false, message: 'Tài khoản không có quyền quản lý sân.' });
    }

    const existing = await pool.query(
      `SELECT sc.normal_price, sc.peak_price
       FROM sub_courts sc JOIN courts c ON c.court_id = sc.court_id
       WHERE sc.sub_court_id = $1 AND c.owner_id = $2`,
      [subCourtId, userId]
    );
    if (!existing.rowCount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân con thuộc quyền quản lý.' });
    }

    const values = [];
    for (const key of keys) {
      let value = body[key];
      if (key === 'name') {
        if (typeof value !== 'string' || !value.trim() || value.trim().length > 150) {
          return res.status(400).json({ success: false, message: 'Tên sân không hợp lệ.' });
        }
        value = value.trim();
      } else if (key === 'sport_type_id') {
        value = Number(value);
        if (body[key] === null || body[key] === '' || !Number.isSafeInteger(value) || value <= 0) {
          return res.status(400).json({ success: false, message: 'Môn thể thao không hợp lệ.' });
        }
        const sport = await pool.query('SELECT 1 FROM sport_types WHERE sport_type_id = $1', [value]);
        if (!sport.rowCount) {
          return res.status(400).json({ success: false, message: 'Môn thể thao không tồn tại.' });
        }
      } else if (key === 'normal_price' || key === 'peak_price') {
        value = Number(value);
        if (body[key] === null || body[key] === '' || !Number.isFinite(value) || value < 0) {
          return res.status(400).json({ success: false, message: 'Giá sân không hợp lệ.' });
        }
      } else if (key === 'amenities') {
        if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
          return res.status(400).json({ success: false, message: 'Danh sách tiện ích không hợp lệ.' });
        }
      } else if (key === 'description' || key === 'surface_type' || key === 'image_url') {
        if (value !== null && typeof value !== 'string') {
          return res.status(400).json({ success: false, message: 'Thông tin mô tả không hợp lệ.' });
        }
      } else if (key === 'status') {
        if (!['ACTIVE', 'MAINTENANCE', 'CLOSED'].includes(value)) {
          return res.status(400).json({ success: false, message: 'Trạng thái sân không hợp lệ.' });
        }
      } else if (key === 'is_visible') {
        if (typeof value !== 'boolean') {
          return res.status(400).json({ success: false, message: 'Giá trị hiển thị phải là true hoặc false.' });
        }
      }
      values.push(value);
    }

    const normalPrice = keys.includes('normal_price')
      ? values[keys.indexOf('normal_price')] : Number(existing.rows[0].normal_price);
    const peakPrice = keys.includes('peak_price')
      ? values[keys.indexOf('peak_price')] : Number(existing.rows[0].peak_price);
    if (peakPrice < normalPrice) {
      return res.status(400).json({ success: false, message: 'Giá cao điểm phải lớn hơn hoặc bằng giá thường.' });
    }

    // Tên cột chỉ lấy từ danh sách cho phép; giá trị luôn được truyền qua tham số.
    const assignments = keys.map((key, index) =>
      `${key} = $${index + 1}${key === 'amenities' ? '::text[]' : ''}`
    );
    const result = await pool.query(
      `UPDATE sub_courts sc
       SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE sc.sub_court_id = $${values.length + 1}
         AND EXISTS (
           SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
           WHERE c.court_id = sc.court_id AND u.user_id = $${values.length + 2}
             AND u.role = 'OWNER' AND u.status = 'ACTIVE'
         )
       RETURNING sc.*`,
      [...values, subCourtId, userId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân con thuộc quyền quản lý.' });
    }
    return res.status(200).json({ success: true, message: 'Cập nhật sân con thành công.', data: result.rows[0] });
  } catch (error) {
    console.error('Lỗi cập nhật sân con:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật sân con.' });
  }
};

// GET /api/owner/sport-types
const getSportTypes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sport_type_id, name, description
       FROM sport_types
       WHERE status = 'ACTIVE'
       ORDER BY sport_type_id ASC`
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách bộ môn:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách bộ môn.' });
  }
};

// GET /api/owner/facilities
const getMyFacilities = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Thông tin tài khoản không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1 AND role = 'OWNER' AND status = 'ACTIVE'`,
      [userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Tài khoản không có quyền chủ sân.' });
    }

    const result = await pool.query(
      `SELECT
         c.court_id,
         c.name,
         c.sport_type_id,
         st.name AS sport_type_name,
         c.address,
         c.area,
         c.description,
         c.image_url,
         (
           SELECT NULLIF(TRIM(sc_img.image_url), '')
           FROM sub_courts sc_img
           WHERE sc_img.court_id = c.court_id
             AND sc_img.is_visible = TRUE
             AND NULLIF(TRIM(sc_img.image_url), '') IS NOT NULL
           ORDER BY sc_img.sub_court_id ASC
           LIMIT 1
         ) AS sub_cover_image,
         c.price_per_slot,
         c.operational_status,
         c.is_visible,
         c.created_at,
         u.full_name AS owner_name,
         u.phone AS owner_phone,
         u.email AS owner_email,
         op.business_name,
         op.tax_code,
         op.bank_name,
         op.bank_account_no,
         op.bank_account_name,
         COALESCE(ts_stats.active_slot_count, 0) AS active_slot_count,
         ts_stats.open_time_range
       FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       LEFT JOIN owner_profiles op ON op.owner_id = u.user_id
       LEFT JOIN sport_types st ON st.sport_type_id = c.sport_type_id
       LEFT JOIN (
         SELECT
           court_id,
           COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_slot_count,
           CASE
             WHEN MIN(start_time) FILTER (WHERE is_active = TRUE) IS NOT NULL
              AND MAX(end_time) FILTER (WHERE is_active = TRUE) IS NOT NULL
             THEN TO_CHAR(MIN(start_time) FILTER (WHERE is_active = TRUE), 'HH24:MI')
                  || ' - ' ||
                  TO_CHAR(MAX(end_time) FILTER (WHERE is_active = TRUE), 'HH24:MI')
             ELSE NULL
           END AS open_time_range
         FROM time_slots
         GROUP BY court_id
       ) ts_stats ON ts_stats.court_id = c.court_id
       WHERE c.owner_id = $1
       ORDER BY c.court_id ASC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách cụm sân:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể lấy danh sách cụm sân.' });
  }
};

// POST /api/owner/facilities
const createFacility = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.user?.userId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Thông tin tài khoản không hợp lệ.' });
    }

    const {
      name,
      sport_type_id,
      address,
      area,
      description,
      image_url,
      price_per_slot,
      open_time,
      close_time,
      slot_duration
    } = req.body || {};
    const sportTypeId = Number(sport_type_id);
    const price = price_per_slot !== undefined && price_per_slot !== null && price_per_slot !== ''
      ? Number(price_per_slot)
      : 0;
    const openObj = parseTimeToMinutes(typeof open_time === 'string' && open_time ? open_time : '06:00');
    const closeObj = parseTimeToMinutes(typeof close_time === 'string' && close_time ? close_time : '22:00');
    const durationMins = slot_duration !== undefined && slot_duration !== '' ? Number(slot_duration) : 60;

    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 150 ||
      typeof address !== 'string' || !address.trim() || address.trim().length > 255 ||
      !Number.isSafeInteger(sportTypeId) || sportTypeId <= 0 ||
      !Number.isFinite(price) || price < 0 ||
      (image_url != null && typeof image_url !== 'string')
    ) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Tên cụm sân, Địa chỉ và Giá mặc định hợp lệ.' });
    }

    if (
      !openObj || !closeObj ||
      !Number.isInteger(durationMins) || durationMins < 15 || durationMins > 240 ||
      closeObj.minutes - openObj.minutes < durationMins
    ) {
      return res.status(400).json({ success: false, message: 'Giờ mở cửa, đóng cửa hoặc thời lượng ca không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1 AND role = 'OWNER' AND status = 'ACTIVE'`,
      [userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Tài khoản không có quyền tạo cụm sân.' });
    }

    const sportCheck = await pool.query('SELECT sport_type_id FROM sport_types WHERE sport_type_id = $1', [sportTypeId]);
    if (sportCheck.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Bộ môn thể thao không tồn tại.' });
    }

    await client.query('BEGIN');
    const courtRes = await client.query(
      `INSERT INTO courts (sport_type_id, owner_id, name, address, area, description, image_url, price_per_slot, operational_status, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', TRUE)
       RETURNING *`,
      [
        sportTypeId,
        userId,
        name.trim(),
        address.trim(),
        typeof area === 'string' && area.trim() ? area.trim() : null,
        typeof description === 'string' && description.trim() ? description.trim() : null,
        typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null,
        price
      ]
    );
    const newCourt = courtRes.rows[0];

    for (let cursor = openObj.minutes; cursor + durationMins <= closeObj.minutes; cursor += durationMins) {
      const stObj = minutesToTimeObj(cursor);
      const etObj = minutesToTimeObj(cursor + durationMins);
      const isPeak = cursor >= 17 * 60 && cursor < 21 * 60;
      await client.query(
        `INSERT INTO time_slots (court_id, start_time, end_time, is_peak, is_active)
         VALUES ($1, $2::time, $3::time, $4, TRUE) ON CONFLICT DO NOTHING`,
        [newCourt.court_id, stObj.pgTime, etObj.pgTime, isPeak]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: 'Tạo cụm sân mới thành công!',
      data: newCourt
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi tạo cụm sân:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo cụm sân mới.' });
  } finally {
    client.release();
  }
};

// PUT /api/owner/facilities/:courtId
const updateFacilitySettings = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.user?.userId);
    const courtId = Number(req.params.courtId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }

    const {
      name,
      sport_type_id,
      address,
      area,
      description,
      image_url,
      price_per_slot,
      operational_status,
      owner_name,
      owner_phone,
      business_name,
      tax_code,
      bank_name,
      bank_account_no,
      bank_account_name
    } = req.body || {};

    const ownerCheck = await client.query(
      `SELECT c.court_id FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [courtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa cụm sân này.' });
    }

    if (sport_type_id !== undefined) {
      const sportIdNum = Number(sport_type_id);
      if (!Number.isSafeInteger(sportIdNum) || sportIdNum <= 0) {
        return res.status(400).json({ success: false, message: 'Bộ môn thể thao không hợp lệ.' });
      }
      const spRes = await client.query('SELECT 1 FROM sport_types WHERE sport_type_id = $1', [sportIdNum]);
      if (spRes.rowCount === 0) {
        return res.status(400).json({ success: false, message: 'Bộ môn thể thao không tồn tại.' });
      }
    }

    await client.query('BEGIN');

    if (
      name !== undefined ||
      sport_type_id !== undefined ||
      address !== undefined ||
      area !== undefined ||
      description !== undefined ||
      image_url !== undefined ||
      price_per_slot !== undefined ||
      operational_status !== undefined
    ) {
      const updates = [];
      const vals = [];
      let idx = 1;
      if (typeof name === 'string' && name.trim()) { updates.push(`name = $${idx++}`); vals.push(name.trim()); }
      if (sport_type_id !== undefined) { updates.push(`sport_type_id = $${idx++}`); vals.push(Number(sport_type_id)); }
      if (typeof address === 'string' && address.trim()) { updates.push(`address = $${idx++}`); vals.push(address.trim()); }
      if (typeof area === 'string') { updates.push(`area = $${idx++}`); vals.push(area.trim() || null); }
      if (typeof description === 'string') { updates.push(`description = $${idx++}`); vals.push(description.trim() || null); }
      if (image_url !== undefined) { updates.push(`image_url = $${idx++}`); vals.push(typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null); }
      if (price_per_slot !== undefined && Number.isFinite(Number(price_per_slot)) && Number(price_per_slot) >= 0) {
        updates.push(`price_per_slot = $${idx++}`); vals.push(Number(price_per_slot));
      }
      if (['ACTIVE', 'INACTIVE'].includes(operational_status)) {
        updates.push(`operational_status = $${idx++}`); vals.push(operational_status);
      }
      if (updates.length > 0) {
        vals.push(courtId);
        await client.query(
          `UPDATE courts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE court_id = $${idx}`,
          vals
        );
      }
    }

    if ((typeof owner_name === 'string' && owner_name.trim()) || typeof owner_phone === 'string') {
      const userUpdates = [];
      const userVals = [];
      let uIdx = 1;
      if (typeof owner_name === 'string' && owner_name.trim()) {
        userUpdates.push(`full_name = $${uIdx++}`);
        userVals.push(owner_name.trim());
      }
      if (typeof owner_phone === 'string') {
        userUpdates.push(`phone = $${uIdx++}`);
        userVals.push(owner_phone.trim() || null);
      }
      if (userUpdates.length > 0) {
        userVals.push(userId);
        await client.query(
          `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${uIdx}`,
          userVals
        );
      }
    }

    if (
      business_name !== undefined ||
      tax_code !== undefined ||
      bank_name !== undefined ||
      bank_account_no !== undefined ||
      bank_account_name !== undefined
    ) {
      await client.query(
        `INSERT INTO owner_profiles (owner_id, business_name, tax_code, bank_name, bank_account_no, bank_account_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (owner_id) DO UPDATE SET
           business_name = COALESCE($2, owner_profiles.business_name),
           tax_code = COALESCE($3, owner_profiles.tax_code),
           bank_name = COALESCE($4, owner_profiles.bank_name),
           bank_account_no = COALESCE($5, owner_profiles.bank_account_no),
           bank_account_name = COALESCE($6, owner_profiles.bank_account_name)`,
        [
          userId,
          typeof business_name === 'string' ? business_name.trim() : null,
          typeof tax_code === 'string' ? tax_code.trim() : null,
          typeof bank_name === 'string' ? bank_name.trim() : null,
          typeof bank_account_no === 'string' ? bank_account_no.trim() : null,
          typeof bank_account_name === 'string' ? bank_account_name.trim().toUpperCase() : null
        ]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Cập nhật cấu hình cụm sân thành công!' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi cập nhật cấu hình cơ sở:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật cấu hình cơ sở.' });
  } finally {
    client.release();
  }
};

// DELETE /api/owner/courts/:subCourtId
const deleteSubCourt = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const subCourtId = Number(req.params.subCourtId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(subCourtId) || subCourtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã sân con không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT sc.sub_court_id
       FROM sub_courts sc
       JOIN courts c ON c.court_id = sc.court_id
       JOIN users u ON u.user_id = c.owner_id
       WHERE sc.sub_court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [subCourtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân con thuộc quyền quản lý.' });
    }

    try {
      await pool.query('DELETE FROM sub_courts WHERE sub_court_id = $1', [subCourtId]);
      return res.status(200).json({ success: true, message: 'Đã xóa sân con thành công!' });
    } catch (delErr) {
      if (delErr.code === '23503') {
        await pool.query(
          `UPDATE sub_courts SET status = 'CLOSED', is_visible = FALSE, updated_at = CURRENT_TIMESTAMP WHERE sub_court_id = $1`,
          [subCourtId]
        );
        return res.status(200).json({
          success: true,
          message: 'Sân đã có lịch sử đặt trước đó nên đã được chuyển sang trạng thái Đóng & Ẩn.'
        });
      }
      throw delErr;
    }
  } catch (error) {
    console.error('Lỗi xóa sân con:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể xóa sân con.' });
  }
};

// GET /api/owner/bookings?courtId=...&date=...&status=...
const getOwnerBookings = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT user_id FROM users WHERE user_id = $1 AND role = 'OWNER' AND status = 'ACTIVE'`,
      [userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Tài khoản không có quyền chủ sân.' });
    }

    const conditions = ['c.owner_id = $1'];
    const values = [userId];
    let idx = 2;

    if (req.query.courtId) {
      const courtId = Number(req.query.courtId);
      if (!Number.isSafeInteger(courtId) || courtId <= 0) {
        return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
      }
      conditions.push(`b.court_id = $${idx++}`);
      values.push(courtId);
    }

    if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      conditions.push(`b.booking_date = $${idx++}::date`);
      values.push(req.query.date);
    }

    if (req.query.status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(req.query.status)) {
      conditions.push(`b.status = $${idx++}`);
      values.push(req.query.status);
    }

    const result = await pool.query(
      `SELECT
         b.booking_id,
         b.court_id,
         c.name AS facility_name,
         COALESCE(bd.sub_court_id, b.sub_court_id) AS sub_court_id,
         sc.name AS sub_court_name,
         bd.slot_id,
         TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date_str,
         COALESCE(
           TO_CHAR(ts.start_time, 'HH24:MI') || ' - ' || TO_CHAR(ts.end_time, 'HH24:MI'),
           '—'
         ) AS time_slot,
         COALESCE(b.customer_name, u.full_name, 'Khách đặt sân') AS customer_name,
         COALESCE(b.customer_phone, u.phone, '') AS customer_phone,
         b.total_amount,
         COALESCE(b.payment_method, 'Tại quầy') AS payment_method,
         COALESCE(b.payment_status, 'PENDING') AS payment_status,
         b.status,
         b.cancel_reason,
         b.note,
         b.created_at
       FROM bookings b
       JOIN courts c ON c.court_id = b.court_id
       LEFT JOIN users u ON u.user_id = b.user_id
       LEFT JOIN booking_details bd ON bd.booking_id = b.booking_id
       LEFT JOIN time_slots ts ON ts.slot_id = bd.slot_id
       LEFT JOIN sub_courts sc ON sc.sub_court_id = COALESCE(bd.sub_court_id, b.sub_court_id)
       WHERE ${conditions.join(' AND ')}
       ORDER BY
         CASE WHEN b.status = 'PENDING' THEN 0 WHEN b.status = 'CONFIRMED' THEN 1 ELSE 2 END,
         b.booking_date DESC,
         ts.start_time ASC NULLS LAST,
         b.created_at DESC`,
      values
    );

    const data = result.rows.map((row) => ({
      id: `BK-${row.booking_id}`,
      bookingId: Number(row.booking_id),
      facilityId: Number(row.court_id),
      facilityName: row.facility_name,
      subCourtId: row.sub_court_id ? Number(row.sub_court_id) : null,
      subCourtName: row.sub_court_name || 'Sân tiêu chuẩn',
      slotId: row.slot_id ? Number(row.slot_id) : null,
      date: row.booking_date_str,
      timeSlot: row.time_slot,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      totalPrice: Number(row.total_amount || 0),
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      status: row.status,
      cancelReason: row.cancel_reason || '',
      note: row.note || '',
      createdAt: row.created_at
    }));

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn đặt của chủ sân:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách đơn đặt sân.' });
  }
};

// GET /api/owner/schedule?courtId=...&date=YYYY-MM-DD
const getOwnerSchedule = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const courtId = Number(req.query.courtId);
    const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : getTodayLocalYMD();

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT c.court_id FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [courtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem lịch cụm sân này.' });
    }

    const [slotsRes, bookingsRes, blocksRes] = await Promise.all([
      pool.query(
        `SELECT
           slot_id,
           TO_CHAR(start_time, 'HH24:MI') AS start_label,
           TO_CHAR(end_time, 'HH24:MI') AS end_label,
           TO_CHAR(start_time, 'HH24:MI:SS') AS start_full,
           TO_CHAR(end_time, 'HH24:MI:SS') AS end_full,
           is_peak
         FROM time_slots
         WHERE court_id = $1 AND is_active = TRUE
         ORDER BY start_time ASC`,
        [courtId]
      ),
      pool.query(
        `SELECT
           b.booking_id,
           COALESCE(bd.sub_court_id, b.sub_court_id) AS sub_court_id,
           sc.name AS sub_court_name,
           bd.slot_id,
           TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date_str,
           TO_CHAR(ts.start_time, 'HH24:MI') || ' - ' || TO_CHAR(ts.end_time, 'HH24:MI') AS time_slot,
           COALESCE(b.customer_name, u.full_name, 'Khách đặt sân') AS customer_name,
           COALESCE(b.customer_phone, u.phone, '') AS customer_phone,
           b.total_amount,
           COALESCE(b.payment_method, 'Tại quầy') AS payment_method,
           COALESCE(b.payment_status, 'PENDING') AS payment_status,
           b.status,
           b.note
         FROM bookings b
         LEFT JOIN users u ON u.user_id = b.user_id
         JOIN booking_details bd ON bd.booking_id = b.booking_id
         JOIN time_slots ts ON ts.slot_id = bd.slot_id
         LEFT JOIN sub_courts sc ON sc.sub_court_id = COALESCE(bd.sub_court_id, b.sub_court_id)
         WHERE b.court_id = $1
           AND b.booking_date = $2::date
           AND b.status <> 'CANCELLED'
           AND bd.active_flag = 1`,
        [courtId, date]
      ),
      pool.query(
        `SELECT
           block_id,
           court_id,
           sub_court_id,
           TO_CHAR(start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at_str,
           TO_CHAR(end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at_str,
           reason,
           created_at
         FROM court_blocks
         WHERE court_id = $1
           AND start_at < ($2::date + INTERVAL '1 day')
           AND end_at > $2::date
         ORDER BY start_at ASC`,
        [courtId, date]
      )
    ]);

    return res.status(200).json({
      success: true,
      data: {
        courtId,
        date,
        timeSlots: slotsRes.rows.map((s) => ({
          slotId: Number(s.slot_id),
          label: `${s.start_label} - ${s.end_label}`,
          startTime: s.start_label,
          endTime: s.end_label,
          startFull: s.start_full,
          endFull: s.end_full,
          isPeak: resolvePeakFlag(s.is_peak, s.start_full),
          durationMinutes: getSlotDurationMinutes(s.start_full, s.end_full)
        })),
        bookings: bookingsRes.rows.map((b) => ({
          id: `BK-${b.booking_id}`,
          bookingId: Number(b.booking_id),
          facilityId: courtId,
          subCourtId: b.sub_court_id ? Number(b.sub_court_id) : null,
          subCourtName: b.sub_court_name || 'Sân tiêu chuẩn',
          slotId: Number(b.slot_id),
          date: b.booking_date_str,
          timeSlot: b.time_slot,
          customerName: b.customer_name,
          customerPhone: b.customer_phone,
          totalPrice: Number(b.total_amount || 0),
          paymentMethod: b.payment_method,
          paymentStatus: b.payment_status,
          status: b.status,
          note: b.note || ''
        })),
        blocks: blocksRes.rows.map((bl) => ({
          blockId: Number(bl.block_id),
          courtId: Number(bl.court_id),
          subCourtId: bl.sub_court_id ? Number(bl.sub_court_id) : null,
          startAt: bl.start_at_str,
          endAt: bl.end_at_str,
          reason: bl.reason,
          createdAt: bl.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Lỗi tải ma trận lịch đặt:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải ma trận lịch đặt.' });
  }
};

// POST /api/owner/bookings/walk-in
const createWalkInBooking = async (req, res) => {
  const client = await pool.connect();
  try {
    const ownerUserId = Number(req.user?.userId);
    if (!Number.isSafeInteger(ownerUserId) || ownerUserId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }

    const {
      courtId,
      subCourtId,
      slotId,
      timeSlot,
      date,
      customerName,
      customerPhone,
      totalPrice,
      paymentMethod,
      status,
      note
    } = req.body || {};

    const parsedCourtId = Number(courtId);
    const parsedSubCourtId = subCourtId ? Number(subCourtId) : null;
    const parsedSlotId = slotId ? Number(slotId) : null;
    const targetStatus = status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED';

    if (
      !Number.isSafeInteger(parsedCourtId) || parsedCourtId <= 0 ||
      typeof customerName !== 'string' || !customerName.trim() ||
      typeof customerPhone !== 'string' || !customerPhone.trim() ||
      typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      (!parsedSlotId && (typeof timeSlot !== 'string' || !timeSlot.trim()))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ Tên khách, SĐT, Ngày chơi và Khung giờ.'
      });
    }

    await client.query('BEGIN');

    const ownerCheck = await client.query(
      `SELECT c.court_id, c.name, c.price_per_slot
       FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [parsedCourtId, ownerUserId]
    );
    if (ownerCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bạn không có quyền nhận khách cho cụm sân này.' });
    }

    let resolvedSubCourtId = null;
    let resolvedSubCourtName = null;
    let normalPrice = Number(ownerCheck.rows[0].price_per_slot || 0);
    let peakPrice = normalPrice;

    if (parsedSubCourtId) {
      const scRes = await client.query(
        `SELECT sub_court_id, name, normal_price, peak_price, status
         FROM sub_courts
         WHERE sub_court_id = $1 AND court_id = $2`,
        [parsedSubCourtId, parsedCourtId]
      );
      if (scRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Sân con không thuộc cụm sân này.' });
      }
      if (scRes.rows[0].status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'Sân con hiện đang bảo trì hoặc đã đóng.' });
      }
      resolvedSubCourtId = Number(scRes.rows[0].sub_court_id);
      resolvedSubCourtName = scRes.rows[0].name;
      normalPrice = Number(scRes.rows[0].normal_price);
      peakPrice = Number(scRes.rows[0].peak_price);
    }

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
      return res.status(400).json({ success: false, message: 'Khung giờ không hợp lệ hoặc chưa được cấu hình.' });
    }

    const slotRow = slotRes.rows[0];
    const resolvedSlotId = Number(slotRow.slot_id);
    const slotLabel = `${slotRow.start_label} - ${slotRow.end_label}`;
    const slotStartTs = `${date} ${slotRow.start_full}`;
    const slotEndTs = `${date} ${slotRow.end_full}`;

    const blockRes = await client.query(
      `SELECT reason FROM court_blocks
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
        message: `Khung giờ này đang bị khóa (${blockRes.rows[0].reason}). Hãy mở khóa trước khi nhận khách.`
      });
    }

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanPayment = typeof paymentMethod === 'string' && paymentMethod.trim()
      ? paymentMethod.trim()
      : 'Tiền mặt tại quầy';
    const cleanNote = typeof note === 'string' && note.trim()
      ? note.trim()
      : 'Khách đặt trực tiếp tại quầy / qua điện thoại';

    const priceNum = Number(totalPrice);
    const finalPrice = Number.isFinite(priceNum) && priceNum >= 0
      ? priceNum
      : (resolvePeakFlag(slotRow.is_peak, slotRow.start_full) ? peakPrice : normalPrice);

    // Tìm hoặc tạo tài khoản khách theo SĐT
    const guestEmail = `${cleanPhone.replace(/[^a-zA-Z0-9]/g, '')}@guest.sportsbooking.vn`;
    let customerUserId;
    const existingCustomer = await client.query(
      'SELECT user_id FROM users WHERE phone = $1 OR LOWER(email) = $2 LIMIT 1',
      [cleanPhone, guestEmail.toLowerCase()]
    );
    if (existingCustomer.rowCount > 0) {
      customerUserId = Number(existingCustomer.rows[0].user_id);
    } else {
      const randomHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      const newCustomer = await client.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, status)
         VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE') RETURNING user_id`,
        [cleanName, guestEmail.toLowerCase(), randomHash, cleanPhone]
      );
      customerUserId = Number(newCustomer.rows[0].user_id);
    }

    const paymentStatus = targetStatus === 'COMPLETED' || cleanPayment.toLowerCase().includes('vietqr')
      ? 'PAID'
      : 'PENDING_AT_COUNTER';

    const bookingInsert = await client.query(
      `INSERT INTO bookings (
         user_id, court_id, sub_court_id, booking_date, status, total_amount,
         customer_name, customer_phone, payment_method, payment_status, note
       )
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11)
       RETURNING booking_id, created_at`,
      [
        customerUserId,
        parsedCourtId,
        resolvedSubCourtId,
        date,
        targetStatus,
        finalPrice,
        cleanName,
        cleanPhone,
        cleanPayment,
        paymentStatus,
        cleanNote
      ]
    );
    const newBookingId = Number(bookingInsert.rows[0].booking_id);

    await client.query(
      `INSERT INTO booking_details (booking_id, court_id, sub_court_id, slot_id, booking_date, price, active_flag)
       VALUES ($1, $2, $3, $4, $5::date, $6, 1)`,
      [newBookingId, parsedCourtId, resolvedSubCourtId, resolvedSlotId, date, finalPrice]
    );

    await client.query(
      `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason)
       VALUES ($1, NULL, $2, $3, $4)`,
      [newBookingId, targetStatus, ownerUserId, 'Chủ sân tạo đơn tại quầy (walk-in)']
    );

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: `Đã tạo lịch cho ${cleanName} (${slotLabel}) thành công!`,
      data: {
        id: `BK-${newBookingId}`,
        bookingId: newBookingId,
        facilityId: parsedCourtId,
        subCourtId: resolvedSubCourtId,
        subCourtName: resolvedSubCourtName,
        slotId: resolvedSlotId,
        date,
        timeSlot: slotLabel,
        customerName: cleanName,
        customerPhone: cleanPhone,
        totalPrice: finalPrice,
        paymentMethod: cleanPayment,
        paymentStatus,
        status: targetStatus,
        note: cleanNote,
        createdAt: bookingInsert.rows[0].created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Khung giờ và sân con này đã có khách đặt!'
      });
    }
    console.error('Lỗi tạo đơn tại quầy:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo đơn đặt tại quầy.' });
  } finally {
    client.release();
  }
};

// PATCH /api/owner/bookings/:bookingId/status
const updateOwnerBookingStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const ownerUserId = Number(req.user?.userId);
    const bookingId = parseBookingNumericId(req.params.bookingId);
    if (!Number.isSafeInteger(ownerUserId) || ownerUserId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Mã đơn đặt sân không hợp lệ.' });
    }

    const rawStatus = String(req.body?.status || '').toUpperCase().trim();
    const mappedStatus = rawStatus === 'CHECKED_IN' ? 'COMPLETED' : rawStatus;
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(mappedStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái cập nhật không hợp lệ.' });
    }

    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT b.booking_id, b.status, b.payment_method
       FROM bookings b
       JOIN courts c ON c.court_id = b.court_id
       JOIN users u ON u.user_id = c.owner_id
       WHERE b.booking_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'
       FOR UPDATE`,
      [bookingId, ownerUserId]
    );
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt thuộc cụm sân của bạn.' });
    }

    const currentStatus = checkRes.rows[0].status;
    const paymentMethodText = String(checkRes.rows[0].payment_method || '').toLowerCase();

    if (currentStatus === 'CANCELLED' && mappedStatus !== 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Đơn đã bị hủy không thể khôi phục.' });
    }
    if (currentStatus === 'COMPLETED' && mappedStatus !== 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Đơn đã hoàn tất Check-in không thể đổi sang trạng thái khác.' });
    }
    if (currentStatus === 'PENDING' && mappedStatus === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Đơn đang chờ xác nhận. Vui lòng xác nhận đơn trước khi Check-in cho khách.'
      });
    }

    const defaultReason =
      mappedStatus === 'CANCELLED'
        ? currentStatus === 'PENDING'
          ? 'Chủ sân từ chối / không xác nhận đơn'
          : 'Chủ sân hủy đơn'
        : mappedStatus === 'CONFIRMED'
          ? 'Chủ sân đã xác nhận đơn đặt sân'
          : 'Chủ sân xác nhận khách đã Check-in vào sân';

    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim().slice(0, 500)
      : defaultReason;

    if (mappedStatus === 'CANCELLED') {
      await client.query(
        `UPDATE bookings
         SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = $1, updated_at = NOW()
         WHERE booking_id = $2`,
        [reason, bookingId]
      );
      await client.query(
        'UPDATE booking_details SET active_flag = NULL WHERE booking_id = $1',
        [bookingId]
      );
    } else {
      let nextPaymentStatus = null;
      if (mappedStatus === 'COMPLETED') {
        nextPaymentStatus = 'PAID';
      } else if (
        mappedStatus === 'CONFIRMED' &&
        (paymentMethodText.includes('vietqr') || paymentMethodText.includes('vnpay') || paymentMethodText.includes('online'))
      ) {
        nextPaymentStatus = 'PAID_ONLINE';
      }

      await client.query(
        `UPDATE bookings
         SET status = $1,
             payment_status = COALESCE($3, payment_status),
             cancelled_at = NULL,
             updated_at = NOW()
         WHERE booking_id = $2`,
        [mappedStatus, bookingId, nextPaymentStatus]
      );
    }

    if (currentStatus !== mappedStatus) {
      await client.query(
        `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, currentStatus, mappedStatus, ownerUserId, reason]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      message: mappedStatus === 'COMPLETED'
        ? `Đã xác nhận Check-in cho đơn BK-${bookingId}!`
        : mappedStatus === 'CONFIRMED'
          ? `Đã xác nhận đơn đặt sân BK-${bookingId}!`
          : currentStatus === 'PENDING'
            ? `Đã từ chối đơn BK-${bookingId} và mở lại khung giờ trống.`
            : `Đã hủy đơn BK-${bookingId} và mở lại khung giờ trống.`,
      data: { id: `BK-${bookingId}`, bookingId, status: mappedStatus }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi cập nhật trạng thái đơn:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái đơn.' });
  } finally {
    client.release();
  }
};

// GET /api/owner/blocks?courtId=...&date=...
const getOwnerBlocks = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const courtId = Number(req.query.courtId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [courtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem khóa lịch cụm sân này.' });
    }

    const vals = [courtId];
    let dateCond = '';
    if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
      vals.push(req.query.date);
      dateCond = ` AND cb.start_at < ($2::date + INTERVAL '1 day') AND cb.end_at > $2::date`;
    }

    const result = await pool.query(
      `SELECT cb.block_id, cb.court_id, cb.sub_court_id, sc.name AS sub_court_name,
              TO_CHAR(cb.start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at_str,
              TO_CHAR(cb.end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at_str,
              cb.reason, cb.created_at
       FROM court_blocks cb
       LEFT JOIN sub_courts sc ON sc.sub_court_id = cb.sub_court_id
       WHERE cb.court_id = $1 ${dateCond}
       ORDER BY cb.start_at ASC`,
      vals
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Lỗi lấy danh sách khóa giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách khóa khung giờ.' });
  }
};

// POST /api/owner/blocks
const createOwnerBlock = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const { courtId, subCourtId, slotId, date, reason } = req.body || {};
    const parsedCourtId = Number(courtId);
    const parsedSubCourtId = subCourtId ? Number(subCourtId) : null;
    const parsedSlotId = slotId ? Number(slotId) : null;
    const cleanReason = typeof reason === 'string' && reason.trim()
      ? reason.trim().slice(0, 255)
      : 'Bảo trì / Giữ sân nội bộ';

    if (
      !Number.isSafeInteger(userId) || userId <= 0 ||
      !Number.isSafeInteger(parsedCourtId) || parsedCourtId <= 0 ||
      !Number.isSafeInteger(parsedSlotId) || parsedSlotId <= 0 ||
      typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({ success: false, message: 'Thông tin khóa khung giờ không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [parsedCourtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền khóa lịch cụm sân này.' });
    }

    if (parsedSubCourtId) {
      const scCheck = await pool.query(
        'SELECT 1 FROM sub_courts WHERE sub_court_id = $1 AND court_id = $2',
        [parsedSubCourtId, parsedCourtId]
      );
      if (scCheck.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Sân con không thuộc cụm sân này.' });
      }
    }

    const slotRes = await pool.query(
      `SELECT TO_CHAR(start_time, 'HH24:MI:SS') AS start_full,
              TO_CHAR(end_time, 'HH24:MI:SS') AS end_full
       FROM time_slots
       WHERE slot_id = $1 AND court_id = $2 AND is_active = TRUE`,
      [parsedSlotId, parsedCourtId]
    );
    if (slotRes.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Khung giờ không tồn tại.' });
    }

    const startAt = `${date} ${slotRes.rows[0].start_full}`;
    const endAt = `${date} ${slotRes.rows[0].end_full}`;

    // Kiểm tra xem đã có đơn đặt hoạt động chưa
    const conflictBooking = await pool.query(
      `SELECT b.booking_id
       FROM booking_details bd
       JOIN bookings b ON b.booking_id = bd.booking_id
       WHERE bd.court_id = $1
         AND bd.booking_date = $2::date
         AND bd.slot_id = $3
         AND bd.active_flag = 1
         AND b.status <> 'CANCELLED'
         AND ($4::bigint IS NULL OR bd.sub_court_id = $4 OR bd.sub_court_id IS NULL)
       LIMIT 1`,
      [parsedCourtId, date, parsedSlotId, parsedSubCourtId]
    );
    if (conflictBooking.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Khung giờ này đang có khách đặt sân. Vui lòng hủy đơn trước khi khóa!'
      });
    }

    const conflictBlock = await pool.query(
      `SELECT block_id, reason
       FROM court_blocks
       WHERE court_id = $1
         AND TO_CHAR(start_at, 'YYYY-MM-DD HH24:MI:SS') < $4
         AND TO_CHAR(end_at, 'YYYY-MM-DD HH24:MI:SS') > $3
         AND (
           $2::bigint IS NULL
           OR sub_court_id IS NULL
           OR sub_court_id = $2
         )
       LIMIT 1`,
      [parsedCourtId, parsedSubCourtId, startAt, endAt]
    );
    if (conflictBlock.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Khung giờ này đã được khóa trước đó (${conflictBlock.rows[0].reason}).`
      });
    }

    const insertRes = await pool.query(
      `INSERT INTO court_blocks (court_id, sub_court_id, start_at, end_at, reason, created_by)
       VALUES ($1, $2, $3::timestamp, $4::timestamp, $5, $6)
       RETURNING block_id, court_id, sub_court_id,
                 TO_CHAR(start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at_str,
                 TO_CHAR(end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at_str,
                 reason`,
      [parsedCourtId, parsedSubCourtId, startAt, endAt, cleanReason, userId]
    );

    return res.status(201).json({
      success: true,
      message: 'Đã khóa khung giờ thành công!',
      data: insertRes.rows[0]
    });
  } catch (error) {
    console.error('Lỗi khóa khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể khóa khung giờ.' });
  }
};

// DELETE /api/owner/blocks/:blockId
const deleteOwnerBlock = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const blockId = Number(req.params.blockId);
    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(blockId) || blockId <= 0) {
      return res.status(400).json({ success: false, message: 'Yêu cầu không hợp lệ.' });
    }

    const delRes = await pool.query(
      `DELETE FROM court_blocks cb
       USING courts c, users u
       WHERE cb.block_id = $1
         AND cb.court_id = c.court_id
         AND u.user_id = c.owner_id
         AND u.user_id = $2
         AND u.role = 'OWNER'
         AND u.status = 'ACTIVE'
       RETURNING cb.block_id`,
      [blockId, userId]
    );
    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch khóa thuộc quyền quản lý.' });
    }

    return res.status(200).json({ success: true, message: 'Đã mở khóa khung giờ thành công!' });
  } catch (error) {
    console.error('Lỗi mở khóa khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể mở khóa khung giờ.' });
  }
};

// GET /api/owner/analytics?courtId=...&date=...
const getOwnerAnalytics = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const courtId = Number(req.query.courtId);
    const targetDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : getTodayLocalYMD();

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [courtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem thống kê cụm sân này.' });
    }

    const [
      summaryRes,
      capacityRes,
      last7DaysRes,
      sportBreakdownRes
    ] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (
             WHERE status IN ('CONFIRMED', 'COMPLETED') AND DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', $2::date)
           ), 0)::numeric AS monthly_revenue,
           COUNT(*) FILTER (
             WHERE status IN ('CONFIRMED', 'COMPLETED') AND DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', $2::date)
           )::int AS monthly_bookings,
           COALESCE(SUM(total_amount) FILTER (
             WHERE status IN ('CONFIRMED', 'COMPLETED')
               AND DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', $2::date)
               AND (LOWER(COALESCE(payment_method, '')) LIKE '%vietqr%' OR LOWER(COALESCE(payment_method, '')) LIKE '%vnpay%' OR LOWER(COALESCE(payment_method, '')) LIKE '%online%')
           ), 0)::numeric AS monthly_online_revenue,
           COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED'))::int AS total_valid_bookings,
           COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS checked_in_count,
           COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_bookings_count,
           COUNT(*) FILTER (WHERE booking_date = $2::date AND status IN ('CONFIRMED', 'COMPLETED'))::int AS today_bookings,
           COUNT(*) FILTER (WHERE booking_date = $2::date AND status = 'PENDING')::int AS today_pending_count,
           COALESCE(SUM(total_amount) FILTER (WHERE booking_date = $2::date AND status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS today_revenue
         FROM bookings
         WHERE court_id = $1`,
        [courtId, targetDate]
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM sub_courts WHERE court_id = $1 AND status = 'ACTIVE') AS active_sub_courts,
           (SELECT COUNT(*)::int FROM time_slots WHERE court_id = $1 AND is_active = TRUE) AS active_slots,
           (SELECT COUNT(*)::int FROM booking_details bd
            JOIN bookings b ON b.booking_id = bd.booking_id
            WHERE bd.court_id = $1 AND bd.booking_date = $2::date AND bd.active_flag = 1 AND b.status <> 'CANCELLED') AS booked_today_slots`,
        [courtId, targetDate]
      ),
      pool.query(
        `SELECT
           TO_CHAR(d::date, 'YYYY-MM-DD') AS day_date,
           EXTRACT(DOW FROM d::date)::int AS dow,
           COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS revenue,
           COUNT(b.booking_id) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED'))::int AS bookings_count
         FROM GENERATE_SERIES($2::date - INTERVAL '6 days', $2::date, '1 day') AS d
         LEFT JOIN bookings b ON b.court_id = $1 AND b.booking_date = d::date
         GROUP BY d
         ORDER BY d ASC`,
        [courtId, targetDate]
      ),
      pool.query(
        `SELECT
           COALESCE(st.name, c_st.name, 'Khác') AS sport_name,
           COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS revenue,
           COUNT(b.booking_id) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED'))::int AS bookings_count
         FROM bookings b
         JOIN courts c ON c.court_id = b.court_id
         LEFT JOIN sport_types c_st ON c_st.sport_type_id = c.sport_type_id
         LEFT JOIN sub_courts sc ON sc.sub_court_id = b.sub_court_id
         LEFT JOIN sport_types st ON st.sport_type_id = sc.sport_type_id
         WHERE b.court_id = $1
         GROUP BY COALESCE(st.name, c_st.name, 'Khác')
         ORDER BY revenue DESC`,
        [courtId]
      )
    ]);

    const s = summaryRes.rows[0];
    const cap = capacityRes.rows[0];
    const monthlyRevenue = Number(s.monthly_revenue || 0);
    const monthlyOnlineRevenue = Number(s.monthly_online_revenue || 0);
    const monthlyCounterRevenue = Math.max(0, monthlyRevenue - monthlyOnlineRevenue);
    const totalCapacity = Math.max(0, Number(cap.active_sub_courts || 0) * Number(cap.active_slots || 0));
    const bookedToday = Number(cap.booked_today_slots || 0);
    const occupancyRate = totalCapacity > 0 ? Math.min(100, Math.round((bookedToday / totalCapacity) * 100)) : 0;

    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const last7Days = last7DaysRes.rows.map((r) => ({
      date: r.day_date,
      label: dayLabels[Number(r.dow)] || r.day_date.slice(5),
      revenue: Number(r.revenue || 0),
      bookingsCount: Number(r.bookings_count || 0)
    }));

    const totalSportRev = sportBreakdownRes.rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
    const bySport = sportBreakdownRes.rows.map((r) => {
      const rev = Number(r.revenue || 0);
      return {
        sportName: r.sport_name,
        revenue: rev,
        bookingsCount: Number(r.bookings_count || 0),
        ratio: totalSportRev > 0 ? Math.round((rev / totalSportRev) * 100) : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        courtId,
        targetDate,
        monthlyRevenue,
        monthlyBookings: Number(s.monthly_bookings || 0),
        monthlyOnlineRevenue,
        monthlyCounterRevenue,
        platformFeeEstimate: Math.round(monthlyOnlineRevenue * 0.05),
        totalBookings: Number(s.total_valid_bookings || 0),
        checkedInCount: Number(s.checked_in_count || 0),
        pendingBookingsCount: Number(s.pending_bookings_count || 0),
        todayPendingCount: Number(s.today_pending_count || 0),
        todayBookingsCount: Number(s.today_bookings || 0),
        todayRevenue: Number(s.today_revenue || 0),
        occupancyRate,
        bookedTodaySlots: bookedToday,
        totalDailyCapacity: totalCapacity,
        last7Days,
        bySport
      }
    });
  } catch (error) {
    console.error('Lỗi thống kê doanh thu chủ sân:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải dữ liệu thống kê.' });
  }
};

const mapOwnerTimeSlotRow = (s) => ({
  slotId: Number(s.slot_id),
  courtId: Number(s.court_id),
  startTime: s.start_label,
  endTime: s.end_label,
  startFull: s.start_full,
  endFull: s.end_full,
  label: `${s.start_label} - ${s.end_label}`,
  durationMinutes: getSlotDurationMinutes(s.start_full, s.end_full),
  isPeak: resolvePeakFlag(s.is_peak, s.start_full),
  isActive: Boolean(s.is_active),
  bookingCount: Number(s.booking_count || 0),
  activeBookingCount: Number(s.active_booking_count || 0)
});

const fetchOwnerTimeSlotsList = async (dbClient, courtId) => {
  const result = await dbClient.query(
    `SELECT
       ts.slot_id,
       ts.court_id,
       TO_CHAR(ts.start_time, 'HH24:MI') AS start_label,
       TO_CHAR(ts.end_time, 'HH24:MI') AS end_label,
       TO_CHAR(ts.start_time, 'HH24:MI:SS') AS start_full,
       TO_CHAR(ts.end_time, 'HH24:MI:SS') AS end_full,
       ts.is_peak,
       ts.is_active,
       COUNT(bd.detail_id)::int AS booking_count,
       COUNT(bd.detail_id) FILTER (
         WHERE bd.active_flag = 1 AND b.status <> 'CANCELLED'
       )::int AS active_booking_count
     FROM time_slots ts
     LEFT JOIN booking_details bd ON bd.slot_id = ts.slot_id
     LEFT JOIN bookings b ON b.booking_id = bd.booking_id
     WHERE ts.court_id = $1
     GROUP BY ts.slot_id, ts.court_id, ts.start_time, ts.end_time, ts.is_peak, ts.is_active
     ORDER BY ts.start_time ASC, ts.end_time ASC`,
    [courtId]
  );
  return result.rows.map(mapOwnerTimeSlotRow);
};

// GET /api/owner/time-slots?courtId=...
const getOwnerTimeSlots = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const courtId = Number(req.query.courtId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [courtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền quản lý khung giờ cụm sân này.' });
    }

    const slots = await fetchOwnerTimeSlotsList(pool, courtId);
    return res.status(200).json({ success: true, total: slots.length, data: slots });
  } catch (error) {
    console.error('Lỗi lấy danh sách khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách khung giờ.' });
  }
};

// POST /api/owner/time-slots
const createOwnerTimeSlot = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.user?.userId);
    const { courtId, startTime, endTime, isPeak, isActive } = req.body || {};
    const parsedCourtId = Number(courtId);
    const startObj = parseTimeToMinutes(startTime);
    const endObj = parseTimeToMinutes(endTime);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(parsedCourtId) || parsedCourtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }
    if (!startObj || !endObj || endObj.minutes - startObj.minutes < 15) {
      return res.status(400).json({
        success: false,
        message: 'Khung giờ không hợp lệ. Giờ kết thúc phải sau giờ bắt đầu ít nhất 15 phút.'
      });
    }

    await client.query('BEGIN');

    const ownerCheck = await client.query(
      `SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'
       FOR UPDATE`,
      [parsedCourtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thêm khung giờ cho cụm sân này.' });
    }

    const exactRes = await client.query(
      `SELECT slot_id, is_active
       FROM time_slots
       WHERE court_id = $1 AND start_time = $2::time AND end_time = $3::time
       FOR UPDATE`,
      [parsedCourtId, startObj.pgTime, endObj.pgTime]
    );

    const existingId = exactRes.rowCount > 0 ? Number(exactRes.rows[0].slot_id) : 0;
    if (exactRes.rowCount > 0 && exactRes.rows[0].is_active) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Khung giờ ${startObj.hhmm} - ${endObj.hhmm} đã tồn tại.`
      });
    }

    const nextActive = isActive !== false;
    const nextPeak = typeof isPeak === 'boolean' ? isPeak : isPeakHour(startObj.pgTime);

    if (nextActive) {
      const overlapRes = await client.query(
        `SELECT TO_CHAR(start_time, 'HH24:MI') AS s_lbl, TO_CHAR(end_time, 'HH24:MI') AS e_lbl
         FROM time_slots
         WHERE court_id = $1
           AND is_active = TRUE
           AND slot_id <> $2
           AND start_time < $4::time
           AND end_time > $3::time
         LIMIT 1`,
        [parsedCourtId, existingId, startObj.pgTime, endObj.pgTime]
      );
      if (overlapRes.rowCount > 0) {
        const conflict = overlapRes.rows[0];
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Khung giờ ${startObj.hhmm} - ${endObj.hhmm} bị chồng lấn với khung giờ đang mở (${conflict.s_lbl} - ${conflict.e_lbl}).`
        });
      }
    }

    let savedSlotId;
    let reactivated = false;
    if (existingId > 0) {
      await client.query(
        `UPDATE time_slots SET is_active = $1, is_peak = $2 WHERE slot_id = $3`,
        [nextActive, nextPeak, existingId]
      );
      savedSlotId = existingId;
      reactivated = true;
    } else {
      const insertRes = await client.query(
        `INSERT INTO time_slots (court_id, start_time, end_time, is_peak, is_active)
         VALUES ($1, $2::time, $3::time, $4, $5)
         RETURNING slot_id`,
        [parsedCourtId, startObj.pgTime, endObj.pgTime, nextPeak, nextActive]
      );
      savedSlotId = Number(insertRes.rows[0].slot_id);
    }

    const allSlots = await fetchOwnerTimeSlotsList(client, parsedCourtId);
    const createdSlot = allSlots.find(s => s.slotId === savedSlotId) || null;
    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: reactivated
        ? `Đã kích hoạt lại khung giờ ${startObj.hhmm} - ${endObj.hhmm}!`
        : `Đã thêm khung giờ ${startObj.hhmm} - ${endObj.hhmm} thành công!`,
      data: createdSlot
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi thêm khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể thêm khung giờ mới.' });
  } finally {
    client.release();
  }
};

// PUT /api/owner/time-slots/:slotId
const updateOwnerTimeSlot = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.user?.userId);
    const slotId = Number(req.params.slotId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(slotId) || slotId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã khung giờ không hợp lệ.' });
    }

    const { startTime, endTime, isPeak, isActive } = req.body || {};

    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT ts.slot_id,
              ts.court_id,
              TO_CHAR(ts.start_time, 'HH24:MI') AS start_label,
              TO_CHAR(ts.end_time, 'HH24:MI') AS end_label,
              ts.is_peak,
              ts.is_active
       FROM time_slots ts
       JOIN courts c ON c.court_id = ts.court_id
       JOIN users u ON u.user_id = c.owner_id
       WHERE ts.slot_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'
       FOR UPDATE`,
      [slotId, userId]
    );
    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy khung giờ thuộc quyền quản lý.' });
    }

    const existing = existingRes.rows[0];
    const parsedCourtId = Number(existing.court_id);
    const nextStart = startTime !== undefined ? parseTimeToMinutes(startTime) : parseTimeToMinutes(existing.start_label);
    const nextEnd = endTime !== undefined ? parseTimeToMinutes(endTime) : parseTimeToMinutes(existing.end_label);

    if (!nextStart || !nextEnd || nextEnd.minutes - nextStart.minutes < 15) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Mốc giờ không hợp lệ. Giờ kết thúc phải sau giờ bắt đầu ít nhất 15 phút.'
      });
    }

    const timeChanged = nextStart.hhmm !== existing.start_label || nextEnd.hhmm !== existing.end_label;
    const nextIsPeak = typeof isPeak === 'boolean' ? isPeak : Boolean(existing.is_peak);
    const nextIsActive = typeof isActive === 'boolean' ? isActive : Boolean(existing.is_active);

    if (timeChanged) {
      const usedRes = await client.query(
        'SELECT 1 FROM booking_details WHERE slot_id = $1 LIMIT 1',
        [slotId]
      );
      if (usedRes.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Khung giờ này đã có dữ liệu đặt sân nên không thể đổi mốc giờ. Vui lòng Tạm ẩn khung giờ cũ và tạo khung giờ mới.'
        });
      }

      const dupRes = await client.query(
        `SELECT 1 FROM time_slots
         WHERE court_id = $1 AND slot_id <> $2 AND start_time = $3::time AND end_time = $4::time
         LIMIT 1`,
        [parsedCourtId, slotId, nextStart.pgTime, nextEnd.pgTime]
      );
      if (dupRes.rowCount > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Khung giờ ${nextStart.hhmm} - ${nextEnd.hhmm} đã tồn tại.`
        });
      }
    }

    if (nextIsActive) {
      const overlapRes = await client.query(
        `SELECT TO_CHAR(start_time, 'HH24:MI') AS s_lbl, TO_CHAR(end_time, 'HH24:MI') AS e_lbl
         FROM time_slots
         WHERE court_id = $1
           AND slot_id <> $2
           AND is_active = TRUE
           AND start_time < $4::time
           AND end_time > $3::time
         LIMIT 1`,
        [parsedCourtId, slotId, nextStart.pgTime, nextEnd.pgTime]
      );
      if (overlapRes.rowCount > 0) {
        const conflict = overlapRes.rows[0];
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Không thể bật/cập nhật vì chồng lấn với khung giờ đang mở (${conflict.s_lbl} - ${conflict.e_lbl}).`
        });
      }
    }

    await client.query(
      `UPDATE time_slots
       SET start_time = $1::time,
           end_time = $2::time,
           is_peak = $3,
           is_active = $4
       WHERE slot_id = $5`,
      [nextStart.pgTime, nextEnd.pgTime, nextIsPeak, nextIsActive, slotId]
    );

    const allSlots = await fetchOwnerTimeSlotsList(client, parsedCourtId);
    const updatedSlot = allSlots.find(s => s.slotId === slotId) || null;
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật khung giờ ${nextStart.hhmm} - ${nextEnd.hhmm}!`,
      data: updatedSlot
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi cập nhật khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật khung giờ.' });
  } finally {
    client.release();
  }
};

// DELETE /api/owner/time-slots/:slotId
const deleteOwnerTimeSlot = async (req, res) => {
  try {
    const userId = Number(req.user?.userId);
    const slotId = Number(req.params.slotId);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(slotId) || slotId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã khung giờ không hợp lệ.' });
    }

    const ownerCheck = await pool.query(
      `SELECT ts.slot_id
       FROM time_slots ts
       JOIN courts c ON c.court_id = ts.court_id
       JOIN users u ON u.user_id = c.owner_id
       WHERE ts.slot_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'`,
      [slotId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khung giờ thuộc quyền quản lý.' });
    }

    const usedRes = await pool.query(
      'SELECT 1 FROM booking_details WHERE slot_id = $1 LIMIT 1',
      [slotId]
    );
    if (usedRes.rowCount > 0) {
      await pool.query('UPDATE time_slots SET is_active = FALSE WHERE slot_id = $1', [slotId]);
      return res.status(200).json({
        success: true,
        softDeleted: true,
        message: 'Khung giờ đã có dữ liệu đặt sân nên đã được chuyển sang trạng thái Tạm ẩn.'
      });
    }

    try {
      await pool.query('DELETE FROM time_slots WHERE slot_id = $1', [slotId]);
      return res.status(200).json({
        success: true,
        softDeleted: false,
        message: 'Đã xóa khung giờ thành công!'
      });
    } catch (delErr) {
      if (delErr.code === '23503' || delErr.code === '23001') {
        await pool.query('UPDATE time_slots SET is_active = FALSE WHERE slot_id = $1', [slotId]);
        return res.status(200).json({
          success: true,
          softDeleted: true,
          message: 'Khung giờ đã có dữ liệu đặt sân nên đã được chuyển sang trạng thái Tạm ẩn.'
        });
      }
      throw delErr;
    }
  } catch (error) {
    console.error('Lỗi xóa khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể xóa khung giờ.' });
  }
};

// POST /api/owner/time-slots/generate
const generateOwnerTimeSlots = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = Number(req.user?.userId);
    const {
      courtId,
      openTime,
      closeTime,
      durationMinutes = 60,
      applyPeak = true,
      peakStart = '17:00',
      peakEnd = '21:00',
      replaceExisting = false
    } = req.body || {};

    const parsedCourtId = Number(courtId);
    const openObj = parseTimeToMinutes(openTime);
    const closeObj = parseTimeToMinutes(closeTime);
    const stepMinutes = Number(durationMinutes);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ.' });
    }
    if (!Number.isSafeInteger(parsedCourtId) || parsedCourtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }
    if (
      !openObj || !closeObj ||
      !Number.isInteger(stepMinutes) || stepMinutes < 15 || stepMinutes > 240 ||
      closeObj.minutes - openObj.minutes < stepMinutes
    ) {
      return res.status(400).json({
        success: false,
        message: 'Khoảng giờ mở cửa, đóng cửa hoặc thời lượng mỗi ca (15-240 phút) không hợp lệ.'
      });
    }

    let peakStartObj = null;
    let peakEndObj = null;
    if (applyPeak) {
      peakStartObj = parseTimeToMinutes(peakStart);
      peakEndObj = parseTimeToMinutes(peakEnd);
      if (!peakStartObj || !peakEndObj || peakEndObj.minutes <= peakStartObj.minutes) {
        return res.status(400).json({
          success: false,
          message: 'Khoảng giờ vàng không hợp lệ (giờ kết thúc phải sau giờ bắt đầu).'
        });
      }
    }

    const candidates = [];
    for (let cursor = openObj.minutes; cursor + stepMinutes <= closeObj.minutes; cursor += stepMinutes) {
      if (candidates.length >= 48) break;
      const st = minutesToTimeObj(cursor);
      const et = minutesToTimeObj(cursor + stepMinutes);
      const isPeak = Boolean(
        applyPeak &&
        peakStartObj &&
        peakEndObj &&
        st.minutes >= peakStartObj.minutes &&
        st.minutes < peakEndObj.minutes
      );
      candidates.push({ st, et, isPeak, key: `${st.hhmm}-${et.hhmm}` });
    }

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể tạo khung giờ nào trong khoảng thời gian đã chọn.'
      });
    }

    await client.query('BEGIN');

    const ownerCheck = await client.query(
      `SELECT 1 FROM courts c JOIN users u ON u.user_id = c.owner_id
       WHERE c.court_id = $1 AND u.user_id = $2 AND u.role = 'OWNER' AND u.status = 'ACTIVE'
       FOR UPDATE`,
      [parsedCourtId, userId]
    );
    if (ownerCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Bạn không có quyền cấu hình khung giờ cho cụm sân này.' });
    }

    const existingRes = await client.query(
      `SELECT ts.slot_id,
              TO_CHAR(ts.start_time, 'HH24:MI') AS start_label,
              TO_CHAR(ts.end_time, 'HH24:MI') AS end_label,
              ts.is_active,
              COUNT(bd.detail_id)::int AS booking_count,
              COUNT(bd.detail_id) FILTER (
                WHERE bd.active_flag = 1 AND b.status <> 'CANCELLED' AND b.booking_date >= CURRENT_DATE
              )::int AS upcoming_booking_count
       FROM time_slots ts
       LEFT JOIN booking_details bd ON bd.slot_id = ts.slot_id
       LEFT JOIN bookings b ON b.booking_id = bd.booking_id
       WHERE ts.court_id = $1
       GROUP BY ts.slot_id, ts.start_time, ts.end_time, ts.is_active`,
      [parsedCourtId]
    );

    const existingRows = existingRes.rows.map((r) => ({
      slotId: Number(r.slot_id),
      start: parseTimeToMinutes(r.start_label),
      end: parseTimeToMinutes(r.end_label),
      key: `${r.start_label}-${r.end_label}`,
      isActive: Boolean(r.is_active),
      bookingCount: Number(r.booking_count || 0),
      upcomingBookingCount: Number(r.upcoming_booking_count || 0)
    }));

    let createdCount = 0;
    let reactivatedCount = 0;
    let skippedCount = 0;
    const candidateKeySet = new Set(candidates.map(c => c.key));

    if (replaceExisting) {
      const conflictingUpcoming = existingRows.find(
        (ex) => ex.upcomingBookingCount > 0 && !candidateKeySet.has(ex.key)
      );
      if (conflictingUpcoming) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `Không thể thay thế toàn bộ vì khung giờ ${conflictingUpcoming.start.hhmm} - ${conflictingUpcoming.end.hhmm} đang có đơn đặt từ hôm nay trở đi. Hãy dùng chế độ Thêm bổ sung hoặc giữ khung giờ này.`
        });
      }

      await client.query(
        `DELETE FROM time_slots ts
         WHERE ts.court_id = $1
           AND NOT EXISTS (SELECT 1 FROM booking_details bd WHERE bd.slot_id = ts.slot_id)`,
        [parsedCourtId]
      );
      await client.query(
        'UPDATE time_slots SET is_active = FALSE WHERE court_id = $1',
        [parsedCourtId]
      );

      for (const c of candidates) {
        const upRes = await client.query(
          `INSERT INTO time_slots (court_id, start_time, end_time, is_peak, is_active)
           VALUES ($1, $2::time, $3::time, $4, TRUE)
           ON CONFLICT (court_id, start_time, end_time)
           DO UPDATE SET is_active = TRUE, is_peak = EXCLUDED.is_peak
           RETURNING (xmax = 0) AS inserted`,
          [parsedCourtId, c.st.pgTime, c.et.pgTime, c.isPeak]
        );
        if (upRes.rows[0]?.inserted) createdCount++;
        else reactivatedCount++;
      }
    } else {
      const activeWindows = existingRows
        .filter(ex => ex.isActive)
        .map(ex => ({ start: ex.start.minutes, end: ex.end.minutes }));
      const inactiveByKey = new Map(
        existingRows.filter(ex => !ex.isActive).map(ex => [ex.key, ex])
      );

      for (const c of candidates) {
        const overlapsActive = activeWindows.some(
          w => w.start < c.et.minutes && w.end > c.st.minutes
        );
        if (overlapsActive) {
          skippedCount++;
          continue;
        }
        const inactiveMatch = inactiveByKey.get(c.key);
        if (inactiveMatch) {
          await client.query(
            'UPDATE time_slots SET is_active = TRUE, is_peak = $1 WHERE slot_id = $2',
            [c.isPeak, inactiveMatch.slotId]
          );
          reactivatedCount++;
        } else {
          await client.query(
            `INSERT INTO time_slots (court_id, start_time, end_time, is_peak, is_active)
             VALUES ($1, $2::time, $3::time, $4, TRUE)`,
            [parsedCourtId, c.st.pgTime, c.et.pgTime, c.isPeak]
          );
          createdCount++;
        }
        activeWindows.push({ start: c.st.minutes, end: c.et.minutes });
      }
    }

    const updatedSlots = await fetchOwnerTimeSlotsList(client, parsedCourtId);
    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: replaceExisting
        ? `Đã thiết lập lại ${createdCount + reactivatedCount} khung giờ cho cụm sân.`
        : `Đã tạo mới ${createdCount}, kích hoạt lại ${reactivatedCount} khung giờ (bỏ qua ${skippedCount} khung giờ trùng/chồng lấn).`,
      summary: { createdCount, reactivatedCount, skippedCount },
      data: updatedSlots
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi tạo nhanh khung giờ:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo nhanh danh sách khung giờ.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getSportTypes,
  getMyFacilities,
  createFacility,
  updateFacilitySettings,
  getMyCourts,
  createSubCourt,
  updateSubCourt,
  deleteSubCourt,
  getOwnerTimeSlots,
  createOwnerTimeSlot,
  updateOwnerTimeSlot,
  deleteOwnerTimeSlot,
  generateOwnerTimeSlots,
  getOwnerBookings,
  getOwnerSchedule,
  createWalkInBooking,
  updateOwnerBookingStatus,
  getOwnerBlocks,
  createOwnerBlock,
  deleteOwnerBlock,
  getOwnerAnalytics
};

