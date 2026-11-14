const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const { pool, isDbConnected } = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');

// JWT chỉ được phát hành cho tài khoản tồn tại trong PostgreSQL.
function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET chưa được cấu hình');
  return jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

function databaseUnavailable(res) {
  return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau.' });
}

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
  const { emailOrPhone, forReset } = req.body;

  if (!emailOrPhone || !emailOrPhone.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp Số điện thoại hoặc Email để nhận mã OTP!'
    });
  }

  const cleanTarget = emailOrPhone.trim().toLowerCase();

  // Nếu gửi OTP để quên mật khẩu -> Kiểm tra tài khoản có tồn tại trong PostgreSQL không
  if (forReset && isDbConnected()) {
    try {
      const userCheck = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = $1 OR phone = $2',
        [cleanTarget, cleanTarget]
      );
      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản nào khớp với Email hoặc Số điện thoại này!'
        });
      }
    } catch (dbErr) {
      console.error('Lỗi kiểm tra user khi gửi OTP:', dbErr);
    }
  }
  
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
      await sendOtpEmail(cleanTarget, generatedOtp, forReset ? 'reset' : 'register');
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
      expiresInSeconds: 300,
      previewOtp: !emailSentReal ? generatedOtp : undefined
    }
  });
});

// ==========================================
// 1b. API ĐẶT LẠI MẬT KHẨU (RESET PASSWORD)
// POST /api/auth/reset-password
// ==========================================
router.post('/reset-password', async (req, res) => {
  const { emailOrPhone, otp, newPassword } = req.body || {};

  if (!emailOrPhone || !emailOrPhone.trim() || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ: Email/Số điện thoại, Mã OTP và Mật khẩu mới!'
    });
  }

  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Mật khẩu mới phải có tối thiểu 6 ký tự!'
    });
  }

  // 1. Kiểm tra và sử dụng mã OTP
  const otpResult = checkAndConsumeOtp(emailOrPhone, otp);
  if (!otpResult.valid) {
    return res.status(400).json({
      success: false,
      message: otpResult.message
    });
  }

  if (!isDbConnected()) return databaseUnavailable(res);

  try {
    const cleanTarget = emailOrPhone.trim().toLowerCase();
    const userCheck = await pool.query(
      'SELECT user_id, email, phone, full_name FROM users WHERE LOWER(email) = $1 OR phone = $2',
      [cleanTarget, cleanTarget]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản với Email hoặc Số điện thoại này!'
      });
    }

    const user = userCheck.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2',
      [hashedPassword, user.user_id]
    );

    console.log(`🔐 [RESET PASSWORD] Đặt lại mật khẩu thành công cho user: ${user.user_id} (${user.email || user.phone})`);

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.'
    });
  } catch (err) {
    console.error('Lỗi reset-password PostgreSQL:', err);
    return res.status(500).json({
      success: false,
      message: 'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.'
    });
  }
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

  // 2. Chỉ lưu tài khoản thật trong PostgreSQL
  if (!isDbConnected()) return databaseUnavailable(res);
  {
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

      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, status)
         VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE') RETURNING *`,
        [fullName.trim(), email, hashedPassword, phone]
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
          token: signToken(newUser)
        }
      });
    } catch (err) {
      console.error('Lỗi register PostgreSQL:', err);
      return res.status(500).json({ success: false, message: 'Không thể đăng ký tài khoản.' });
    }
  }

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
    sportTypeId,
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

  // 2. Chỉ lưu vào PostgreSQL
  if (!isDbConnected()) return databaseUnavailable(res);
  {
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

      const hashedPassword = await bcrypt.hash(password, 12);
      // Tạo user với role OWNER
      const userRes = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, status)
         VALUES ($1, $2, $3, $4, 'OWNER', 'ACTIVE') RETURNING *`,
        [representativeName.trim(), cleanEmail, hashedPassword, cleanPhone]
      );
      const newOwner = userRes.rows[0];

      // Tạo hồ sơ chủ sân trong owner_profiles
      await pool.query(
        `INSERT INTO owner_profiles (owner_id, business_name)
         VALUES ($1, $2)
         ON CONFLICT (owner_id) DO NOTHING`,
        [newOwner.user_id, facilityName.trim()]
      );

      // Xác định bộ môn thể thao thực tế từ DB
      let resolvedSportTypeId = Number(sportTypeId);
      if (Number.isSafeInteger(resolvedSportTypeId) && resolvedSportTypeId > 0) {
        const spCheck = await pool.query(
          `SELECT sport_type_id FROM sport_types WHERE sport_type_id = $1 AND status = 'ACTIVE'`,
          [resolvedSportTypeId]
        );
        if (spCheck.rowCount === 0) resolvedSportTypeId = null;
      } else {
        resolvedSportTypeId = null;
      }

      if (!resolvedSportTypeId) {
        const firstSport = await pool.query(
          `SELECT sport_type_id FROM sport_types WHERE status = 'ACTIVE' ORDER BY sport_type_id ASC LIMIT 1`
        );
        if (firstSport.rowCount === 0) {
          return res.status(400).json({ success: false, message: 'Chưa có bộ môn thể thao nào khả dụng.' });
        }
        resolvedSportTypeId = Number(firstSport.rows[0].sport_type_id);
      }

      // Tạo cụm sân chờ duyệt trong bảng courts
      await pool.query(
        `INSERT INTO courts (sport_type_id, owner_id, name, address, area, description, price_per_slot, operational_status, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'INACTIVE', FALSE)`,
        [
          resolvedSportTypeId,
          newOwner.user_id,
          facilityName.trim(),
          fullAddress,
          city && city.trim() ? city.trim() : null,
          description ? description.trim() : (Array.isArray(sportTypes) ? sportTypes.filter(Boolean).join(', ') : null),
          0
        ]
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
          token: signToken(newOwner)
        }
      });
    } catch (err) {
      console.error('Lỗi register-owner PostgreSQL:', err);
      return res.status(500).json({ success: false, message: 'Không thể đăng ký chủ sân.' });
    }
  }

});

// ==========================================
// 5. API ĐĂNG NHẬP (LOGIN)
// POST /api/auth/login
// ==========================================
router.post('/login', async (req, res) => {
  const { emailOrPhone, password } = req.body || {};
  if (typeof emailOrPhone !== 'string' || !emailOrPhone.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập Email / Số điện thoại và Mật khẩu!' });
  }
  if (!isDbConnected()) return databaseUnavailable(res);
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.password_hash, u.role, u.status, op.business_name
       FROM users u LEFT JOIN owner_profiles op ON u.user_id = op.owner_id
       WHERE LOWER(u.email) = $1 OR u.phone = $1 LIMIT 1`,
      [emailOrPhone.trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' });

    const stored = user.password_hash || '';
    const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(stored);
    const valid = isBcrypt ? await bcrypt.compare(password, stored) : stored === password;
    if (!valid) return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác.' });
    if (user.status !== 'ACTIVE') return res.status(403).json({ success: false, message: 'Tài khoản hiện không hoạt động.' });

    // Chuyển mật khẩu cũ dạng rõ sang bcrypt sau lần đăng nhập hợp lệ đầu tiên.
    if (!isBcrypt) {
      const hashed = await bcrypt.hash(password, 12);
      await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2 AND password_hash = $3',
        [hashed, user.user_id, stored]);
    }

    return res.json({
      success: true,
      source: 'PostgreSQL Database',
      message: 'Đăng nhập thành công!',
      data: {
        id: user.user_id, fullName: user.full_name, email: user.email,
        phone: user.phone, role: user.role, facilityName: user.business_name || null,
        token: signToken(user)
      }
    });
  } catch (err) {
    console.error('Lỗi login PostgreSQL:', err);
    return res.status(500).json({ success: false, message: 'Không thể đăng nhập lúc này.' });
  }
});

// GET /api/auth/me: chỉ trả về tài khoản được xác thực bằng JWT.
router.get('/me', authMiddleware, async (req, res) => {
  if (!isDbConnected()) return databaseUnavailable(res);
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, op.business_name
       FROM users u LEFT JOIN owner_profiles op ON u.user_id = op.owner_id
       WHERE u.user_id = $1`, [req.user.userId]);
    const user = result.rows[0];
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Tài khoản không còn hợp lệ.' });
    }
    return res.json({ success: true, data: {
      id: user.user_id, fullName: user.full_name, email: user.email,
      phone: user.phone, role: user.role, facilityName: user.business_name || null
    }});
  } catch (err) {
    console.error('Lỗi /auth/me:', err);
    return res.status(500).json({ success: false, message: 'Không thể tải thông tin tài khoản.' });
  }
});

module.exports = router;
