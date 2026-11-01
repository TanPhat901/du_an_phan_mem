const express = require('express');
const router = express.Router();
const { pool, isDbConnected } = require('../config/db');

// In-memory store for fallback
let fallbackUsers = [
  {
    id: 5,
    fullName: 'Nguyễn Văn An',
    emailOrPhone: 'an.nguyen@example.com',
    password: 'password123',
    role: 'USER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  }
];

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập số điện thoại/email và mật khẩu!'
    });
  }

  const cleanInput = emailOrPhone.toLowerCase().trim();

  // 1. Check PostgreSQL
  if (isDbConnected()) {
    try {
      const result = await pool.query(
        `SELECT * FROM users 
         WHERE (LOWER(email) = $1 OR phone = $1) AND password_hash = $2`,
        [cleanInput, password]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        return res.json({
          success: true,
          source: 'PostgreSQL Database',
          message: 'Đăng nhập thành công!',
          data: {
            id: user.user_id,
            fullName: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            token: `jwt-token-${user.user_id}`
          }
        });
      }
    } catch (err) {
      console.warn('⚠️ Lỗi login PostgreSQL:', err.message);
    }
  }

  // 2. Fallback
  const user = fallbackUsers.find(
    u => u.emailOrPhone.toLowerCase() === cleanInput && u.password === password
  );

  if (user) {
    return res.json({
      success: true,
      source: 'Memory Fallback',
      message: 'Đăng nhập thành công!',
      data: {
        id: user.id,
        fullName: user.fullName,
        emailOrPhone: user.emailOrPhone,
        avatar: user.avatar,
        token: `mock-jwt-token-${user.id}`
      }
    });
  }

  // Accept demo login if password >= 6 chars
  if (password.length >= 6) {
    const demoUser = {
      id: Date.now(),
      fullName: cleanInput.includes('@') ? cleanInput.split('@')[0] : 'Người dùng SportsBooking',
      emailOrPhone: cleanInput,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      token: `mock-jwt-token-demo`
    };
    return res.json({
      success: true,
      source: 'Demo Auth',
      message: 'Đăng nhập thành công!',
      data: demoUser
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Tài khoản hoặc mật khẩu không chính xác.'
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { fullName, emailOrPhone, password } = req.body;

  if (!fullName || !emailOrPhone || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ: Họ và tên, Số điện thoại/Email và Mật khẩu!'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có tối thiểu 6 ký tự!'
    });
  }

  const cleanInput = emailOrPhone.toLowerCase().trim();
  const isEmail = cleanInput.includes('@');
  const email = isEmail ? cleanInput : `${cleanInput}@user.sportsbooking.vn`;
  const phone = isEmail ? null : cleanInput;

  // 1. Check & Insert PostgreSQL
  if (isDbConnected()) {
    try {
      const existing = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = $1 OR phone = $2',
        [email, phone || '']
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản với Email hoặc SĐT này đã tồn tại!'
        });
      }

      const result = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, status)
         VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE') RETURNING *`,
        [fullName.trim(), email, password, phone]
      );

      const newUser = result.rows[0];
      return res.status(201).json({
        success: true,
        source: 'PostgreSQL Database',
        message: 'Đăng ký tài khoản thành công!',
        data: {
          id: newUser.user_id,
          fullName: newUser.full_name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
          token: `jwt-token-${newUser.user_id}`
        }
      });
    } catch (err) {
      console.warn('⚠️ Lỗi register PostgreSQL:', err.message);
    }
  }

  // 2. Fallback
  const existing = fallbackUsers.find(u => u.emailOrPhone.toLowerCase() === cleanInput);
  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Tài khoản với Email hoặc SĐT này đã tồn tại!'
    });
  }

  const newUser = {
    id: Date.now(),
    fullName,
    emailOrPhone: cleanInput,
    password,
    role: 'USER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  };

  fallbackUsers.push(newUser);

  res.status(201).json({
    success: true,
    source: 'Memory Fallback',
    message: 'Đăng ký tài khoản thành công!',
    data: {
      id: newUser.id,
      fullName: newUser.fullName,
      emailOrPhone: newUser.emailOrPhone,
      avatar: newUser.avatar,
      token: `mock-jwt-token-${newUser.id}`
    }
  });
});

// POST /api/auth/register-owner - Đăng ký tài khoản Chủ sân
router.post('/register-owner', async (req, res) => {
  const {
    email,
    password,
    representativeName,
    phone,
    facilityName,
    sportTypes,
    city,
    district,
    detailedAddress,
    description
  } = req.body;

  if (!email || !password || !representativeName || !phone || !facilityName) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)'
    });
  }

  const cleanEmail = email.toLowerCase().trim();
  const fullAddress = `${detailedAddress || ''}, ${district || ''}, ${city || ''}`.replace(/^,\s*|,\s*$/g, '');

  // 1. PostgreSQL Registration
  if (isDbConnected()) {
    try {
      const existing = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = $1 OR phone = $2',
        [cleanEmail, phone]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản với Email hoặc Số điện thoại này đã tồn tại!'
        });
      }

      // Insert User with role OWNER
      const userRes = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, status)
         VALUES ($1, $2, $3, $4, 'OWNER', 'ACTIVE') RETURNING *`,
        [representativeName.trim(), cleanEmail, password, phone]
      );
      const newOwner = userRes.rows[0];

      // Insert Owner Profile
      await pool.query(
        `INSERT INTO owner_profiles (owner_id, business_name)
         VALUES ($1, $2)
         ON CONFLICT (owner_id) DO NOTHING`,
        [newOwner.user_id, facilityName.trim()]
      );

      // Insert pending Court (Waiting for Admin approval)
      await pool.query(
        `INSERT INTO courts (sport_type_id, owner_id, name, address, area, description, price_per_slot, operational_status, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'INACTIVE', FALSE)`,
        [1, newOwner.user_id, facilityName.trim(), fullAddress, city || 'TP. Hồ Chí Minh', description || (Array.isArray(sportTypes) ? sportTypes.join(', ') : ''), 300000]
      );

      return res.status(201).json({
        success: true,
        source: 'PostgreSQL Database',
        message: 'Đăng ký hồ sơ Chủ sân thành công! Ban quản trị sẽ kiểm duyệt trong 2-4 giờ làm việc.',
        data: {
          id: newOwner.user_id,
          fullName: newOwner.full_name,
          email: newOwner.email,
          phone: newOwner.phone,
          role: 'OWNER',
          facilityName,
          token: `owner-jwt-token-${newOwner.user_id}`
        }
      });
    } catch (err) {
      console.warn('⚠️ Lỗi register-owner PostgreSQL:', err.message);
    }
  }

  // 2. Fallback
  const newOwnerFallback = {
    id: Date.now(),
    fullName: representativeName,
    emailOrPhone: cleanEmail,
    phone,
    role: 'OWNER',
    facilityName,
    createdAt: new Date().toISOString()
  };

  fallbackUsers.push(newOwnerFallback);

  res.status(201).json({
    success: true,
    source: 'Memory Fallback',
    message: 'Đăng ký hồ sơ Chủ sân thành công! Ban quản trị sẽ kiểm duyệt trong 2-4 giờ làm việc.',
    data: newOwnerFallback
  });
});

module.exports = router;
