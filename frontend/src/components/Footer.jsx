import React, { useState } from 'react';

export default function Footer({ onOpenAuth, onOpenOwnerDashboard }) {
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <>
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
                Nền tảng đặt sân thể thao trực tuyến - Kết nối người chơi và chủ sân trên toàn quốc
              </p>
            </div>

            {/* Links */}
            <div className="col-md-7 d-flex flex-wrap align-items-center justify-content-md-end gap-3 gap-md-4">
              <a
                href="#guide"
                className="small"
                onClick={(e) => {
                  e.preventDefault();
                  setShowGuideModal(true);
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
            </div>
          </div>

          {/* Bottom Footer Row */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-4 small text-white-50 gy-2">
            <p className="mb-2 mb-md-0">
              © 2026 SportsBooking. Nền tảng kết nối người chơi và chủ sân thể thao.
            </p>
            <div className="d-flex align-items-center gap-3">
              <span className="cursor-pointer hover-white">
                Tiếng Việt
              </span>
              <span>•</span>
              <span>Đa khu vực toàn quốc</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Guide Modal */}
      {showGuideModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1065 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-4 border-0 shadow-lg">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-brand-dark">
                  <i className="bi bi-book-half text-brand me-2"></i>
                  Hướng dẫn đặt sân nhanh trên SportsBooking
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowGuideModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <span className="badge bg-success mb-2">Bước 1</span>
                      <h6 className="fw-bold text-dark">Tìm sân & Lọc ngày</h6>
                      <p className="small text-muted mb-0">
                        Chọn khu vực, bộ môn, ngày chơi hoặc bật lọc &ldquo;Còn sân trống&rdquo; để xem các cơ sở đang mở slot theo thời gian thực.
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <span className="badge bg-success mb-2">Bước 2</span>
                      <h6 className="fw-bold text-dark">Chọn sân con & Khung giờ</h6>
                      <p className="small text-muted mb-0">
                        Vào chi tiết sân, chọn đúng mặt sân thi đấu và khung giờ trống (có hiển thị giá giờ thường &amp; giờ vàng).
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <span className="badge bg-success mb-2">Bước 3</span>
                      <h6 className="fw-bold text-dark">Nhận Vé QR &amp; Ra sân</h6>
                      <p className="small text-muted mb-0">
                        Chọn thanh toán tại quầy hoặc quét VietQR chủ sân. Xuất trình Vé điện tử trong mục &ldquo;Lịch đặt của tôi&rdquo; khi check-in.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-3 border bg-success-subtle bg-opacity-25 small">
                  <div className="fw-bold text-brand-dark mb-1">
                    <i className="bi bi-shield-check me-1"></i>Quyền lợi người chơi
                  </div>
                  <ul className="mb-0 ps-3 text-dark">
                    <li>Chủ động hủy lịch đặt trong mục <strong>Lịch đặt của tôi</strong> để giải phóng lại khung giờ.</li>
                    <li>Lưu nhanh các cụm sân yêu thích và gửi đánh giá thực tế sau khi hoàn tất Check-in tại sân.</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer border-0">
                <button type="button" className="btn btn-brand px-4" onClick={() => setShowGuideModal(false)}>
                  Đã hiểu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
