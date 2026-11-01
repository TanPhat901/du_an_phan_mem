import React from 'react';

export default function Navbar({ onOpenAuth, onOpenMyBookings, activeTab, setActiveTab, currentUser, onLogout }) {
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3">
      <div className="container">
        {/* Brand Logo */}
        <a className="navbar-brand d-flex align-items-center gap-2" href="#" onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}>
          <div className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle" style={{ width: '38px', height: '38px' }}>
            <i className="bi bi-trophy-fill text-brand fs-5"></i>
          </div>
          <span className="fw-bold fs-4 text-brand-dark tracking-tight">SportsBooking</span>
        </a>

        {/* Mobile Toggle */}
        <button 
          className="navbar-toggler border-0" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarContent"
          aria-controls="navbarContent" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Nav Links */}
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3">
            <li className="nav-item">
              <a 
                className={`nav-link nav-link-custom ${activeTab === 'home' ? 'active' : ''}`} 
                href="#home"
                onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}
              >
                Trang chủ
              </a>
            </li>
            <li className="nav-item">
              <a 
                className={`nav-link nav-link-custom ${activeTab === 'search' ? 'active' : ''}`} 
                href="#search-section"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('search');
                  document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Tìm sân
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link nav-link-custom" 
                href="#my-bookings"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenMyBookings();
                }}
              >
                Lịch đặt
              </a>
            </li>
            <li className="nav-item">
              <a 
                className="nav-link nav-link-custom" 
                href="#guide"
                onClick={(e) => {
                  e.preventDefault();
                  alert('SportsBooking: Chọn sân yêu thích -> Chọn khung giờ -> Đặt cọc hoặc thanh toán trực tiếp tại sân. Rất đơn giản!');
                }}
              >
                Hướng dẫn
              </a>
            </li>
          </ul>

          {/* User Auth Buttons / Profile */}
          <div className="d-flex align-items-center gap-3">
            {currentUser ? (
              <div className="d-flex align-items-center gap-2">
                <div 
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                  style={{ width: '38px', height: '38px', backgroundColor: currentUser.role === 'OWNER' ? '#0b4d3c' : '#10b981' }}
                >
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="d-none d-sm-block text-start">
                  <div className="d-flex align-items-center gap-1">
                    <span className="small fw-bold text-dark">{currentUser.fullName}</span>
                    <span 
                      className={`badge rounded-pill ${currentUser.role === 'OWNER' ? 'bg-success text-white' : (currentUser.role === 'ADMIN' ? 'bg-danger text-white' : 'bg-light text-success border border-success-subtle')}`}
                      style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                    >
                      {currentUser.role === 'OWNER' ? '🏢 Chủ sân' : (currentUser.role === 'ADMIN' ? '👑 Admin' : '👤 Người chơi')}
                    </span>
                  </div>
                  {currentUser.facilityName && (
                    <div className="text-muted text-truncate" style={{ fontSize: '0.72rem', maxWidth: '150px' }}>
                      {currentUser.facilityName}
                    </div>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-link p-0 text-danger small text-decoration-none d-flex align-items-center gap-1"
                    style={{ fontSize: '0.75rem' }}
                    onClick={onLogout}
                  >
                    <i className="bi bi-box-arrow-right"></i>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button 
                  className="btn btn-link text-decoration-none text-dark fw-semibold d-flex align-items-center gap-2 p-0"
                  onClick={() => onOpenAuth('login')}
                >
                  <i className="bi bi-person fs-5"></i>
                  <span>Đăng nhập</span>
                </button>
                <button 
                  className="btn btn-brand"
                  onClick={() => onOpenAuth('register')}
                >
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
