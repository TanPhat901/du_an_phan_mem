
const { pool } = require('../config/db');

const publicFields = `
  user_id AS id,
  full_name AS "fullName",
  email,
  phone,
  role,
  status,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

// GET /api/profile/me
const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${publicFields}
       FROM users
       WHERE user_id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản.'
      });
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không hoạt động.'
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải hồ sơ cá nhân.'
    });
  }
};

// PUT /api/profile/me
const updateMyProfile = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body || {};

    if (
      typeof fullName !== 'string' ||
      typeof email !== 'string' ||
      (phone !== null && phone !== undefined &&
       typeof phone !== 'string')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu hồ sơ không hợp lệ.'
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || null;

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      cleanEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      (cleanPhone && !/^\+?[0-9]{9,15}$/.test(cleanPhone))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên, email hoặc số điện thoại không hợp lệ.'
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           email = $2,
           phone = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $4
         AND status = 'ACTIVE'
       RETURNING ${publicFields}`,
      [
        cleanName,
        cleanEmail,
        cleanPhone,
        req.user.userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản đang hoạt động.'
      });
    }

    return res.json({
      success: true,
      message: 'Cập nhật hồ sơ thành công!',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Email hoặc số điện thoại đã được sử dụng.'
      });
    }

    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật hồ sơ.'
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile
};
