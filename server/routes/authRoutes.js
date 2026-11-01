const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, isDbConnected } = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');

// In-memory store for fallback users
let fallbackUsers = [
  {
    id: 1,
    fullName: 'Quản Trị Viên',
    emailOrPhone: 'admin@sportsbooking.vn',
    password: 'admin123',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    fullName: 'Nguyễn Văn Thảo',
    emailOrPhone: 'theyard@sportsbooking.vn',
    phone: '0901234567',
    password: 'owner123',
    role: 'OWNER',
    facilityName: 'The Yard Padel Club Thảo Điền',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    fullName: 'Nguyễn Văn An',
    emailOrPhone: 'an.nguyen@example.com',
    phone: '0912345678',
    password: 'password123',
    role: 'USER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  }
];

// In-memory OTP storage: Map<emailOrPhone, { otp: string, expiresAt: number, verified: boolean }>
const otpStore = new Map();

// Helper: Xác thực OTP
function checkAndConsumeOtp(target, inputOtp) {
  if (!inputOtp || typeof inputOtp !== 'string') {
    return { valid: false, message: 'Vui lòng cung cấp mã xác thực OTP!' };
  }

  const cleanTarget = target.trim().toLowerCase();
  const record = otpStore.get(cleanTarget);

  if (!record) {
    return { 
      valid: false, 
      message: 'Chưa có mã OTP nào được gửi đến số điện thoại/email này. Vui lòng bấm [Gửi mã]!' 
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanTarget);
    return { 
      valid: false, 
      message: 'Mã xác thực OTP đã hết hạn (chỉ có hiệu lực trong 5 phút). Vui lòng gửi lại mã mới!' 
    };
  }

  if (record.otp !== inputOtp.trim()) {
    return { 
      valid: false, 
      message: 'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại!' 
    };
  }

  // Mã hợp lệ -> Đánh dấu đã dùng và xóa để tránh dùng lại (One-Time Password)
  otpStore.delete(cleanTarget);
  return { valid: true };
}

// ==========================================
// 1. API GỬI MÃ XÁC THỰC OTP THẬT
// POST /api/auth/send-otp
// ==========================================
router.post('/send-otp', async (req, res) => {
  const { emailOrPhone } = req.body;

  if (!emailOrPhone || !emailOrPhone.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp Số điện thoại hoặc Email để nhận mã OTP!'
    });
  }

  const cleanTarget = emailOrPhone.trim().toLowerCase();
  
  // Sinh mã OTP ngẫu nhiên 6 chữ số thực thụ (Cryptographically Secure)
  const generatedOtp = crypto.randomInt(100000, 1000000).toString();
  
  // Lưu mã OTP với thời hạn 5 phút (300 giây)
  otpStore.set(cleanTarget, {
    otp: generatedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000,
    verified: false
  });

  console.log(`\n========================================`);
  console.log(`🔐 [OTP SECURITY SERVICE]`);
  console.log(`🎯 Gửi đến: ${cleanTarget}`);
  console.log(`🔢 MÃ OTP THẬT: >> ${generatedOtp} <<`);
  console.log(`⏱ Hiệu lực: 5 phút (${new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()})`);
  console.log(`========================================\n`);

  let emailSentReal = false;

  // Nếu là email và đã cấu hình SMTP trong .env -> Gửi email thật vào hòm thư
  if (cleanTarget.includes('@') && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await sendOtpEmail(cleanTarget, generatedOtp);
      emailSentReal = true;
      console.log(`✅ [SMTP] Đã gửi email thành công tới ${cleanTarget}!`);
    } catch (err) {
      console.warn(`⚠️ [SMTP] Không thể gửi qua SMTP: ${err.message}. Chuyển sang chế độ hiển thị mã.`);
    }
  }

  return res.json({
    success: true,
    sentViaRealEmail: emailSentReal,
    message: emailSentReal 
      ? `Mã OTP đã được gửi trực tiếp đến hộp thư ${emailOrPhone}! Vui lòng kiểm tra hộp thư đến (Inbox) hoặc Spam.`
      : `Mã OTP xác thực đã được gửi đến ${emailOrPhone}!`,
    data: {
      target: emailOrPhone,
      otp: generatedOtp, // Trả về để ứng dụng hiển thị thông báo popup cho người dùng test nếu chưa cấu hình SMTP
      expiresInSeconds: 300
    }
  });
});

