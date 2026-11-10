const { pool, isDbConnected } = require('../config/db');

const adminMiddleware = async (req, res, next) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau.'
    });
  }

  const userId = Number(req.user?.userId);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({
      success: false,
      message: 'Thông tin xác thực không hợp lệ.'
    });
  }

  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ tài khoản Quản trị viên mới có quyền truy cập chức năng này.'
    });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, role, status
       FROM users
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản quản trị không tồn tại.'
      });
    }

    const dbUser = result.rows[0];
    if (dbUser.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản quản trị hiện đang bị khóa.'
      });
    }

    if (dbUser.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không còn quyền Quản trị viên.'
      });
    }

    req.adminUser = {
      userId: Number(dbUser.user_id),
      role: dbUser.role
    };
    next();
  } catch (error) {
    console.error('Lỗi kiểm tra quyền ADMIN:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể xác minh quyền quản trị.'
    });
  }
};

module.exports = adminMiddleware;

