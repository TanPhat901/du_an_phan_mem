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
         op.bank_account_name
       FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       LEFT JOIN owner_profiles op ON op.owner_id = u.user_id
       LEFT JOIN sport_types st ON st.sport_type_id = c.sport_type_id
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

    const { name, sport_type_id, address, area, description, price_per_slot } = req.body || {};
    const sportTypeId = Number(sport_type_id || 1);
    const price = Number(price_per_slot || 200000);

    if (
      typeof name !== 'string' || !name.trim() || name.trim().length > 150 ||
      typeof address !== 'string' || !address.trim() || address.trim().length > 255 ||
      !Number.isSafeInteger(sportTypeId) || sportTypeId <= 0 ||
      !Number.isFinite(price) || price < 0
    ) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ Tên cụm sân, Địa chỉ và Giá mặc định hợp lệ.' });
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
      `INSERT INTO courts (sport_type_id, owner_id, name, address, area, description, price_per_slot, operational_status, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', TRUE)
       RETURNING *`,
      [
        sportTypeId,
        userId,
        name.trim(),
        address.trim(),
        typeof area === 'string' && area.trim() ? area.trim() : 'TP. Hồ Chí Minh',
        typeof description === 'string' && description.trim() ? description.trim() : 'Bãi đỗ xe, Đèn Led ban đêm, Phòng thay đồ',
        price
      ]
    );
    const newCourt = courtRes.rows[0];

    const defaultSlots = [
      ['06:00:00', '07:00:00'],
      ['07:00:00', '08:00:00'],
      ['16:00:00', '17:00:00'],
      ['17:00:00', '18:00:00'],
      ['18:00:00', '19:00:00'],
      ['19:00:00', '20:00:00'],
      ['20:00:00', '21:00:00'],
      ['21:00:00', '22:00:00']
    ];
    for (const [st, et] of defaultSlots) {
      await client.query(
        `INSERT INTO time_slots (court_id, start_time, end_time, is_active)
         VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING`,
        [newCourt.court_id, st, et]
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
      price_per_slot !== undefined ||
      operational_status !== undefined
    ) {
      const updates = [];
      const vals = [];
      let idx = 1;
      if (typeof name === 'string' && name.trim()) { updates.push(`name = $${idx++}`); vals.push(name.trim()); }
      if (sport_type_id !== undefined) { updates.push(`sport_type_id = $${idx++}`); vals.push(Number(sport_type_id)); }
      if (typeof address === 'string' && address.trim()) { updates.push(`address = $${idx++}`); vals.push(address.trim()); }
      if (typeof area === 'string') { updates.push(`area = $${idx++}`); vals.push(area.trim()); }
      if (typeof description === 'string') { updates.push(`description = $${idx++}`); vals.push(description.trim()); }
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

module.exports = {
  getSportTypes,
  getMyFacilities,
  createFacility,
  updateFacilitySettings,
  getMyCourts,
  createSubCourt,
  updateSubCourt,
  deleteSubCourt
};

