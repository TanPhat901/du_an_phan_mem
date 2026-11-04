import React from 'react';

export default function Footer({ onOpenAuth, onOpenOwnerDashboard }) {
  return (
    <footer className="footer-dark pt-5 pb-4 mt-auto">
      <div className="container">
        {/* Top Footer Row */}
        <div className="row align-items-center justify-content-between pb-4 border-bottom border-secondary border-opacity-25 gy-3">
          {/* Logo & Slogan */}
          <div className="col-md-5">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="d-flex align-items-center justify-content-center bg-white bg-opacity-10 rounded-circle" style={{ width: '34px', height: '34px' }}>
                <i className="bi bi-trophy-fill text-success fs-6"></i>
              </div>
              <span className="fw-bold fs-4 text-white">SportsBooking</span>
            </div>
            <p className="text-white-50 small mb-0">
              Nền tảng đặt sân thể thao #1 Việt Nam - Đa cụm sân, đa bộ môn & đa chủ sân
            </p>
          </div>

          {/* Links & Hotline */}
          <div className="col-md-7 d-flex flex-wrap align-items-center justify-content-md-end gap-3 gap-md-4">
            <a 
              href="#guide" 
              className="small"
              onClick={(e) => {
                e.preventDefault();
                alert('Quy trình đặt sân trực tuyến an toàn & nhanh chóng với SportsBooking.');
              }}
            >
              Hướng dẫn
            </a>
            {onOpenOwnerDashboard && (
              <a 
                href="#owner-portal" 
                className="small text-success fw-bold"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenOwnerDashboard();
                }}
              >
                Kênh Chủ Sân
              </a>
            )}
            <a 
              href="#login" 
              className="small"
              onClick={(e) => {
                e.preventDefault();
                onOpenAuth('login');
              }}
            >
              Đăng nhập
            </a>
            <a 
              href="#register" 
              className="small"
              onClick={(e) => {
                e.preventDefault();
                onOpenAuth('register');
              }}
            >
              Đăng ký
            </a>

            <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 text-white rounded-pill px-3 py-1 small fw-semibold">
              <i className="bi bi-telephone-fill text-success"></i>
              <span>Hotline: 1900 8888</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Row */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-4 small text-white-50 gy-2">
          <p className="mb-2 mb-md-0">
            © 2024 SportsBooking Vietnam. Nền tảng kết nối người chơi và chủ sân thể thao toàn quốc.
          </p>
          <div className="d-flex align-items-center gap-3">
            <span className="cursor-pointer hover-white">
              Tiếng Việt <i className="bi bi-chevron-down small"></i>
            </span>
            <span>•</span>
            <span>Hà Nội & TP.HCM & Đà Nẵng</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
