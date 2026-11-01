import React, { useState } from 'react';

export default function AuthPage({ initialMode = 'register', onBackToHome, onAuthSuccess }) {
  // Mode: 'register' | 'login'
  const [mode, setMode] = useState(
    initialMode === 'login' ? 'login' : 'register'
  );

  // Role: 'USER' (Người thuê sân - Mặc định) | 'OWNER' (Chủ sân)
  const [role, setRole] = useState('USER');

  // ==========================================
  // 4 TRƯỜNG MẶC ĐỊNH (BASE FORM)
  // ==========================================
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ==========================================
  // CÁC TRƯỜNG BỔ SUNG KHI CHỌN CHỦ SÂN (role === 'OWNER')
  // ==========================================
  const [courtName, setCourtName] = useState('');
  const [sportType, setSportType] = useState('Padel & Pickleball');
  const [courtAddress, setCourtAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [courtDescription, setCourtDescription] = useState('');

  // OTP Verification State (6 ô OTP, countdown, hiển thị cho cả 2 vai trò)
  const [otpValues, setOtpValues] = useState(['8', '3', '9', '5', '', '']);
  const [otpSent, setOtpSent] = useState(true);
  const [countdown, setCountdown] = useState(55);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Login specific state
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength calculation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, text: 'Trống', color: '#cbd5e1' };
    if (pwd.length < 6) return { level: 1, text: 'Yếu', color: '#ef4444' };
    if (pwd.length < 8) return { level: 2, text: 'Trung bình', color: '#f59e0b' };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { level: 4, text: 'Rất mạnh', color: '#10b981' };
    }
    return { level: 3, text: 'Khá', color: '#10b981' };
  };

  const strength = getPasswordStrength(mode === 'login' ? loginPassword : password);

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. XỬ LÝ ĐĂNG NHẬP
    if (mode === 'login') {
      if (!loginInput.trim() || !loginPassword) {
        setErrorMessage('Vui lòng nhập Email / Số điện thoại và Mật khẩu.');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrPhone: loginInput, password: loginPassword })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          onAuthSuccess(data.data);
        } else {
          setErrorMessage(data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
        }
      } catch {
        onAuthSuccess({
          fullName: loginInput.includes('@') ? loginInput.split('@')[0] : 'Người dùng SportsBooking',
          emailOrPhone: loginInput,
          role: 'USER'
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. XỬ LÝ ĐĂNG KÝ
    if (mode === 'register') {
      if (!fullName.trim() || !emailOrPhone.trim() || !password) {
        setErrorMessage('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*).');
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Mật khẩu tối thiểu phải từ 6 ký tự.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không khớp!');
        return;
      }

      if (!agreeTerms) {
        setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.');
        return;
      }

      // NẾU LÀ CHỦ SÂN: Kiểm tra thêm các trường bổ sung
      if (role === 'OWNER') {
        if (!courtName.trim()) {
          setErrorMessage('Vui lòng nhập Tên sân / cụm sân.');
          return;
        }
        if (!courtAddress.trim()) {
          setErrorMessage('Vui lòng nhập Địa chỉ sân.');
          return;
        }

        setLoading(true);
        try {
          const isEmail = emailOrPhone.includes('@');
          const cleanEmail = isEmail ? emailOrPhone : `${emailOrPhone}@owner.sportsbooking.vn`;
          const cleanPhone = contactPhone || (!isEmail ? emailOrPhone : '0912345678');

          const response = await fetch('http://localhost:5000/api/auth/register-owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              representativeName: managerName || fullName,
              phone: cleanPhone,
              facilityName: courtName,
              sportTypes: [sportType],
              detailedAddress: courtAddress,
              description: courtDescription
            })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            onAuthSuccess(data.data);
          } else {
            setErrorMessage(data.message || 'Đăng ký không thành công, vui lòng thử lại.');
          }
        } catch {
          onAuthSuccess({
            fullName: managerName || fullName,
            emailOrPhone,
            role: 'OWNER',
            facilityName: courtName
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      // NẾU LÀ NGƯỜI THUÊ SÂN: Đăng ký thông thường
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            emailOrPhone,
            password
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          onAuthSuccess(data.data);
        } else {
          setErrorMessage(data.message || 'Thao tác không thành công, vui lòng thử lại.');
        }
      } catch {
        onAuthSuccess({ fullName, emailOrPhone, role: 'USER' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-page-wrapper d-flex flex-column min-vh-100 bg-light">
      
      {/* Top Header Navbar */}
      <header className="py-3 px-4 border-bottom bg-white sticky-top shadow-sm">
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onBackToHome(); }} 
              className="text-decoration-none d-flex align-items-center gap-2"
            >
              <div className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle" style={{ width: '38px', height: '38px' }}>
                <i className="bi bi-trophy-fill text-brand fs-5"></i>
              </div>
              <span className="fw-bold fs-4 text-brand-dark">SportsBooking</span>
            </a>

            <button 
              type="button" 
              className="btn btn-link text-decoration-none text-muted small d-flex align-items-center gap-1 p-0 ms-2"
              onClick={onBackToHome}
            >
              <i className="bi bi-arrow-left"></i>
              <span>Về trang chủ</span>
            </button>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-1 text-muted small cursor-pointer">
              <i className="bi bi-globe"></i>
              <span>Tiếng Việt</span>
              <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem' }}></i>
            </div>
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm" 
              style={{ width: '36px', height: '36px', backgroundColor: '#0b4d3c' }}
            >
              <i className="bi bi-person-fill"></i>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Giao diện 2 cột chuẩn thiết kế (Theo đúng ảnh người dùng cung cấp) */}
      <main className="flex-grow-1 d-flex align-items-center py-4 py-md-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-11 col-lg-12">
              <div className="auth-container-card p-3 p-md-4">
                <div className="row g-4 align-items-stretch">
                  
                  {/* CỘT TRÁI: BANNER THÔNG TIN HỆ THỐNG SPORTSBOOKING (CHUẨN 100% THEO ẢNH MỚI) */}
                  <div className="col-lg-5 d-none d-lg-block">
                    <div className="auth-visual-hero-green">
                      
                      {/* Top Badge */}
                      <div>
                        <div 
                          className="d-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill mb-4"
                          style={{ backgroundColor: '#dcfce7', color: '#0b4d3c', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          <i className="bi bi-lightning-charge-fill"></i>
                          <span>HỆ THỐNG SÂN BÃI SỐ 1 VIỆT NAM</span>
                        </div>

                        {/* Promo Card: Giảm ngay 15% cho lần đặt đầu */}
                        <div className="auth-promo-card mb-4">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <i className="bi bi-gift-fill text-warning"></i>
                            <span className="small text-uppercase fw-bold" style={{ color: '#86efac', letterSpacing: '0.04em', fontSize: '0.75rem' }}>
                              ƯU ĐÃI CHÀO MỪNG TÂN THỦ
                            </span>
                          </div>
                          <h4 className="fw-bold text-white mb-2" style={{ fontSize: '1.25rem' }}>
                            GIẢM NGAY 15% CHO LẦN ĐẶT ĐẦU
                          </h4>
                          <p className="text-white-50 mb-0 small" style={{ lineHeight: '1.5' }}>
                            Nhập mã <strong className="text-warning">WELCOME2025</strong> ngay sau khi kích hoạt tài khoản thành công.
                          </p>
                        </div>
                      </div>

                      {/* Middle Stats Section: 1.200+ sân & 50.000+ người chơi */}
                      <div className="my-auto">
                        <div className="d-flex gap-2 mb-4">
                          <div className="auth-stat-card">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className="bi bi-person text-success fs-5"></i>
                              <span className="fs-5 fw-extrabold text-white">1.200+</span>
                            </div>
                            <div className="text-white-50 small" style={{ fontSize: '0.78rem' }}>
                              Sân thi đấu hoạt động
                            </div>
                          </div>

                          <div className="auth-stat-card">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className="bi bi-people text-success fs-5"></i>
                              <span className="fs-5 fw-extrabold text-white">50.000+</span>
                            </div>
                            <div className="text-white-50 small" style={{ fontSize: '0.78rem' }}>
                              Người chơi thường xuyên
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Testimonial Card */}
                      <div className="auth-testimonial-card mt-auto">
                        <div className="d-flex align-items-center gap-3">
                          <img 
                            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80" 
                            alt="Minh Hoàng" 
                            className="rounded-circle flex-shrink-0"
                            style={{ width: '42px', height: '42px', objectFit: 'cover', border: '2px solid #10b981' }}
                          />
                          <div>
                            <div className="d-flex align-items-center gap-1 text-warning mb-1" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-star-fill"></i>
                              <i className="bi bi-star-fill"></i>
                              <i className="bi bi-star-fill"></i>
                              <i className="bi bi-star-fill"></i>
                              <i className="bi bi-star-fill"></i>
                              <span className="text-white fw-bold ms-1">5.0</span>
                            </div>
                            <p className="text-white mb-0 small fst-italic" style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>
                              "Đặt sân padel chỉ mất chưa đầy 30 giây, quá tiện lợi!"
                            </p>
                            <span className="text-white-50" style={{ fontSize: '0.72rem' }}>
                              Minh Hoàng - CLB Pickleball Sài Gòn
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* CỘT PHẢI: FORM ĐĂNG KÝ / ĐĂNG NHẬP */}
                  <div className="col-lg-7 d-flex flex-column justify-content-center px-lg-4">
                    
                    {/* Header Badge */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="badge-pill-brand d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                        <i className="bi bi-people-fill text-brand"></i>
                        <span>{mode === 'login' ? 'CỘNG ĐỒNG THỂ THAO #1' : 'GIA NHẬP CỘNG ĐỒNG THỂ THAO'}</span>
                      </div>
                      <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        <i className="bi bi-shield-lock-fill text-success me-1"></i>
                        Bảo mật SSL 256-Bit
                      </span>
                    </div>

                    <h2 className="fw-bold text-brand-dark mb-1">
                      {mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản mới'}
                    </h2>
                    <p className="text-muted small mb-3">
                      {mode === 'login' 
                        ? 'Chào mừng bạn quay trở lại với nền tảng đặt sân thể thao SportsBooking!' 
                        : 'Tạo tài khoản SportsBooking chỉ trong 60 giây để tận hưởng ưu đãi đặt sân tức thì.'}
                    </p>

                    {/* Social Login Buttons (Google, Facebook, Apple) */}
                    <div className="row g-2 mb-3">
                      <div className="col-4">
                        <button 
                          type="button" 
                          className="social-login-btn"
                          onClick={() => onAuthSuccess({ fullName: 'Google User', emailOrPhone: 'user.google@gmail.com', role: 'USER' })}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                          </svg>
                          <span>Google</span>
                        </button>
                      </div>

                      <div className="col-4">
                        <button 
                          type="button" 
                          className="social-login-btn"
                          onClick={() => onAuthSuccess({ fullName: 'Facebook User', emailOrPhone: 'user.facebook@fb.com', role: 'USER' })}
                        >
                          <i className="bi bi-facebook text-primary fs-5"></i>
                          <span>Facebook</span>
                        </button>
                      </div>

                      <div className="col-4">
                        <button 
                          type="button" 
                          className="social-login-btn"
                          onClick={() => onAuthSuccess({ fullName: 'Apple User', emailOrPhone: 'user.apple@icloud.com', role: 'USER' })}
                        >
                          <i className="bi bi-apple text-dark fs-5"></i>
                          <span>Apple</span>
                        </button>
                      </div>
                    </div>

                    <div className="auth-divider">
                      {mode === 'login' ? 'HOẶC TIẾP TỤC VỚI EMAIL / SĐT' : 'HOẶC ĐIỀN THÔNG TIN BÊN DƯỚI'}
                    </div>

                    {/* Error message */}
                    {errorMessage && (
                      <div className="alert alert-danger py-2 small mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {errorMessage}
                      </div>
                    )}

                    {/* FORM CHÍNH */}
                    <form onSubmit={handleSubmit}>
                      
                      {/* =================================================== */}
                      {/* 1. GIAO DIỆN FORM ĐĂNG NHẬP                         */}
                      {/* =================================================== */}
                      {mode === 'login' ? (
                        <>
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Số điện thoại hoặc Email *
                            </label>
                            <div className="auth-input-group">
                              <i className="bi bi-envelope auth-input-icon"></i>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Ví dụ: 0912 345 678 hoặc email@domain.com"
                                value={loginInput}
                                onChange={(e) => setLoginInput(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <label className="form-label small fw-semibold text-muted mb-0">Mật khẩu *</label>
                              <a 
                                href="#forgot" 
                                className="small text-brand text-decoration-none fw-semibold"
                                onClick={(e) => {
                                  e.preventDefault();
                                  alert('Vui lòng liên hệ Hotline 1900 8899 để được hỗ trợ cấp lại mật khẩu ngay lập tức!');
                                }}
                              >
                                Quên mật khẩu?
                              </a>
                            </div>
                            <div className="auth-input-group">
                              <i className="bi bi-lock auth-input-icon"></i>
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                placeholder="Nhập mật khẩu của bạn"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="auth-input-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                              </button>
                            </div>
                          </div>

                          <div className="form-check mb-3">
                            <input
                              className="form-check-input cursor-pointer"
                              type="checkbox"
                              id="rememberMeCheck"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <label className="form-check-label small text-muted cursor-pointer" htmlFor="rememberMeCheck">
                              Ghi nhớ đăng nhập
                            </label>
                          </div>

                          <button
                            type="submit"
                            className="btn btn-brand w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
                            disabled={loading}
                          >
                            {loading ? (
                              <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                            ) : (
                              <>
                                <span>Đăng nhập ngay</span>
                                <i className="bi bi-arrow-right"></i>
                              </>
                            )}
                          </button>

                          <div className="text-center small mb-3">
                            <span className="text-muted">Chưa có tài khoản? </span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-brand fw-bold text-decoration-none small"
                              onClick={() => {
                                setErrorMessage('');
                                setMode('register');
                              }}
                            >
                              Đăng ký ngay
                            </button>
                          </div>
                        </>
                      ) : (
                        /* =================================================== */
                        /* 2. GIAO DIỆN FORM ĐĂNG KÝ (BASE FORM DÙNG CHUNG)   */
                        /* =================================================== */
                        <>
                          {/* THANH CHỌN VAI TRÒ (Người thuê sân vs Chủ sân) */}
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">
                              Bạn muốn đăng ký với vai trò:
                            </label>
                            <div className="d-flex p-1 bg-light rounded-3 border">
                              <button
                                type="button"
                                className={`btn btn-sm w-50 fw-semibold rounded-2 transition ${role === 'USER' ? 'btn-white bg-white shadow-sm text-brand-dark' : 'text-muted'}`}
                                onClick={() => { setErrorMessage(''); setRole('USER'); }}
                              >
                                <i className="bi bi-person me-1"></i>
                                Người thuê sân
                              </button>
                              <button
                                type="button"
                                className={`btn btn-sm w-50 fw-semibold rounded-2 transition ${role === 'OWNER' ? 'btn-white bg-white shadow-sm text-brand-dark' : 'text-muted'}`}
                                onClick={() => { setErrorMessage(''); setRole('OWNER'); }}
                              >
                                <i className="bi bi-building me-1"></i>
                                Chủ sân
                              </button>
                            </div>
                          </div>

                          {/* 1. TRƯỜNG MẶC ĐỊNH 1: Họ và tên */}
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">Họ và tên *</label>
                            <div className="auth-input-group">
                              <i className="bi bi-person auth-input-icon"></i>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Nguyễn Văn An"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          {/* 2. TRƯỜNG MẶC ĐỊNH 2: Số điện thoại hoặc Email + Ô OTP */}
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <label className="form-label small fw-semibold text-muted mb-0">
                                Số điện thoại hoặc Email *
                              </label>
                              <span className="small text-muted" style={{ fontSize: '0.72rem' }}>
                                Nhận mã OTP xác thực
                              </span>
                            </div>
                            <div className="input-group mb-2">
                              <span className="input-group-text bg-white border-end-0 text-muted">
                                <i className="bi bi-envelope"></i>
                              </span>
                              <input
                                type="text"
                                className="form-control border-start-0 ps-0"
                                placeholder="0912 345 678 hoặc email@example.com"
                                value={emailOrPhone}
                                onChange={(e) => setEmailOrPhone(e.target.value)}
                                required
                              />
                              <button 
                                type="button" 
                                className="btn btn-outline-secondary btn-sm px-3"
                                onClick={() => {
                                  setOtpSent(true);
                                  alert(`Mã OTP đã gửi về: ${emailOrPhone || '0912 345 678'}`);
                                }}
                              >
                                <i className="bi bi-play-fill me-1"></i>Gửi mã
                              </button>
                            </div>

                            {/* Ô nhập mã OTP 6 số (theo yêu cầu bổ sung ô otp ở cả 2) */}
                            <div className="p-3 bg-light rounded-3 border">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label small fw-bold text-dark mb-0">
                                  Mã xác thực OTP (6 chữ số) *
                                </label>
                                <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                  Gửi lại sau {countdown}s
                                </span>
                              </div>
                              <div className="d-flex gap-2 mb-2">
                                {otpValues.map((digit, idx) => (
                                  <input
                                    key={idx}
                                    id={`otp-input-box-${idx}`}
                                    type="text"
                                    maxLength="1"
                                    className="otp-box-input"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                                  />
                                ))}
                              </div>
                              <div className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                                <i className="bi bi-check-circle-fill me-1"></i>
                                Mã OTP đã gửi về {emailOrPhone || '0912 345 678'}
                              </div>
                            </div>
                          </div>

                          {/* 3. TRƯỜNG MẶC ĐỊNH 3: Mật khẩu */}
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">Mật khẩu *</label>
                            <div className="auth-input-group">
                              <i className="bi bi-lock auth-input-icon"></i>
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                placeholder="Tối thiểu 8 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="auth-input-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                              </button>
                            </div>

                            {/* Password strength bar */}
                            <div className="mt-2">
                              <div className="d-flex justify-content-between small text-muted">
                                <span>Độ an toàn:</span>
                                <span style={{ color: strength.color, fontWeight: 600 }}>Độ mạnh: {strength.text}</span>
                              </div>
                              <div className="strength-bar-wrapper">
                                <div className="strength-segment" style={{ backgroundColor: strength.level >= 1 ? strength.color : '#e2e8f0' }}></div>
                                <div className="strength-segment" style={{ backgroundColor: strength.level >= 2 ? strength.color : '#e2e8f0' }}></div>
                                <div className="strength-segment" style={{ backgroundColor: strength.level >= 3 ? strength.color : '#e2e8f0' }}></div>
                                <div className="strength-segment" style={{ backgroundColor: strength.level >= 4 ? strength.color : '#e2e8f0' }}></div>
                              </div>
                            </div>
                          </div>

                          {/* 4. TRƯỜNG MẶC ĐỊNH 4: Xác nhận mật khẩu */}
                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-muted mb-1">Xác nhận mật khẩu *</label>
                            <div className="auth-input-group">
                              <i className="bi bi-shield-check auth-input-icon"></i>
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-control"
                                placeholder="Nhập lại mật khẩu"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                className="auth-input-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                              </button>
                            </div>
                          </div>

                          {/* ======================================================== */}
                          {/* CÁC TRƯỜNG BỔ SUNG CHO CHỦ SÂN (Chỉ hiện khi role === 'OWNER') */}
                          {/* ======================================================== */}
                          {role === 'OWNER' && (
                            <div className="p-3 bg-light rounded-3 border mb-3">
                              <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                                <i className="bi bi-building text-brand"></i>
                                <span className="fw-bold text-dark small text-uppercase">Thông tin cơ sở cụm sân</span>
                              </div>

                              {/* Bổ sung 1: Tên sân / cụm sân */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">Tên sân / cụm sân *</label>
                                <div className="auth-input-group">
                                  <i className="bi bi-flag auth-input-icon"></i>
                                  <input
                                    type="text"
                                    className="form-control bg-white"
                                    placeholder="VD: CLB Thể thao Sài Gòn Padel & Football Arena"
                                    value={courtName}
                                    onChange={(e) => setCourtName(e.target.value)}
                                    required={role === 'OWNER'}
                                  />
                                </div>
                              </div>

                              {/* Bổ sung 2: Loại hình thể thao */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">Loại hình thể thao *</label>
                                <select 
                                  className="form-select bg-white"
                                  value={sportType}
                                  onChange={(e) => setSportType(e.target.value)}
                                  required={role === 'OWNER'}
                                >
                                  <option value="Padel & Pickleball">Padel & Pickleball</option>
                                  <option value="Bóng đá & Tennis">Bóng đá & Tennis</option>
                                  <option value="Cầu lông trong nhà">Cầu lông trong nhà</option>
                                  <option value="Bóng rổ">Bóng rổ</option>
                                  <option value="Tổ hợp đa năng (Nhiều môn)">Tổ hợp đa năng (Nhiều môn)</option>
                                </select>
                              </div>

                              {/* Bổ sung 3: Địa chỉ sân */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">Địa chỉ sân *</label>
                                <div className="auth-input-group">
                                  <i className="bi bi-geo-alt auth-input-icon"></i>
                                  <input
                                    type="text"
                                    className="form-control bg-white"
                                    placeholder="Số 104 Đường Số 7, Phường Tân Phú, TP. HCM"
                                    value={courtAddress}
                                    onChange={(e) => setCourtAddress(e.target.value)}
                                    required={role === 'OWNER'}
                                  />
                                </div>
                              </div>

                              {/* Bổ sung 4: Tên người đại diện quản lý */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">Tên người đại diện quản lý</label>
                                <div className="auth-input-group">
                                  <i className="bi bi-person-badge auth-input-icon"></i>
                                  <input
                                    type="text"
                                    className="form-control bg-white"
                                    placeholder="VD: Nguyễn Văn Hùng"
                                    value={managerName}
                                    onChange={(e) => setManagerName(e.target.value)}
                                  />
                                </div>
                              </div>

                              {/* Bổ sung 5: Số điện thoại liên hệ */}
                              <div className="mb-3">
                                <label className="form-label small fw-semibold text-muted mb-1">Số điện thoại liên hệ *</label>
                                <div className="auth-input-group">
                                  <i className="bi bi-telephone auth-input-icon"></i>
                                  <input
                                    type="tel"
                                    className="form-control bg-white"
                                    placeholder="Số hotline cơ sở hoặc số quản lý nhận lịch"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    required={role === 'OWNER'}
                                  />
                                </div>
                              </div>

                              {/* Bổ sung 6: Mô tả sân (không bắt buộc) */}
                              <div className="mb-1">
                                <label className="form-label small fw-semibold text-muted mb-1">Mô tả sân (không bắt buộc)</label>
                                <textarea
                                  className="form-control bg-white"
                                  rows="3"
                                  placeholder="Quy mô số lượng sân, chất lượng mặt cỏ nhân tạo hoặc đệm cao su, hệ thống đèn chiếu sáng, bãi đỗ xe ô tô, phòng thay đồ..."
                                  value={courtDescription}
                                  onChange={(e) => setCourtDescription(e.target.value)}
                                ></textarea>
                              </div>
                            </div>
                          )}

                          {/* Checkbox điều khoản */}
                          <div className="form-check mb-3">
                            <input
                              className="form-check-input cursor-pointer"
                              type="checkbox"
                              id="termsCheck"
                              checked={agreeTerms}
                              onChange={(e) => setAgreeTerms(e.target.checked)}
                              required
                            />
                            <label className="form-check-label small text-muted cursor-pointer" htmlFor="termsCheck">
                              Tôi đồng ý với <a href="#terms" className="text-brand fw-semibold text-decoration-none">Điều khoản dịch vụ</a> và <a href="#privacy" className="text-brand fw-semibold text-decoration-none">Chính sách bảo mật</a> của SportsBooking.
                            </label>
                          </div>

                          {/* Submit button */}
                          <button
                            type="submit"
                            className="btn btn-brand w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
                            disabled={loading}
                          >
                            {loading ? (
                              <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                            ) : (
                              <>
                                <span>{role === 'OWNER' ? 'Đăng ký làm Chủ sân ngay' : 'Tạo tài khoản ngay'}</span>
                                <i className="bi bi-arrow-right"></i>
                              </>
                            )}
                          </button>

                          {/* Chuyển sang Đăng nhập */}
                          <div className="text-center small mb-3">
                            <span className="text-muted">Đã có tài khoản SportsBooking? </span>
                            <button
                              type="button"
                              className="btn btn-link p-0 text-brand fw-bold text-decoration-none small"
                              onClick={() => {
                                setErrorMessage('');
                                setMode('login');
                              }}
                            >
                              Đăng nhập ngay
                            </button>
                          </div>
                        </>
                      )}

                      {/* Security Seal Footer */}
                      <div className="d-flex align-items-center justify-content-center gap-3 pt-2 border-top text-muted small" style={{ fontSize: '0.75rem' }}>
                        <span className="d-flex align-items-center gap-1">
                          <i className="bi bi-shield-check text-success"></i>
                          <span>Mã hóa SSL 256-bit</span>
                        </span>
                        <span>•</span>
                        <span className="d-flex align-items-center gap-1">
                          <i className="bi bi-lock-fill text-success"></i>
                          <span>Bảo mật dữ liệu tuyệt đối</span>
                        </span>
                      </div>
                    </form>

                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Footer */}
      <footer className="py-3 px-4 border-top bg-white mt-auto small text-muted">
        <div className="container-fluid d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span>© 2025 SportsBooking Vietnam. Tất cả quyền được bảo lưu.</span>
          <div className="d-flex align-items-center gap-3">
            <span>
              <i className="bi bi-telephone-fill text-success me-1"></i>
              Hotline hỗ trợ: <strong>1900 8899</strong>
            </span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <a href="#terms" className="text-muted text-decoration-none hover-dark">Điều khoản dịch vụ</a>
            <span>•</span>
            <a href="#privacy" className="text-muted text-decoration-none hover-dark">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
