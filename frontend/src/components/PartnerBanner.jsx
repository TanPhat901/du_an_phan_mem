import React from 'react';

export default function PartnerBanner({ onOpenAuth, onOpenOwnerDashboard }) {
  return (
    <section className="partner-forest-band">
      <div className="container">
        <div className="row align-items-center g-4">
          <div className="col-lg-7">
            <div
              className="text-uppercase fw-bold mb-2"
              style={{ fontSize: '0.72rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.65)' }}
            >
              DÀNH CHO CHỦ SÂN
            </div>

            <h2
              className="fw-bold mb-3"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)', lineHeight: 1.12, letterSpacing: '-0.02em' }}
            >
              <span className="d-block text-white">Lấp đầy sân trống.</span>
              <span className="d-block" style={{ color: '#86efac' }}>Tăng doanh thu.</span>
            </h2>

            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '500px', lineHeight: 1.6 }}>
              Quản lý cụm sân, thiết lập khung giờ, xác nhận lịch đặt và theo dõi doanh thu dễ dàng trên một nền tảng.
            </p>

            <div className="d-flex flex-wrap align-items-center gap-3">
              <button
                type="button"
                className="btn btn-light text-brand-dark fw-semibold px-4 py-2 rounded-3"
                onClick={() => onOpenAuth?.('register-owner')}
              >
                Đăng sân của bạn <i className="bi bi-arrow-right ms-1"></i>
              </button>
              {onOpenOwnerDashboard && (
                <button
                  type="button"
                  className="btn btn-outline-light px-4 py-2 rounded-3"
                  onClick={onOpenOwnerDashboard}
                >
                  Kênh chủ sân
                </button>
              )}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="partner-stat-col d-flex align-items-center gap-4 pt-3 pt-lg-0">
              <div
                className="fw-bold text-white lh-1 flex-shrink-0"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3rem)', letterSpacing: '-0.03em' }}
              >
                24/7
              </div>
              <div>
                <div className="small mb-2" style={{ color: 'rgba(255,255,255,0.82)', maxWidth: '210px', lineHeight: 1.45 }}>
                  Quản lý lịch sân & duyệt đơn theo thời gian thực
                </div>
                <i className="bi bi-lightning-charge fs-5" style={{ color: '#86efac' }}></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
