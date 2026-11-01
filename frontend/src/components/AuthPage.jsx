import React, { useState } from 'react';

export default function AuthPage({ initialMode = 'role-select', onBackToHome, onAuthSuccess }) {
  // Mode: 'role-select' (Chọn vai trò) | 'register-owner' (Đăng ký chủ sân) | 'register-user' (Đăng ký người thuê) | 'login' (Đăng nhập)
  const [mode, setMode] = useState(
    initialMode === 'register' ? 'role-select' : initialMode
  );

  // ==========================================
  // THÔNG TIN ĐĂNG KÝ NGƯỜI CHƠI (USER BASE FORM)
  // ==========================================
  const [userFullName, setUserFullName] = useState('');
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');

  // ==========================================
  // THÔNG TIN ĐĂNG KÝ CHỦ SÂN (OWNER FORM - ẢNH 2)
  // ==========================================
  // 1. Thông tin đăng nhập
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState('');

  // 2. Thông tin cơ sở & Quản trị viên
  const [representativeName, setRepresentativeName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [facilityName, setFacilityName] = useState('');
  
  // Loại hình thể thao (Chọn nhiều môn)
  const availableSports = [
    'Bóng đá',
    'Pickleball',
    'Padel Tennis',
    'Quần vợt / Tennis',
    'Cầu lông',
    'Bóng rổ'
  ];
  const [selectedSports, setSelectedSports] = useState(['Bóng đá', 'Pickleball', 'Padel Tennis']);

  const toggleSport = (sport) => {
    if (selectedSports.includes(sport)) {
      if (selectedSports.length > 1) {
        setSelectedSports(selectedSports.filter(s => s !== sport));
      }
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  // Địa chỉ cơ sở sân
  const [selectedCity, setSelectedCity] = useState('TP. Hồ Chí Minh');
  const [selectedDistrict, setSelectedDistrict] = useState('Quận 7');
  const [detailedAddress, setDetailedAddress] = useState('Số 104 Đường Số 7, Phường Tân Phú');
  const [courtDescription, setCourtDescription] = useState('');

  // OTP Verification State (6 ô OTP, countdown, hiển thị cho cả 2 form)
  const [otpValues, setOtpValues] = useState(['8', '3', '9', '5', '', '']);
  const [otpSent, setOtpSent] = useState(true);
  const [countdown, setCountdown] = useState(55);

  const handleOtpChange = (index, value, prefix = 'otp-input') => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`${prefix}-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Login Specific State
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, text: '', color: '' };
    if (pwd.length < 6) return { level: 1, text: 'Yếu', color: '#ef4444' };
    if (pwd.length < 8) return { level: 2, text: 'Trung bình', color: '#f59e0b' };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { level: 4, text: 'Rất mạnh', color: '#10b981' };
    }
    return { level: 3, text: 'Khá', color: '#10b981' };
  };

  // ==========================================
  // XỬ LÝ SUBMIT CÁC FORM
  // ==========================================
  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

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
  };

  const handleSubmitUserRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!userFullName.trim() || !userEmailOrPhone.trim() || !userPassword) {
      setErrorMessage('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*).');
      return;
    }

    if (userPassword.length < 6) {
      setErrorMessage('Mật khẩu tối thiểu phải từ 6 ký tự.');
      return;
    }

    if (userPassword !== userConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: userFullName,
          emailOrPhone: userEmailOrPhone,
          password: userPassword
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onAuthSuccess(data.data);
      } else {
        setErrorMessage(data.message || 'Thao tác không thành công, vui lòng thử lại.');
      }
    } catch {
      onAuthSuccess({ fullName: userFullName, emailOrPhone: userEmailOrPhone, role: 'USER' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOwnerRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!ownerEmail.trim() || !ownerPassword || !representativeName.trim() || !facilityName.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ các thông tin có dấu sao đỏ (*).');
      return;
    }

    if (ownerPassword.length < 6) {
      setErrorMessage('Mật khẩu tối thiểu phải từ 6 ký tự.');
      return;
    }

    if (ownerPassword !== ownerConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách hợp tác Chủ sân.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = ownerEmail.includes('@');
      const cleanEmail = isEmail ? ownerEmail : `${ownerEmail}@tenclb.vn`;
      const cleanPhone = ownerPhone || '0912345678';

      const response = await fetch('http://localhost:5000/api/auth/register-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: ownerPassword,
          representativeName: representativeName,
          phone: cleanPhone,
          facilityName: facilityName,
          sportTypes: selectedSports,
          city: selectedCity,
          district: selectedDistrict,
          detailedAddress: detailedAddress,
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
        fullName: representativeName || 'Chủ sân SportsBooking',
        emailOrPhone: ownerEmail,
        role: 'OWNER',
        facilityName: facilityName
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper d-flex flex-column min-vh-100 bg-light">
      
      {/* ======================================================== */}
      {/* TOP HEADER NAVBAR (ĐỒNG NHẤT TOÀN HỆ THỐNG)              */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* 1. MÀN HÌNH CHỌN VAI TRÒ ĐĂNG KÝ (ẢNH 1)                 */}
      {/* ======================================================== */}
      {mode === 'role-select' && (
        <main className="flex-grow-1 d-flex flex-column justify-content-center py-5">
          <div className="container">
            
            {/* Step Wizard: 1 Chọn vai trò -> 2 Thông tin tài khoản -> 3 Kích hoạt */}
            <div className="d-flex justify-content-center align-items-center mb-4">
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle active">1</span>
                <span className="fw-bold text-brand-dark small">Chọn vai trò</span>
              </div>
              <div className="mx-3" style={{ width: '48px', height: '2px', backgroundColor: '#e2e8f0' }}></div>
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle">2</span>
                <span className="text-muted small">Thông tin tài khoản</span>
              </div>
              <div className="mx-3" style={{ width: '48px', height: '2px', backgroundColor: '#e2e8f0' }}></div>
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle">3</span>
                <span className="text-muted small">Kích hoạt</span>
              </div>
            </div>

            {/* Heading & Subtitle */}
            <div className="text-center mb-5">
              <div className="badge-pill-brand d-inline-flex align-items-center gap-1 mb-3">
                <i className="bi bi-lightning-charge-fill text-brand"></i>
                <span>CHÀO MỪNG ĐẾN VỚI SPORTSBOOKING</span>
              </div>
              <h1 className="fw-extrabold text-brand-dark mb-3" style={{ fontWeight: 800, fontSize: '2.3rem', letterSpacing: '-0.02em' }}>
                Bạn tham gia SportsBooking<br />với vai trò nào?
              </h1>
              <p className="text-muted mx-auto" style={{ maxWidth: '620px', fontSize: '1rem', lineHeight: '1.6' }}>
                Chọn loại tài khoản phù hợp với nhu cầu để chúng tôi tối ưu hóa quy trình cùng các tính năng chuyên biệt nhất dành cho bạn.
              </p>
            </div>

            {/* 2 Role Cards */}
            <div className="row g-4 justify-content-center" style={{ maxWidth: '980px', margin: '0 auto' }}>
              
              {/* Card 1: Người chơi / Người thuê sân */}
              <div className="col-md-6">
                <div className="role-card p-4 shadow-sm h-100">
                  <div className="d-flex justify-content-start mb-3">
                    <span className="badge-pill-brand" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-people-fill me-1"></i>
                      Người chơi & Đội nhóm • Phổ biến nhất
                    </span>
                  </div>

                  <div className="role-card-img-wrapper mb-4">
                    <img 
                      src="https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=800&q=80" 
                      alt="Người chơi thể thao"
                    />
                    <div className="role-img-badge">
                      <i className="bi bi-lightning-fill text-warning me-1"></i>
                      Đặt sân thần tốc & Tìm đối thủ
                    </div>
                  </div>

                  <h3 className="fw-bold text-brand-dark text-center mb-4" style={{ fontSize: '1.35rem' }}>
                    Tôi là Người chơi / Người thuê sân
                  </h3>

                  <button 
                    type="button" 
                    className="btn btn-brand w-100 py-2 mt-auto d-flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                      setErrorMessage('');
                      setMode('register-user');
                    }}
                  >
                    <span>Tiếp tục với tư cách Người chơi</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>

              {/* Card 2: Chủ sân / Quản lý cụm sân */}
              <div className="col-md-6">
                <div className="role-card p-4 shadow-sm h-100">
                  <div className="d-flex justify-content-start mb-3">
                    <span className="badge-pill-brand" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-building me-1"></i>
                      Chủ cụm sân • Tăng trưởng doanh thu
                    </span>
                  </div>

                  <div className="role-card-img-wrapper mb-4">
                    <img 
                      src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80" 
                      alt="Chủ sân quản lý cơ sở"
                    />
                    <div className="role-img-badge">
                      <i className="bi bi-tools text-warning me-1"></i>
                      Giải pháp quản lý SaaS chuyên nghiệp
                    </div>
                  </div>

                  <h3 className="fw-bold text-brand-dark text-center mb-4" style={{ fontSize: '1.35rem' }}>
                    Tôi là Chủ sân / Quản lý cụm sân
                  </h3>

                  <button 
                    type="button" 
                    className="btn btn-brand w-100 py-2 mt-auto d-flex align-items-center justify-content-center gap-2"
                    onClick={() => {
                      setErrorMessage('');
                      setMode('register-owner');
                    }}
                  >
                    <span>Đăng ký làm Đối tác chủ sân</span>
                    <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="text-center mt-5">
              <div className="mb-2">
                <span className="text-muted small">Đã có tài khoản SportsBooking? </span>
                <button 
                  type="button" 
                  className="btn btn-link p-0 text-brand fw-bold text-decoration-none small"
                  onClick={() => {
                    setErrorMessage('');
                    setMode('login');
                  }}
                >
                  Đăng nhập ngay ↗
                </button>
              </div>
              <div className="text-muted small">
                <i className="bi bi-headset me-1 text-success"></i>
                Cần tư vấn hỗ trợ lựa chọn? Hotline: <strong>1900 8899</strong> (8h00 - 22h00)
              </div>
            </div>

          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* 2. MÀN HÌNH ĐĂNG KÝ DÀNH CHO CHỦ SÂN (ẢNH 2 CHUẨN 100%) */}
      {/* ======================================================== */}
      {mode === 'register-owner' && (
        <main className="flex-grow-1 py-5">
          <div className="container">
            
            {/* Stepper Bar */}
            <div className="d-flex justify-content-center align-items-center mb-4">
              <div 
                className="d-flex align-items-center gap-2 cursor-pointer"
                onClick={() => setMode('role-select')}
              >
                <span className="stepper-circle bg-success text-white">✓</span>
                <span className="text-muted small">Chọn vai trò</span>
              </div>
              <div className="mx-3" style={{ width: '48px', height: '2px', backgroundColor: '#0b4d3c' }}></div>
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle active">2</span>
                <span className="fw-bold text-brand-dark small">Thông tin tài khoản</span>
              </div>
              <div className="mx-3" style={{ width: '48px', height: '2px', backgroundColor: '#e2e8f0' }}></div>
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle">3</span>
                <span className="text-muted small">Kích hoạt</span>
              </div>
            </div>

            {/* Center Registration Card */}
            <div className="row justify-content-center">
              <div className="col-lg-9 col-xl-8">
                <div className="bg-white rounded-4 shadow-sm border p-4 p-md-5">
                  
                  {/* Card Title Header */}
                  <div className="text-center mb-4">
                    <div className="badge-pill-brand d-inline-flex align-items-center gap-1 mb-2">
                      <i className="bi bi-building text-brand"></i>
                      <span>DÀNH CHO ĐỐI TÁC CHỦ SÂN</span>
                    </div>
                    <h2 className="fw-bold text-brand-dark mb-2" style={{ fontSize: '1.85rem' }}>
                      Đăng ký tài khoản Chủ sân
                    </h2>
                    <p className="text-muted small mb-0">
                      Khởi tạo tài khoản quản lý và gửi hồ sơ cụm sân để bắt đầu số hóa đặt sân cùng SportsBooking.
                    </p>
                  </div>

                  {/* Role Switch Pill to allow fast toggling if user changes mind */}
                  <div className="d-flex justify-content-center mb-4">
                    <div className="d-inline-flex p-1 bg-light rounded-pill border">
                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3 text-muted"
                        onClick={() => { setErrorMessage(''); setMode('register-user'); }}
                      >
                        <i className="bi bi-person me-1"></i>
                        Người thuê sân
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3 bg-white text-brand-dark fw-bold shadow-sm"
                      >
                        <i className="bi bi-building me-1"></i>
                        Chủ sân (Đang chọn)
                      </button>
                    </div>
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <div className="alert alert-danger py-2 small mb-4">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {errorMessage}
                    </div>
                  )}

                  {/* FORM ĐĂNG KÝ CHỦ SÂN */}
                  <form onSubmit={handleSubmitOwnerRegister}>
                    
                    {/* SECTION 1: THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP */}
                    <div className="mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                        <i className="bi bi-lock-fill text-brand"></i>
                        <span className="fw-bold text-dark small text-uppercase">Thông tin tài khoản đăng nhập</span>
                      </div>

                      {/* Email đăng nhập */}
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">Email đăng nhập *</label>
                        <div className="auth-input-group">
                          <span className="auth-input-icon fw-bold">@</span>
                          <input 
                            type="email"
                            className="form-control"
                            placeholder="contact@tenclb.vn"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Mật khẩu & Nhập lại mật khẩu (2 Cột) */}
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-muted mb-1">Mật khẩu *</label>
                          <div className="auth-input-group">
                            <i className="bi bi-lock auth-input-icon"></i>
                            <input 
                              type={showPassword ? 'text' : 'password'}
                              className="form-control"
                              placeholder="Tối thiểu 8 ký tự"
                              value={ownerPassword}
                              onChange={(e) => setOwnerPassword(e.target.value)}
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

                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-muted mb-1">Nhập lại mật khẩu *</label>
                          <div className="auth-input-group">
                            <i className="bi bi-shield-check auth-input-icon"></i>
                            <input 
                              type={showConfirmPassword ? 'text' : 'password'}
                              className="form-control"
                              placeholder="Khớp với mật khẩu trên"
                              value={ownerConfirmPassword}
                              onChange={(e) => setOwnerConfirmPassword(e.target.value)}
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
                      </div>
                    </div>

                    {/* SECTION 2: THÔNG TIN CƠ SỞ & QUẢN TRỊ VIÊN */}
                    <div className="mb-4">
                      <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                        <i className="bi bi-building-fill text-brand"></i>
                        <span className="fw-bold text-dark small text-uppercase">Thông tin cơ sở & Quản trị viên</span>
                      </div>

                      {/* Row 1: Tên người đại diện quản lý & Số điện thoại */}
                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-muted mb-1">Tên người đại diện quản lý *</label>
                          <div className="auth-input-group">
                            <i className="bi bi-person auth-input-icon"></i>
                            <input 
                              type="text"
                              className="form-control"
                              placeholder="VD: Nguyễn Văn Hùng"
                              value={representativeName}
                              onChange={(e) => setRepresentativeName(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <label className="form-label small fw-semibold text-muted mb-0">Số điện thoại *</label>
                            <span className="small text-muted" style={{ fontSize: '0.72rem' }}>Dùng nhận mã OTP</span>
                          </div>
                          <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted">
                              <i className="bi bi-telephone"></i>
                            </span>
                            <input 
                              type="tel"
                              className="form-control border-start-0 ps-0"
                              placeholder="0912 345 678"
                              value={ownerPhone}
                              onChange={(e) => setOwnerPhone(e.target.value)}
                              required
                            />
                            <button 
                              type="button" 
                              className="btn btn-outline-secondary btn-sm px-3"
                              onClick={() => {
                                setOtpSent(true);
                                alert(`Mã OTP đã gửi về: ${ownerPhone || '0912 345 678'}`);
                              }}
                            >
                              <i className="bi bi-play-fill me-1"></i>Gửi mã
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Ô nhập mã OTP 6 số (chuẩn như ảnh 2) */}
                      <div className="p-3 bg-light rounded-3 border mb-3">
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
                              id={`otp-input-owner-${idx}`}
                              type="text"
                              maxLength="1"
                              className="otp-box-input"
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value, 'otp-input-owner')}
                            />
                          ))}
                        </div>
                        <div className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Mã OTP đã gửi về SĐT {ownerPhone || '0912 345 678'}
                        </div>
                      </div>

                      {/* Tên cụm sân / CLB thể thao */}
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">Tên cụm sân / CLB thể thao *</label>
                        <div className="auth-input-group">
                          <i className="bi bi-trophy auth-input-icon"></i>
                          <input 
                            type="text"
                            className="form-control"
                            placeholder="VD: CLB Thể thao Sài Gòn Padel & Football Arena"
                            value={facilityName}
                            onChange={(e) => setFacilityName(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Loại hình thể thao phục vụ (Chọn nhiều môn) */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <label className="form-label small fw-semibold text-muted mb-0">Loại hình thể thao phục vụ *</label>
                          <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Chọn nhiều môn</span>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {availableSports.map((sport) => {
                            const isSelected = selectedSports.includes(sport);
                            return (
                              <button
                                key={sport}
                                type="button"
                                className={`sport-pill-btn ${isSelected ? 'active' : ''}`}
                                onClick={() => toggleSport(sport)}
                              >
                                {isSelected && <i className="bi bi-check-lg me-1"></i>}
                                {sport}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Địa chỉ cơ sở sân (2 Dropdown + 1 Input chi tiết) */}
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">Địa chỉ cơ sở sân *</label>
                        <div className="row g-2 mb-2">
                          <div className="col-6">
                            <select 
                              className="form-select text-dark"
                              value={selectedCity}
                              onChange={(e) => setSelectedCity(e.target.value)}
                            >
                              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                              <option value="Hà Nội">Hà Nội</option>
                              <option value="Đà Nẵng">Đà Nẵng</option>
                              <option value="Bình Dương">Bình Dương</option>
                              <option value="Cần Thơ">Cần Thơ</option>
                            </select>
                          </div>
                          <div className="col-6">
                            <select 
                              className="form-select text-dark"
                              value={selectedDistrict}
                              onChange={(e) => setSelectedDistrict(e.target.value)}
                            >
                              <option value="Quận 7">Quận 7</option>
                              <option value="Quận 1">Quận 1</option>
                              <option value="TP. Thủ Đức">TP. Thủ Đức</option>
                              <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                              <option value="Quận Tân Bình">Quận Tân Bình</option>
                              <option value="Quận Tân Phú">Quận Tân Phú</option>
                            </select>
                          </div>
                        </div>

                        <div className="auth-input-group">
                          <i className="bi bi-geo-alt-fill text-brand auth-input-icon"></i>
                          <input 
                            type="text"
                            className="form-control"
                            placeholder="Số 104 Đường Số 7, Phường Tân Phú"
                            value={detailedAddress}
                            onChange={(e) => setDetailedAddress(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* Mô tả cụm sân (Không bắt buộc) */}
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted mb-1">Mô tả cụm sân (Không bắt buộc)</label>
                        <textarea 
                          className="form-control"
                          rows="3"
                          placeholder="Giới thiệu quy mô sân, chất lượng mặt cỏ nhân tạo hoặc đệm cao su, hệ thống dàn đèn LED chống chói, bãi đỗ xe ô tô, phòng thay đồ hoặc giờ hoạt động mở cửa..."
                          value={courtDescription}
                          onChange={(e) => setCourtDescription(e.target.value)}
                        ></textarea>
                      </div>

                    </div>

                    {/* Notice Banner: Quy trình kích hoạt & xác thực */}
                    <div className="p-3 rounded-3 mb-4 d-flex align-items-start gap-3" style={{ backgroundColor: '#edf7f2', border: '1px solid #bbf0d4' }}>
                      <i className="bi bi-shield-check text-success fs-4 mt-0"></i>
                      <div className="small text-dark" style={{ lineHeight: '1.5' }}>
                        <strong>Quy trình kích hoạt & xác thực:</strong> Sau khi nhấn Đăng ký và hoàn tất xác thực mã OTP gửi về SĐT/Email, hồ sơ của bạn sẽ được Ban quản trị (Admin) kiểm duyệt và kích hoạt tài khoản trong vòng <strong>2 - 4 giờ làm việc</strong>.
                      </div>
                    </div>

                    {/* Checkbox Điều khoản */}
                    <div className="form-check mb-4">
                      <input 
                        className="form-check-input cursor-pointer"
                        type="checkbox"
                        id="ownerTermsCheck"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        required
                      />
                      <label className="form-check-label small text-muted cursor-pointer" htmlFor="ownerTermsCheck">
                        Tôi đồng ý với <a href="#terms" className="text-brand fw-semibold text-decoration-none">Điều khoản dịch vụ</a> và <a href="#privacy" className="text-brand fw-semibold text-decoration-none">Chính sách hợp tác đối tác Chủ sân</a> của SportsBooking Vietnam.
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit"
                      className="btn btn-brand w-100 py-2.5 fs-6 d-flex align-items-center justify-content-center gap-2 mb-4"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                      ) : (
                        <>
                          <span className="fw-bold">Hoàn tất đăng ký & Chờ xét duyệt</span>
                          <i className="bi bi-arrow-right"></i>
                        </>
                      )}
                    </button>

                    {/* Bottom Actions */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 pt-2 border-top small">
                      <button 
                        type="button" 
                        className="btn btn-link p-0 text-decoration-none text-muted d-flex align-items-center gap-1"
                        onClick={() => {
                          setErrorMessage('');
                          setMode('role-select');
                        }}
                      >
                        <i className="bi bi-arrow-left"></i>
                        <span>Quay lại chọn vai trò</span>
                      </button>

                      <div>
                        <span className="text-muted">Đã có tài khoản Chủ sân? </span>
                        <button 
                          type="button" 
                          className="btn btn-link p-0 text-brand fw-bold text-decoration-none"
                          onClick={() => {
                            setErrorMessage('');
                            setMode('login');
                          }}
                        >
                          Đăng nhập ngay
                        </button>
                      </div>
                    </div>

                    {/* Security note */}
                    <div className="text-center text-muted small mt-4 pt-3 border-top" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-shield-lock-fill text-success me-1"></i>
                      Mã hóa SSL 256-bit • Bảo mật dữ liệu cụm sân tuyệt đối
                    </div>

                  </form>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* 3. MÀN HÌNH ĐĂNG KÝ NGƯỜI THUÊ SÂN (BASE FORM 4 TRƯỜNG + OTP) */}
      {/* ======================================================== */}
      {mode === 'register-user' && (
        <main className="flex-grow-1 py-5">
          <div className="container">
            
            {/* Stepper Bar */}
            <div className="d-flex justify-content-center align-items-center mb-4">
              <div 
                className="d-flex align-items-center gap-2 cursor-pointer"
                onClick={() => setMode('role-select')}
              >
                <span className="stepper-circle bg-success text-white">✓</span>
                <span className="text-muted small">Chọn vai trò</span>
              </div>
              <div className="mx-3" style={{ width: '48px', height: '2px', backgroundColor: '#0b4d3c' }}></div>
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle active">2</span>
                <span className="fw-bold text-brand-dark small">Thông tin tài khoản</span>
              </div>
              <div className="mx-3" style={{ width: '48px', height: '2px', backgroundColor: '#e2e8f0' }}></div>
              <div className="d-flex align-items-center gap-2">
                <span className="stepper-circle">3</span>
                <span className="text-muted small">Kích hoạt</span>
              </div>
            </div>

            <div className="row justify-content-center">
              <div className="col-lg-7 col-xl-6">
                <div className="bg-white rounded-4 shadow-sm border p-4 p-md-5">
                  
                  {/* Card Title Header */}
                  <div className="text-center mb-4">
                    <div className="badge-pill-brand d-inline-flex align-items-center gap-1 mb-2">
                      <i className="bi bi-people-fill text-brand"></i>
                      <span>DÀNH CHO NGƯỜI CHƠI & ĐỘI NHÓM</span>
                    </div>
                    <h2 className="fw-bold text-brand-dark mb-2" style={{ fontSize: '1.85rem' }}>
                      Đăng ký tài khoản Người chơi
                    </h2>
                    <p className="text-muted small mb-0">
                      Tạo tài khoản SportsBooking chỉ trong 60 giây để tận hưởng ưu đãi đặt sân tức thì.
                    </p>
                  </div>

                  {/* Role Switch Pill */}
                  <div className="d-flex justify-content-center mb-4">
                    <div className="d-inline-flex p-1 bg-light rounded-pill border">
                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3 bg-white text-brand-dark fw-bold shadow-sm"
                      >
                        <i className="bi bi-person me-1"></i>
                        Người thuê sân (Đang chọn)
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm rounded-pill px-3 text-muted"
                        onClick={() => { setErrorMessage(''); setMode('register-owner'); }}
                      >
                        <i className="bi bi-building me-1"></i>
                        Chủ sân
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="alert alert-danger py-2 small mb-4">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {errorMessage}
                    </div>
                  )}

                  {/* BASE FORM 4 TRƯỜNG MẶC ĐỊNH + Ô OTP */}
                  <form onSubmit={handleSubmitUserRegister}>
                    
                    {/* 1. Họ và tên */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted mb-1">Họ và tên *</label>
                      <div className="auth-input-group">
                        <i className="bi bi-person auth-input-icon"></i>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Nguyễn Văn An"
                          value={userFullName}
                          onChange={(e) => setUserFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* 2. Số điện thoại hoặc Email + Ô OTP */}
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
                          placeholder="Ví dụ: 0912 345 678 hoặc email@domain.com"
                          value={userEmailOrPhone}
                          onChange={(e) => setUserEmailOrPhone(e.target.value)}
                          required
                        />
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary btn-sm px-3"
                          onClick={() => {
                            setOtpSent(true);
                            alert(`Mã OTP đã gửi về: ${userEmailOrPhone || '0912 345 678'}`);
                          }}
                        >
                          <i className="bi bi-play-fill me-1"></i>Gửi mã
                        </button>
                      </div>

                      {/* Ô nhập mã OTP 6 số */}
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
                              id={`otp-input-user-${idx}`}
                              type="text"
                              maxLength="1"
                              className="otp-box-input"
                              value={digit}
                              onChange={(e) => handleOtpChange(idx, e.target.value, 'otp-input-user')}
                            />
                          ))}
                        </div>
                        <div className="small text-success fw-semibold" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-check-circle-fill me-1"></i>
                          Mã OTP đã gửi về {userEmailOrPhone || '0912 345 678'}
                        </div>
                      </div>
                    </div>

                    {/* 3. Mật khẩu */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted mb-1">Mật khẩu *</label>
                      <div className="auth-input-group">
                        <i className="bi bi-lock auth-input-icon"></i>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control"
                          placeholder="Tối thiểu 8 ký tự"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
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

                    {/* 4. Xác nhận mật khẩu */}
                    <div className="mb-4">
                      <label className="form-label small fw-semibold text-muted mb-1">Xác nhận mật khẩu *</label>
                      <div className="auth-input-group">
                        <i className="bi bi-shield-check auth-input-icon"></i>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="form-control"
                          placeholder="Nhập lại mật khẩu"
                          value={userConfirmPassword}
                          onChange={(e) => setUserConfirmPassword(e.target.value)}
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

                    {/* Checkbox Điều khoản */}
                    <div className="form-check mb-4">
                      <input
                        className="form-check-input cursor-pointer"
                        type="checkbox"
                        id="userTermsCheck"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        required
                      />
                      <label className="form-check-label small text-muted cursor-pointer" htmlFor="userTermsCheck">
                        Tôi đồng ý với <a href="#terms" className="text-brand fw-semibold text-decoration-none">Điều khoản dịch vụ</a> và <a href="#privacy" className="text-brand fw-semibold text-decoration-none">Chính sách bảo mật</a> của SportsBooking.
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-brand w-100 py-2.5 fs-6 d-flex align-items-center justify-content-center gap-2 mb-4"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="spinner-border spinner-border-sm text-light" role="status"></div>
                      ) : (
                        <>
                          <span className="fw-bold">Tạo tài khoản ngay</span>
                          <i className="bi bi-arrow-right"></i>
                        </>
                      )}
                    </button>

                    {/* Bottom Links */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 pt-2 border-top small">
                      <button 
                        type="button" 
                        className="btn btn-link p-0 text-decoration-none text-muted d-flex align-items-center gap-1"
                        onClick={() => {
                          setErrorMessage('');
                          setMode('role-select');
                        }}
                      >
                        <i className="bi bi-arrow-left"></i>
                        <span>Quay lại chọn vai trò</span>
                      </button>

                      <div>
                        <span className="text-muted">Đã có tài khoản SportsBooking? </span>
                        <button 
                          type="button" 
                          className="btn btn-link p-0 text-brand fw-bold text-decoration-none"
                          onClick={() => {
                            setErrorMessage('');
                            setMode('login');
                          }}
                        >
                          Đăng nhập ngay
                        </button>
                      </div>
                    </div>

                  </form>
                </div>
              </div>
            </div>

          </div>
        </main>
      )}

      {/* ======================================================== */}
      {/* 4. MÀN HÌNH ĐĂNG NHẬP (BỐ CỤC 2 CỘT CHUẨN ĐẸP)            */}
      {/* ======================================================== */}
      {mode === 'login' && (
        <main className="flex-grow-1 d-flex align-items-center py-4 py-md-5">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-xl-11 col-lg-12">
                <div className="auth-container-card p-3 p-md-4">
                  <div className="row g-4 align-items-stretch">
                    
                    {/* CỘT TRÁI: BANNER THÔNG TIN WEBSITE SPORTSBOOKING */}
                    <div className="col-lg-5 d-none d-lg-block">
                      <div 
                        className="auth-visual-hero h-100 d-flex flex-column justify-content-between p-4"
                        style={{
                          backgroundImage: `url('https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1000&q=80')`
                        }}
                      >
                        <div className="auth-visual-content">
                          <div className="d-inline-flex align-items-center gap-2 glass-pill px-3 py-2">
                            <i className="bi bi-trophy-fill text-warning"></i>
                            <span className="fw-bold tracking-wide">SportsBooking</span>
                          </div>
                        </div>

                        <div className="auth-visual-content mt-auto">
                          <div 
                            className="glass-card-testimonial p-4 rounded-4"
                            style={{
                              background: 'rgba(11, 77, 60, 0.85)',
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

                    {/* CỘT PHẢI: FORM ĐĂNG NHẬP */}
                    <div className="col-lg-7 d-flex flex-column justify-content-center px-lg-4">
                      
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="badge-pill-brand d-inline-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
                          <i className="bi bi-people-fill text-brand"></i>
                          <span>CỘNG ĐỒNG THỂ THAO #1</span>
                        </div>
                        <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                          <i className="bi bi-shield-lock-fill text-success me-1"></i>
                          Bảo mật SSL 256-Bit
                        </span>
                      </div>

                      <h2 className="fw-bold text-brand-dark mb-1">
                        Đăng nhập tài khoản
                      </h2>
                      <p className="text-muted small mb-3">
                        Chào mừng bạn quay trở lại với nền tảng đặt sân thể thao SportsBooking!
                      </p>

                      {/* Social Login Buttons */}
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
                        HOẶC TIẾP TỤC VỚI EMAIL / SĐT
                      </div>

                      {errorMessage && (
                        <div className="alert alert-danger py-2 small mb-3">
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          {errorMessage}
                        </div>
                      )}

                      <form onSubmit={handleSubmitLogin}>
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
                              setMode('role-select');
                            }}
                          >
                            Đăng ký ngay
                          </button>
                        </div>

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
      )}

      {/* ======================================================== */}
      {/* AUTH FOOTER (ĐỒNG NHẤT TOÀN BỘ)                         */}
      {/* ======================================================== */}
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
