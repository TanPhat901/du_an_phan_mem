const bcrypt = require('bcryptjs');
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
    const userId = Number(req.user.userId);
    const result = await pool.query(
      `SELECT ${publicFields}
       FROM users
       WHERE user_id = $1`,
      [userId]
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

    const statsRes = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM bookings WHERE user_id = $1) AS total_bookings,
         (SELECT COUNT(*)::int FROM bookings WHERE user_id = $1 AND status = 'CONFIRMED') AS upcoming_bookings,
         (SELECT COUNT(*)::int FROM bookings WHERE user_id = $1 AND status = 'COMPLETED') AS completed_bookings,
         (SELECT COUNT(*)::int FROM favorite_courts WHERE user_id = $1) AS favorites_count,
         (SELECT COUNT(*)::int FROM court_reviews WHERE user_id = $1) AS reviews_count`,
      [userId]
    );
    const stats = statsRes.rows[0] || {};

    return res.json({
      success: true,
      data: {
        ...user,
        stats: {
          totalBookings: Number(stats.total_bookings || 0),
          upcomingBookings: Number(stats.upcoming_bookings || 0),
          completedBookings: Number(stats.completed_bookings || 0),
          favoritesCount: Number(stats.favorites_count || 0),
          reviewsCount: Number(stats.reviews_count || 0)
        }
      }
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

// PUT /api/profile/password
const changeMyPassword = async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    if (newPassword.length < 6 || newPassword.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có từ 6 đến 100 ký tự.'
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới cần khác với mật khẩu hiện tại.'
      });
    }

    const userRes = await pool.query(
      'SELECT user_id, password_hash, status FROM users WHERE user_id = $1',
      [userId]
    );
    if (userRes.rowCount === 0 || userRes.rows[0].status !== 'ACTIVE') {
      return res.status(404).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đang bị khóa.'
      });
    }

    const stored = userRes.rows[0].password_hash || '';
    const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(stored);
    const matches = isBcrypt ? await bcrypt.compare(currentPassword, stored) : stored === currentPassword;

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [newHash, userId]
    );

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể đổi mật khẩu lúc này.'
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword
};
