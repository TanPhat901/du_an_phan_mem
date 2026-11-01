const express = require('express');
const router = express.Router();

// Mock in-memory user database
let users = [
  {
    id: 'USR-001',
    fullName: 'Nguyễn Văn An',
    emailOrPhone: 'an.nguyen@example.com',
    password: 'password123',
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  }
];

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập số điện thoại/email và mật khẩu!'
    });
  }

  // Find user (or accept test account if password matches)
  const user = users.find(
    u => u.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase() && u.password === password
  );

  if (user) {
    return res.json({
      success: true,
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

  // Allow flexible demo login if valid formatted input
  if (password.length >= 6) {
    const demoUser = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      fullName: emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'Người dùng SportsBooking',
      emailOrPhone,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      token: `mock-jwt-token-demo`
    };
    return res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: demoUser
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Mật khẩu phải từ 6 ký tự trở lên hoặc tài khoản không chính xác.'
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
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

  const existing = users.find(u => u.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase());
  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Tài khoản với Email hoặc SĐT này đã tồn tại!'
    });
  }

  const newUser = {
    id: `USR-${Date.now().toString().slice(-4)}`,
    fullName,
    emailOrPhone,
    password,
    role: 'customer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  res.status(201).json({
    success: true,
    message: 'Đăng ký tài khoản thành công! Bạn có thể sử dụng ngay lập tức.',
    data: {
      id: newUser.id,
      fullName: newUser.fullName,
      emailOrPhone: newUser.emailOrPhone,
      avatar: newUser.avatar,
      token: `mock-jwt-token-${newUser.id}`
    }
  });
});

module.exports = router;

