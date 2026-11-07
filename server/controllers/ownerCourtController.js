const { pool } = require('../config/db');

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
        if (!['ACTIVE', 'MAINTENANCE'].includes(value)) {
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

module.exports = { getMyCourts, createSubCourt, updateSubCourt };