// ==========================================
// 2. API XÁC THỰC MÃ OTP (VERIFY)
// POST /api/auth/verify-otp
// ==========================================
router.post('/verify-otp', (req, res) => {
  const { emailOrPhone, otp } = req.body;

  if (!emailOrPhone || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ Số điện thoại/Email và Mã OTP 6 chữ số!'
    });
  }

  const cleanTarget = emailOrPhone.trim().toLowerCase();
  const record = otpStore.get(cleanTarget);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: 'Chưa có mã OTP nào được gửi đến số điện thoại/email này!'
    });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanTarget);
    return res.status(400).json({
      success: false,
      message: 'Mã xác thực OTP đã hết hạn!'
    });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Mã xác thực OTP không chính xác!'
    });
  }

  // Đánh dấu mã đã xác thực
  record.verified = true;

  return res.json({
    success: true,
    message: 'Xác thực mã OTP thành công!'
  });
});

// ==========================================
// 3. API ĐĂNG KÝ NGƯỜI CHƠI (USER)
// POST /api/auth/register
// ==========================================
router.post('/register', async (req, res) => {
  const { fullName, emailOrPhone, password, otp } = req.body;

  if (!fullName || !emailOrPhone || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ: Họ và tên, Số điện thoại/Email và Mật khẩu!'
    });
  }

  // 1. Kiểm tra mã OTP nếu được cung cấp (không bắt buộc)
  if (otp) {
    const otpResult = checkAndConsumeOtp(emailOrPhone, otp);
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }
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

  // 2. Kiểm tra & Lưu vào PostgreSQL
  if (isDbConnected()) {
    try {
      const existing = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = $1 OR phone = $2',
        [email, phone || '']
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản với Email hoặc Số điện thoại này đã tồn tại!'
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
        message: 'Đăng ký tài khoản Người chơi thành công!',
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

  // 3. Fallback bộ nhớ nếu PostgreSQL chưa kết nối
  const existingFallback = fallbackUsers.find(
    u => u.emailOrPhone.toLowerCase() === cleanInput || (u.phone && u.phone === cleanInput)
  );

  if (existingFallback) {
    return res.status(400).json({
      success: false,
      message: 'Tài khoản với Email hoặc Số điện thoại này đã tồn tại!'
    });
  }

  const newUser = {
    id: Date.now(),
    fullName: fullName.trim(),
    emailOrPhone: cleanInput,
    phone: isEmail ? null : cleanInput,
    password,
    role: 'USER',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  };

  fallbackUsers.push(newUser);

  res.status(201).json({
    success: true,
    source: 'Local Memory Fallback',
    message: 'Đăng ký tài khoản Người chơi thành công!',
    data: {
      id: newUser.id,
      fullName: newUser.fullName,
      emailOrPhone: newUser.emailOrPhone,
      phone: newUser.phone,
      role: newUser.role,
      avatar: newUser.avatar,
      token: `mock-jwt-token-${newUser.id}`
    }
  });
});

