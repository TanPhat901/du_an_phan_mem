import React, { useState } from 'react';

export default function Footer({ onOpenAuth, onOpenOwnerDashboard }) {
  const [showGuideModal, setShowGuideModal] = useState(false);

  return (
    <>
      <footer className="bg-white border-top py-4 mt-auto">
        <div className="container">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2">
              <span className="brand-mark-box">
                <i className="bi bi-trophy-fill"></i>
              </span>
              <span className="fw-bold text-brand-dark">SportsBooking</span>
            </div>

            <p className="text-muted small mb-0">
              © 2026 SportsBooking • Nền tảng đặt sân thể thao trực tuyến.
            </p>

            <div className="d-flex flex-wrap align-items-center gap-3 gap-md-4 small">
              <a
                href="#guide"
                className="text-secondary text-decoration-none"
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
                  className="text-brand fw-semibold text-decoration-none"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenOwnerDashboard();
                  }}
                >
                  Kênh chủ sân
                </a>
              )}
              <a
                href="#login"
                className="text-secondary text-decoration-none"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenAuth('login');
                }}
              >
                Đăng nhập
              </a>
              <a
                href="#register"
                className="text-secondary text-decoration-none"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenAuth('register');
                }}
              >
                Đăng ký
              </a>
            </div>
          </div>
        </div>
      </footer>

      {showGuideModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1065 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content rounded-3 border">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-dark">Hướng dẫn đặt sân</h5>
                <button type="button" className="btn-close" onClick={() => setShowGuideModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="small fw-bold text-brand-dark mb-1">1. Tìm sân & lọc ngày</div>
                      <p className="small text-muted mb-0">
                        Chọn bộ môn, khu vực và ngày chơi để xem các cụm sân đang còn khung giờ trống.
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="small fw-bold text-brand-dark mb-1">2. Chọn sân con & giờ chơi</div>
                      <p className="small text-muted mb-0">
                        Vào chi tiết cụm sân, chọn sân thi đấu, khung giờ trống và gửi yêu cầu đặt lịch.
                      </p>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 bg-light rounded-3 border h-100">
                      <div className="small fw-bold text-brand-dark mb-1">3. Xác nhận & Check-in</div>
                      <p className="small text-muted mb-0">
                        Theo dõi trạng thái đơn và mở mã QR trong trang Lịch đặt để check-in tại quầy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-brand btn-sm px-4" onClick={() => setShowGuideModal(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
