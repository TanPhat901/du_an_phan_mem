import React from 'react';

export default function Navbar({ onOpenAuth, onOpenMyBookings, activeTab, setActiveTab }) {
  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3">
      <div className="container">
        {/* Brand Logo */}
        <a className="navbar-brand d-flex align-items-center gap-2" href="#">
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

          {/* User Auth Buttons */}
          <div className="d-flex align-items-center gap-3">
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
          </div>
        </div>
      </div>
    </nav>
  );
}

