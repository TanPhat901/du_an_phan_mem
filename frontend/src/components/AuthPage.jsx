import React, { useState } from 'react';

export default function AuthPage({ initialMode = 'login', onBackToHome, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { level: 0, text: '', color: '' };
    if (password.length < 6) return { level: 1, text: 'Yếu', color: '#ef4444' };
    if (password.length < 8) return { level: 2, text: 'Trung bình', color: '#f59e0b' };
    if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      return { level: 4, text: 'Rất mạnh', color: '#10b981' };
    }
    return { level: 3, text: 'Khá', color: '#10b981' };
  };

  const strength = getPasswordStrength();

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMessage('Vui lòng nhập họ và tên của bạn.');
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
    }

    setLoading(true);

    const endpoint = mode === 'login' ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';
    const payload = mode === 'login' 
      ? { emailOrPhone, password }
      : { fullName, emailOrPhone, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        onAuthSuccess(data.data);
      } else {
        setErrorMessage(data.message || 'Thao tác không thành công, vui lòng thử lại.');
      }
    } catch {
      // Offline / standalone fallback simulation
      const fallbackUser = {
        fullName: fullName || (emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'Người dùng SportsBooking'),
        emailOrPhone: emailOrPhone || 'user@sportsbooking.vn'
      };
      onAuthSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      {/* Top Header */}
      <header className="py-3 px-4 border-bottom bg-white sticky-top">
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onBackToHome(); }} 
              className="text-decoration-none d-flex align-items-center gap-2"
            >
              <div className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle" style={{ width: '36px', height: '36px' }}>
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
              className="rounded-circle d-flex align-items-center justify-content-center text-white" 
              style={{ width: '36px', height: '36px', backgroundColor: '#0b4d3c' }}
            >
              <i className="bi bi-person-fill"></i>
            </div>
          </div>
        </div>
      </header>

      {/* Main Auth Container */}
      <main className="flex-grow-1 d-flex align-items-center py-4 py-md-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-11 col-lg-12">
              <div className="auth-container-card p-3 p-md-4">
                <div className="row g-4 align-items-stretch">
                  
                  {/* Left Column: Minimalistic Website Visual Banner */}
                  <div className="col-lg-5 d-none d-lg-block">
                    <div 
                      className="auth-visual-hero h-100 d-flex flex-column justify-content-between p-4"
                      style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1000&q=80')`
                      }}
                    >
                      {/* Top Brand Tag */}
                      <div className="auth-visual-content">
                        <div className="d-inline-flex align-items-center gap-2 glass-pill px-3 py-2">
                          <i className="bi bi-trophy-fill text-warning"></i>
                          <span className="fw-bold tracking-wide">SportsBooking</span>
                        </div>
                      </div>

                      {/* Bottom Info Box */}
                      <div className="auth-visual-content mt-auto">
                        <div 
                          className="glass-card-testimonial p-4 rounded-4"
                          style={{
                            background: 'rgba(11, 77, 60, 0.82)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.25)'
                          }}
                        >
                          <h3 className="fw-bold text-white mb-3" style={{ fontSize: '1.65rem', letterSpacing: '-0.02em' }}>
                            Website SportsBooking
                          </h3>
                          <p className="text-white mb-0" style={{ fontSize: '1.05rem', lineHeight: '1.6', opacity: 0.95 }}>
                            Nền tảng tìm kiếm, đặt sân thể thao và quản lý lịch thuê trực tuyến nhanh chóng, tiện lợi.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Auth Form */}
                  <div className="col-lg-7 d-flex flex-column justify-content-center px-lg-4">
                    
                    {/* Header badge & title */}
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

                    {/* Social Logins */}
                    <div className="row g-2 mb-3">
                      <div className="col-4">
                        <button 
                          type="button" 
                          className="social-login-btn"
                          onClick={() => {
                            onAuthSuccess({ fullName: 'Google User', emailOrPhone: 'user.google@gmail.com' });
                          }}
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
                          onClick={() => {
                            onAuthSuccess({ fullName: 'Facebook User', emailOrPhone: 'user.facebook@fb.com' });
                          }}
                        >
                          <i className="bi bi-facebook text-primary fs-5"></i>
                          <span>Facebook</span>
                        </button>
                      </div>

                      <div className="col-4">
                        <button 
                          type="button" 
                          className="social-login-btn"
                          onClick={() => {
                            onAuthSuccess({ fullName: 'Apple User', emailOrPhone: 'user.apple@icloud.com' });
                          }}
                        >
                          <i className="bi bi-apple text-dark fs-5"></i>
                          <span>Apple</span>
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="auth-divider">
                      {mode === 'login' ? 'HOẶC TIẾP TỤC VỚI EMAIL / SĐT' : 'HOẶC ĐIỀN THÔNG TIN BÊN DƯỚI'}
                    </div>

                    {/* Error alert */}
                    {errorMessage && (
                      <div className="alert alert-danger py-2 small mb-3">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {errorMessage}
                      </div>
                    )}

                    {/* Main Form */}
                    <form onSubmit={handleSubmit}>
                      
                      {/* Name field (for Register) */}
                      {mode === 'register' && (
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
                      )}

                      {/* Email / Phone Field */}
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
                            value={emailOrPhone}
                            onChange={(e) => setEmailOrPhone(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label small fw-semibold text-muted mb-0">Mật khẩu *</label>
                          {mode === 'login' && (
                            <a 
                              href="#forgot" 
                              className="small text-brand text-decoration-none fw-semibold"
                              onClick={(e) => {
                                e.preventDefault();
                                alert('Vui lòng liên hệ Hotline 1900 8888 để được hỗ trợ cấp lại mật khẩu ngay lập tức!');
                              }}
                            >
                              Quên mật khẩu?
                            </a>
                          )}
                        </div>
                        <div className="auth-input-group">
                          <i className="bi bi-lock auth-input-icon"></i>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control"
                            placeholder={mode === 'login' ? 'Nhập mật khẩu của bạn' : 'Tối thiểu 8 ký tự'}
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

                        {/* Password strength bar (for Register) */}
                        {mode === 'register' && password && (
                          <div className="mt-2">
                            <div className="d-flex justify-content-between small text-muted">
                              <span>Độ an toàn:</span>
                              <span style={{ color: strength.color, fontWeight: 600 }}>{strength.text}</span>
                            </div>
                            <div className="strength-bar-wrapper">
                              <div className="strength-segment" style={{ backgroundColor: strength.level >= 1 ? strength.color : '#e2e8f0' }}></div>
                              <div className="strength-segment" style={{ backgroundColor: strength.level >= 2 ? strength.color : '#e2e8f0' }}></div>
                              <div className="strength-segment" style={{ backgroundColor: strength.level >= 3 ? strength.color : '#e2e8f0' }}></div>
                              <div className="strength-segment" style={{ backgroundColor: strength.level >= 4 ? strength.color : '#e2e8f0' }}></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password Field (for Register) */}
                      {mode === 'register' && (
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
                      )}

                      {/* Remember me or Terms checkbox */}
                      <div className="mb-3">
                        {mode === 'login' ? (
                          <div className="form-check">
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
                        ) : (
                          <div className="form-check">
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
                        )}
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="btn btn-brand w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                        ) : (
                          <>
                            <span>{mode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản ngay'}</span>
                            <i className="bi bi-arrow-right"></i>
                          </>
                        )}
                      </button>

                      {/* Switch mode */}
                      <div className="text-center small mb-3">
                        {mode === 'login' ? (
                          <span>
                            Chưa có tài khoản?{' '}
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
                          </span>
                        ) : (
                          <span>
                            Đã có tài khoản SportsBooking?{' '}
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
                          </span>
                        )}
                      </div>

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
              Hotline hỗ trợ: <strong>1900 8888</strong>
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
