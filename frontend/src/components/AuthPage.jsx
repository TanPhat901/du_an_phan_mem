import React, { useState, useEffect } from 'react';

export default function AuthPage({
  initialMode = 'register',
  initialRole = 'USER',
  onBackToHome,
  onAuthSuccess
}) {
  const [mode, setMode] = useState(initialMode === 'login' ? 'login' : 'register');
  const [role, setRole] = useState(initialRole === 'OWNER' ? 'OWNER' : 'USER');
  const [sportTypeOptions, setSportTypeOptions] = useState([]);

  // Common registration fields
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Extra fields when registering as OWNER
  const [courtName, setCourtName] = useState('');
  const [sportTypeId, setSportTypeId] = useState('');
  const [sportType, setSportType] = useState('');
  const [courtAddress, setCourtAddress] = useState('');
  const [managerName, setManagerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [courtDescription, setCourtDescription] = useState('');

  // Login fields
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, text: '', color: '#e5e7eb' };
    if (pwd.length < 6) return { level: 1, text: 'Yếu', color: '#ef4444' };
    if (pwd.length < 8) return { level: 2, text: 'Trung bình', color: '#f59e0b' };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { level: 4, text: 'Mạnh', color: '#10b981' };
    }
    return { level: 3, text: 'Khá', color: '#10b981' };
  };

  const strength = getPasswordStrength(password);

  useEffect(() => {
    let cancelled = false;
    fetch('http://localhost:5000/api/courts/sport-types')
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray(json?.data) ? json.data : [];
        setSportTypeOptions(rows);
        if (rows.length > 0) {
          setSportTypeId((prev) => prev || String(rows[0].sport_type_id));
          setSportType((prev) => prev || rows[0].name || '');
        }
      })
      .catch(() => {
        if (!cancelled) setSportTypeOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

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
          if (!data.data?.token) throw new Error('Máy chủ không trả về JWT hợp lệ.');
          onAuthSuccess(data.data, rememberMe);
        } else {
          setErrorMessage(data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
        }
      } catch {
        setErrorMessage('Không thể kết nối máy chủ để đăng nhập.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      if (!fullName.trim() || !emailOrPhone.trim() || !password) {
        setErrorMessage('Vui lòng điền đầy đủ thông tin bắt buộc (*).');
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Mật khẩu tối thiểu 6 ký tự.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không khớp.');
        return;
      }

      if (!agreeTerms) {
        setErrorMessage('Vui lòng đồng ý với Điều khoản dịch vụ.');
        return;
      }

      if (role === 'OWNER') {
        if (!courtName.trim()) {
          setErrorMessage('Vui lòng nhập Tên sân / cụm sân.');
          return;
        }
        if (!courtAddress.trim()) {
          setErrorMessage('Vui lòng nhập Địa chỉ sân.');
          return;
        }

        const isEmail = emailOrPhone.includes('@');
        const cleanEmail = isEmail ? emailOrPhone.trim() : `${emailOrPhone.trim()}@owner.sportsbooking.vn`;
        const cleanPhone = (contactPhone || (!isEmail ? emailOrPhone : '')).trim();
        if (!cleanPhone) {
          setErrorMessage('Vui lòng nhập Số điện thoại liên hệ.');
          return;
        }

        setLoading(true);
        try {
          const response = await fetch('http://localhost:5000/api/auth/register-owner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              representativeName: (managerName || fullName).trim(),
              phone: cleanPhone,
              facilityName: courtName.trim(),
              sportTypeId: sportTypeId ? Number(sportTypeId) : undefined,
              sportTypes: sportType ? [sportType] : [],
              detailedAddress: courtAddress.trim(),
              description: courtDescription.trim(),
              emailOrPhone: emailOrPhone.trim()
            })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            if (data.data?.token) onAuthSuccess(data.data, rememberMe);
            else {
              setSuccessMessage('Đăng ký thành công. Vui lòng đăng nhập.');
              setMode('login');
            }
          } else {
            setErrorMessage(data.message || 'Đăng ký không thành công.');
          }
        } catch {
          setErrorMessage('Không thể kết nối máy chủ để đăng ký chủ sân.');
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            emailOrPhone: emailOrPhone.trim(),
            password
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          if (data.data?.token) onAuthSuccess(data.data, rememberMe);
          else {
            setSuccessMessage('Đăng ký thành công. Vui lòng đăng nhập.');
            setMode('login');
          }
        } else {
          setErrorMessage(data.message || 'Đăng ký không thành công.');
        }
      } catch {
        setErrorMessage('Không thể kết nối máy chủ để đăng ký.');
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setMode(initialMode === 'login' ? 'login' : 'register');
    setRole(initialRole === 'OWNER' ? 'OWNER' : 'USER');
    setErrorMessage('');
    setSuccessMessage('');
  }, [initialMode, initialRole]);

  const showcaseContent =
    mode === 'login'
      ? {
          stepNum: '01',
          eyebrow: 'CHÀO MỪNG TRỞ LẠI',
          titleLine1: 'Sân đã sẵn sàng.',
          titleLine2: 'Chỉ chờ bạn ra sân.',
          subtitle: 'Đăng nhập để theo dõi trạng thái xác nhận, mở vé QR check-in và đặt lại cụm sân yêu thích.',
          highlights: [
            {
              icon: 'bi-calendar2-check',
              title: 'Lịch trống trực tiếp',
              desc: 'Kiểm tra từng sân con và khung giờ còn trống theo ngày chơi.'
            },
            {
              icon: 'bi-qr-code-scan',
              title: 'Vé điện tử & Check-in gọn',
              desc: 'Mã QR check-in và thông tin VietQR lưu sẵn trong Lịch đặt của tôi.'
            },
            {
              icon: 'bi-star',
              title: 'Đánh giá sau check-in',
              desc: 'Chia sẻ trải nghiệm thực tế sau mỗi trận đấu đã hoàn tất.'
            }
          ]
        }
      : role === 'OWNER'
        ? {
            stepNum: '03',
            eyebrow: 'ĐỐI TÁC CHỦ SÂN',
            titleLine1: 'Vận hành cụm sân.',
            titleLine2: 'Tối ưu doanh thu.',
            subtitle: 'Khởi tạo cơ sở đầu tiên, tự thiết lập khung giờ và quản lý toàn bộ đơn đặt trên một nền tảng.',
            highlights: [
              {
                icon: 'bi-grid-3x3-gap',
                title: 'Ma trận lịch theo thời gian thực',
                desc: 'Duyệt đơn online, nhận khách tại quầy và khóa giờ bảo trì nhanh.'
              },
              {
                icon: 'bi-qr-code',
                title: 'Thanh toán VietQR trực tiếp',
                desc: 'Tự động sinh mã chuyển khoản theo tài khoản ngân hàng của cơ sở.'
              },
              {
                icon: 'bi-bar-chart-line',
                title: 'Theo dõi công suất & doanh thu',
                desc: 'Biểu đồ 7 ngày, thống kê theo bộ môn và xuất file CSV đối soát.'
              }
            ]
          }
        : {
            stepNum: '02',
            eyebrow: 'THÀNH VIÊN MỚI',
            titleLine1: 'Tìm sân chuẩn gu.',
            titleLine2: 'Đặt lịch trong giây lát.',
            subtitle: 'Tạo tài khoản miễn phí để lưu sân quen, đặt giờ chơi nhanh và quản lý lịch hẹn minh bạch.',
            highlights: [
              {
                icon: 'bi-search',
                title: 'Lọc theo bộ môn & khu vực',
                desc: 'Tìm nhanh cụm sân phù hợp cùng tiện ích đi kèm và giá theo giờ.'
              },
              {
                icon: 'bi-clock',
                title: 'Tránh hoàn toàn trùng lịch',
                desc: 'Giữ chỗ ngay theo từng khung giờ thực tế do chủ sân mở đặt.'
              },
              {
                icon: 'bi-heart',
                title: 'Lưu cụm sân yêu thích',
                desc: 'Truy cập nhanh các sân bạn hay chơi chỉ với một lần chạm.'
              }
            ]
          };

  const switchMode = (nextMode) => {
    setErrorMessage('');
    setSuccessMessage('');
    setMode(nextMode);
  };

  return (
    <div className="auth-page-wrapper">
      {/* Top Bar matching Navbar Logo Lockup */}
      <header className="py-3 bg-white border-bottom">
        <div className="container d-flex align-items-center justify-content-between">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onBackToHome();
            }}
            className="text-decoration-none d-flex align-items-center gap-2"
          >
            <span className="brand-mark-box">
              <i className="bi bi-trophy-fill"></i>
            </span>
            <span className="fw-bold fs-5 text-brand-dark">SportsBooking</span>
          </a>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm rounded-3 px-3"
            onClick={onBackToHome}
          >
            <i className="bi bi-arrow-left me-1"></i>Về trang chủ
          </button>
        </div>
      </header>

      {/* Split Editorial Auth Experience */}
      <main className="flex-grow-1 d-flex align-items-center py-4 py-lg-5">
        <div className="container" style={{ maxWidth: '1040px' }}>
          <div className="row g-4 align-items-stretch">
            {/* Left Deep Forest Editorial Showcase Panel */}
            <div className="col-lg-5">
              <div className="auth-showcase-panel h-100 d-flex flex-column">
                <div className="auth-media-window">
                  <img
                    src="/hero-court.jpg"
                    alt="Cụm sân thể thao ngoài trời SportsBooking"
                    className="w-100 h-100 object-fit-cover"
                  />
                  <div
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(8,56,44,0.22) 0%, rgba(11,77,60,0.52) 55%, #0b4d3c 100%)'
                    }}
                  ></div>

                  <div className="position-absolute top-0 start-0 end-0 p-3 d-flex justify-content-between align-items-start">
                    <span
                      className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill text-white"
                      style={{
                        backgroundColor: 'rgba(11, 31, 24, 0.58)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.07em'
                      }}
                    >
                      <span className="hero-eyebrow-dot"></span>
                      SPORTSBOOKING
                    </span>
                    <span className="fs-4 fw-light text-white opacity-75 lh-1">{showcaseContent.stepNum}</span>
                  </div>
                </div>

                <div className="p-4 pt-2 flex-grow-1 d-flex flex-column">
                  <div
                    className="text-uppercase fw-bold mb-2"
                    style={{ fontSize: '0.7rem', letterSpacing: '0.09em', color: '#86efac' }}
                  >
                    {showcaseContent.eyebrow}
                  </div>

                  <h2
                    className="fw-bold mb-2"
                    style={{ fontSize: 'clamp(1.65rem, 2.4vw, 2.05rem)', lineHeight: 1.12, letterSpacing: '-0.02em' }}
                  >
                    <span className="d-block text-white">{showcaseContent.titleLine1}</span>
                    <span className="d-block" style={{ color: '#86efac' }}>
                      {showcaseContent.titleLine2}
                    </span>
                  </h2>

                  <p className="small mb-4" style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>
                    {showcaseContent.subtitle}
                  </p>

                  <div className="d-flex flex-column gap-3 mt-auto">
                    {showcaseContent.highlights.map((item) => (
                      <div
                        key={item.title}
                        className="d-flex align-items-start gap-3 pt-3"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
                      >
                        <span className="auth-feature-icon">
                          <i className={`bi ${item.icon}`}></i>
                        </span>
                        <div>
                          <div className="fw-semibold text-white small">{item.title}</div>
                          <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.45 }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Crisp Floating Form Card */}
            <div className="col-lg-7">
              <div className="auth-form-card h-100 d-flex flex-column justify-content-center">
                {/* Editorial Underline Mode Tabs */}
                <div className="d-flex gap-4 border-bottom mb-4">
                  <button
                    type="button"
                    className={`search-tab-btn pb-2 ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => switchMode('login')}
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    className={`search-tab-btn pb-2 ${mode === 'register' ? 'active' : ''}`}
                    onClick={() => switchMode('register')}
                  >
                    Đăng ký tài khoản
                  </button>
                </div>

                <div className="mb-4">
                  <h1 className="h4 fw-bold text-dark mb-1">
                    {mode === 'login'
                      ? 'Đăng nhập tài khoản'
                      : role === 'OWNER'
                        ? 'Đăng ký đối tác Chủ sân'
                        : 'Tạo tài khoản mới'}
                  </h1>
                  <p className="text-muted small mb-0">
                    {mode === 'login'
                      ? 'Nhập email hoặc số điện thoại để vào trang đặt sân và lịch của bạn.'
                      : role === 'OWNER'
                        ? 'Hoàn tất thông tin tài khoản và hồ sơ cụm sân đầu tiên bên dưới.'
                        : 'Điền thông tin cá nhân để bắt đầu đặt sân trên SportsBooking.'}
                  </p>
                </div>

                {successMessage && (
                  <div className="alert alert-success py-2 px-3 small rounded-3 d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-check-circle-fill flex-shrink-0"></i>
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="alert alert-danger py-2 px-3 small rounded-3 d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {mode === 'login' ? (
                    <>
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                          Email hoặc Số điện thoại
                        </label>
                        <div className="auth-input-group">
                          <i className="bi bi-person auth-input-icon"></i>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="0912345678 hoặc email@domain.com"
                            value={loginInput}
                            onChange={(e) => setLoginInput(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                          Mật khẩu
                        </label>
                        <div className="auth-input-group">
                          <i className="bi bi-lock auth-input-icon"></i>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            className="form-control"
                            placeholder="Nhập mật khẩu"
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

                      <div className="form-check mb-4">
                        <input
                          className="form-check-input cursor-pointer"
                          type="checkbox"
                          id="rememberMeCheck"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <label className="form-check-label small text-muted cursor-pointer" htmlFor="rememberMeCheck">
                          Ghi nhớ đăng nhập trên thiết bị này
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-brand w-100 py-2 rounded-3 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                        disabled={loading}
                      >
                        <span>{loading ? 'Đang xử lý...' : 'Đăng nhập'}</span>
                        {!loading && <i className="bi bi-arrow-right"></i>}
                      </button>

                      <div className="text-center small text-muted">
                        Chưa có tài khoản?{' '}
                        <button
                          type="button"
                          className="btn btn-link p-0 fw-semibold text-decoration-none text-brand-dark small"
                          onClick={() => switchMode('register')}
                        >
                          Đăng ký ngay
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 2-Card Tactile Role Picker */}
                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary mb-2">
                          Bạn muốn tham gia với vai trò
                        </label>
                        <div className="row g-2">
                          <div className="col-6">
                            <button
                              type="button"
                              className={`auth-role-card ${role === 'USER' ? 'active' : ''}`}
                              onClick={() => {
                                setErrorMessage('');
                                setSuccessMessage('');
                                setRole('USER');
                              }}
                            >
                              <span
                                className="rounded-2 d-inline-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  backgroundColor: role === 'USER' ? '#0b4d3c' : '#f3f4f6',
                                  color: role === 'USER' ? '#ffffff' : '#4b5563'
                                }}
                              >
                                <i className="bi bi-person-check"></i>
                              </span>
                              <div className="min-w-0 flex-grow-1">
                                <div className="fw-bold small text-dark text-truncate">Người đặt sân</div>
                                <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                                  Tìm & đặt giờ chơi
                                </div>
                              </div>
                            </button>
                          </div>
                          <div className="col-6">
                            <button
                              type="button"
                              className={`auth-role-card ${role === 'OWNER' ? 'active' : ''}`}
                              onClick={() => {
                                setErrorMessage('');
                                setSuccessMessage('');
                                setRole('OWNER');
                              }}
                            >
                              <span
                                className="rounded-2 d-inline-flex align-items-center justify-content-center flex-shrink-0"
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  backgroundColor: role === 'OWNER' ? '#0b4d3c' : '#f3f4f6',
                                  color: role === 'OWNER' ? '#ffffff' : '#4b5563'
                                }}
                              >
                                <i className="bi bi-building-check"></i>
                              </span>
                              <div className="min-w-0 flex-grow-1">
                                <div className="fw-bold small text-dark text-truncate">Chủ sân</div>
                                <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                                  Quản lý cụm sân
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold text-secondary mb-1">Họ và tên *</label>
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

                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold text-secondary mb-1">
                            Email hoặc Số điện thoại *
                          </label>
                          <div className="auth-input-group">
                            <i className="bi bi-envelope auth-input-icon"></i>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="0912345678 hoặc email"
                              value={emailOrPhone}
                              onChange={(e) => setEmailOrPhone(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="row g-3 mb-2">
                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold text-secondary mb-1">Mật khẩu *</label>
                          <div className="auth-input-group">
                            <i className="bi bi-lock auth-input-icon"></i>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="form-control"
                              placeholder="Tối thiểu 6 ký tự"
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
                        </div>

                        <div className="col-sm-6">
                          <label className="form-label small fw-semibold text-secondary mb-1">Xác nhận mật khẩu *</label>
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
                      </div>

                      {password && (
                        <div className="mb-3">
                          <div className="d-flex justify-content-between small text-muted">
                            <span>Độ mạnh mật khẩu:</span>
                            <span style={{ color: strength.color, fontWeight: 600 }}>{strength.text}</span>
                          </div>
                          <div className="strength-bar-wrapper">
                            <div className="strength-segment" style={{ backgroundColor: strength.level >= 1 ? strength.color : '#e5e7eb' }}></div>
                            <div className="strength-segment" style={{ backgroundColor: strength.level >= 2 ? strength.color : '#e5e7eb' }}></div>
                            <div className="strength-segment" style={{ backgroundColor: strength.level >= 3 ? strength.color : '#e5e7eb' }}></div>
                            <div className="strength-segment" style={{ backgroundColor: strength.level >= 4 ? strength.color : '#e5e7eb' }}></div>
                          </div>
                        </div>
                      )}

                      {!password && <div className="mb-3"></div>}

                      {role === 'OWNER' && (
                        <div className="auth-owner-panel mb-3">
                          <div className="hero-eyebrow mb-2">
                            <span className="hero-eyebrow-dot"></span>
                            <span>THÔNG TIN CỤM SÂN ĐẦU TIÊN</span>
                          </div>

                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-secondary mb-1">Tên cụm sân *</label>
                            <input
                              type="text"
                              className="form-control bg-white"
                              placeholder="Ví dụ: Sân Cầu Lông Tân Phú"
                              value={courtName}
                              onChange={(e) => setCourtName(e.target.value)}
                              required
                            />
                          </div>

                          <div className="row g-2 mb-3">
                            <div className="col-sm-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">Bộ môn chính *</label>
                              <select
                                className="form-select bg-white"
                                value={sportTypeId}
                                onChange={(e) => {
                                  const nextId = e.target.value;
                                  setSportTypeId(nextId);
                                  const found = sportTypeOptions.find((st) => String(st.sport_type_id) === String(nextId));
                                  setSportType(found ? found.name : '');
                                }}
                                required
                              >
                                {sportTypeOptions.length === 0 ? (
                                  <option value="">Đang tải...</option>
                                ) : (
                                  sportTypeOptions.map((st) => (
                                    <option key={st.sport_type_id} value={st.sport_type_id}>
                                      {st.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                            <div className="col-sm-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">Số điện thoại liên hệ *</label>
                              <input
                                type="tel"
                                className="form-control bg-white"
                                placeholder="0901234567"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="form-label small fw-semibold text-secondary mb-1">Địa chỉ sân *</label>
                            <input
                              type="text"
                              className="form-control bg-white"
                              placeholder="Số nhà, đường, phường/xã, quận/huyện"
                              value={courtAddress}
                              onChange={(e) => setCourtAddress(e.target.value)}
                              required
                            />
                          </div>

                          <div className="row g-2">
                            <div className="col-sm-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">Tên người quản lý</label>
                              <input
                                type="text"
                                className="form-control bg-white"
                                placeholder="Nếu khác họ tên tài khoản"
                                value={managerName}
                                onChange={(e) => setManagerName(e.target.value)}
                              />
                            </div>
                            <div className="col-sm-6">
                              <label className="form-label small fw-semibold text-secondary mb-1">Mô tả ngắn</label>
                              <input
                                type="text"
                                className="form-control bg-white"
                                placeholder="Số lượng sân, tiện ích cơ bản..."
                                value={courtDescription}
                                onChange={(e) => setCourtDescription(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="form-check mb-4">
                        <input
                          className="form-check-input cursor-pointer"
                          type="checkbox"
                          id="termsCheck"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          required
                        />
                        <label className="form-check-label small text-muted cursor-pointer" htmlFor="termsCheck">
                          Tôi đồng ý với Điều khoản sử dụng của SportsBooking.
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-brand w-100 py-2 rounded-3 fw-semibold mb-3 d-flex align-items-center justify-content-center gap-2"
                        disabled={loading}
                      >
                        <span>
                          {loading
                            ? 'Đang xử lý...'
                            : role === 'OWNER'
                              ? 'Đăng ký chủ sân'
                              : 'Tạo tài khoản'}
                        </span>
                        {!loading && <i className="bi bi-arrow-right"></i>}
                      </button>

                      <div className="text-center small text-muted">
                        Đã có tài khoản?{' '}
                        <button
                          type="button"
                          className="btn btn-link p-0 fw-semibold text-decoration-none text-brand-dark small"
                          onClick={() => switchMode('login')}
                        >
                          Đăng nhập
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