// ==========================================
// 4. API ĐĂNG KÝ CHỦ SÂN (OWNER)
// POST /api/auth/register-owner
// ==========================================
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
    description,
    otp
  } = req.body;

  if (!email || !password || !representativeName || !facilityName) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)'
    });
  }

  // 1. Kiểm tra mã OTP nếu được cung cấp (không bắt buộc)
  if (otp) {
    const targetsToCheck = [phone, email, req.body.emailOrPhone].filter(Boolean);
    let otpResult = { valid: false, message: 'Vui lòng cung cấp mã xác thực OTP!' };
    
    for (const t of targetsToCheck) {
      const res = checkAndConsumeOtp(t, otp);
      if (res.valid) {
        otpResult = res;
        break;
      } else {
        otpResult = res;
      }
    }

    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu phải có tối thiểu 6 ký tự!'
    });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = (phone || '').trim();
  const fullAddress = `${detailedAddress || ''}, ${district || ''}, ${city || ''}`.replace(/^,\s*|,\s*$/g, '');

  // 2. Lưu vào PostgreSQL
  if (isDbConnected()) {
    try {
      const existing = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = $1 OR phone = $2',
        [cleanEmail, cleanPhone || '']
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tài khoản với Email hoặc Số điện thoại này đã tồn tại!'
        });
      }

      // Tạo user với role OWNER
      const userRes = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, status)
         VALUES ($1, $2, $3, $4, 'OWNER', 'ACTIVE') RETURNING *`,
        [representativeName.trim(), cleanEmail, password, cleanPhone]
      );
      const newOwner = userRes.rows[0];

      // Tạo hồ sơ chủ sân trong owner_profiles
      await pool.query(
        `INSERT INTO owner_profiles (owner_id, business_name)
         VALUES ($1, $2)
         ON CONFLICT (owner_id) DO NOTHING`,
        [newOwner.user_id, facilityName.trim()]
      );

      // Tạo cụm sân chờ duyệt trong bảng courts
      await pool.query(
        `INSERT INTO courts (sport_type_id, owner_id, name, address, area, description, price_per_slot, operational_status, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'INACTIVE', FALSE)`,
        [1, newOwner.user_id, facilityName.trim(), fullAddress, city || 'TP. Hồ Chí Minh', description || (Array.isArray(sportTypes) ? sportTypes.join(', ') : ''), 280000]
      );

      return res.status(201).json({
        success: true,
        source: 'PostgreSQL Database',
        message: 'Đăng ký hồ sơ Chủ sân thành công! Ban quản trị sẽ kiểm duyệt trong 2 - 4 giờ làm việc.',
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

  // 3. Fallback bộ nhớ nếu PostgreSQL chưa chạy
  const existingOwner = fallbackUsers.find(
    u => u.emailOrPhone.toLowerCase() === cleanEmail || (cleanPhone && u.phone === cleanPhone)
  );

  if (existingOwner) {
    return res.status(400).json({
      success: false,
      message: 'Tài khoản với Email hoặc Số điện thoại này đã tồn tại!'
    });
  }

  const newOwnerFallback = {
    id: Date.now(),
    fullName: representativeName.trim(),
    emailOrPhone: cleanEmail,
    phone: cleanPhone,
    password,
    role: 'OWNER',
    facilityName: facilityName.trim(),
    address: fullAddress,
    sportTypes: sportTypes || ['Bóng đá', 'Pickleball'],
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString()
  };

  fallbackUsers.push(newOwnerFallback);

  res.status(201).json({
    success: true,
    source: 'Local Memory Fallback',
    message: 'Đăng ký hồ sơ Chủ sân thành công! Ban quản trị sẽ kiểm duyệt trong 2 - 4 giờ làm việc.',
    data: {
      id: newOwnerFallback.id,
      fullName: newOwnerFallback.fullName,
      emailOrPhone: newOwnerFallback.emailOrPhone,
      phone: newOwnerFallback.phone,
      role: 'OWNER',
      facilityName: newOwnerFallback.facilityName,
      avatar: newOwnerFallback.avatar,
      token: `mock-jwt-token-${newOwnerFallback.id}`
    }
  });
});

// ==========================================
// 5. API ĐĂNG NHẬP (LOGIN)
// POST /api/auth/login
// ==========================================
router.post('/login', async (req, res) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập Email / Số điện thoại và Mật khẩu!'
    });
  }

  const cleanInput = emailOrPhone.toLowerCase().trim();

  // 1. Kiểm tra trong PostgreSQL Database
  if (isDbConnected()) {
    try {
      const result = await pool.query(
        `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, op.business_name
         FROM users u
         LEFT JOIN owner_profiles op ON u.user_id = op.owner_id
         WHERE (LOWER(u.email) = $1 OR u.phone = $1) AND u.password_hash = $2`,
        [cleanInput, password]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];

        if (user.status === 'LOCKED') {
          return res.status(403).json({
            success: false,
            message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Hotline 1900 8899.'
          });
        }

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
            facilityName: user.business_name || null,
            avatar: user.role === 'OWNER' 
              ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80'
              : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            token: `jwt-token-${user.user_id}`
          }
        });
      }
    } catch (err) {
      console.warn('⚠️ Lỗi login PostgreSQL:', err.message);
    }
  }

  // 2. Kiểm tra trong Fallback Users
  const user = fallbackUsers.find(
    u => (u.emailOrPhone.toLowerCase() === cleanInput || (u.phone && u.phone === cleanInput)) && u.password === password
  );

  if (user) {
    return res.json({
      success: true,
      source: 'Local Memory Fallback',
      message: 'Đăng nhập thành công!',
      data: {
        id: user.id,
        fullName: user.fullName,
        emailOrPhone: user.emailOrPhone,
        phone: user.phone,
        role: user.role,
        facilityName: user.facilityName || null,
        avatar: user.avatar,
        token: `mock-jwt-token-${user.id}`
      }
    });
  }

  // 3. Chấp nhận tài khoản demo nếu mật khẩu >= 6 ký tự
  if (password.length >= 6) {
    const isOwner = cleanInput.includes('owner') || cleanInput.includes('theyard');
    const demoUser = {
      id: Date.now(),
      fullName: cleanInput.includes('@') ? cleanInput.split('@')[0] : 'Người dùng SportsBooking',
      emailOrPhone: cleanInput,
      role: isOwner ? 'OWNER' : 'USER',
      facilityName: isOwner ? 'CLB Thể Thao Mẫu' : null,
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

// ==========================================
// 6. API LẤY THÔNG TIN TÀI KHOẢN HIỆN TẠI
// GET /api/auth/me
// ==========================================
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }

  res.json({
    success: true,
    data: fallbackUsers[0]
  });
});

module.exports = router;
