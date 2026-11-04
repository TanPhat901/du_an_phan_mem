import React from 'react';

export default function PartnerBanner({ onOpenPartnerModal, onOpenAuth, onOpenOwnerDashboard }) {
  return (
    <section className="container py-4 mb-5">
      <div className="partner-cta-box p-4 p-md-5">
        <div className="row align-items-center">
          <div className="col-lg-8">
            {/* Tag */}
            <div className="d-inline-block bg-white bg-opacity-20 text-white rounded-pill px-3 py-1 small fw-semibold mb-3">
              HỢP TÁC VỚI ĐỐI TÁC CHỦ SÂN
            </div>

            {/* Title */}
            <h2 className="display-6 fw-bold mb-3 lh-sm">
              Tối ưu công suất & Tăng 40% doanh thu mỗi tháng
            </h2>

            {/* Description */}
            <p className="text-white-50 mb-4" style={{ maxWidth: '640px', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Quản lý lịch sân tự động, loại bỏ tình trạng hủy giờ đột ngột và tiếp cận hơn 500.000 người chơi thể thao thường xuyên tại khu vực lân cận của bạn.
            </p>

            {/* CTA Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-3">
              <button 
                type="button" 
                className="btn btn-light text-brand-dark fw-bold px-4 py-2 rounded-3 shadow-sm"
                onClick={() => onOpenAuth ? onOpenAuth('register-owner') : onOpenPartnerModal()}
              >
                Đăng ký chủ sân ngay
              </button>
              {onOpenOwnerDashboard && (
                <button 
                  type="button"
                  className="btn btn-outline-light fw-bold px-4 py-2 rounded-3"
                  onClick={onOpenOwnerDashboard}
                >
                  <i className="bi bi-speedometer2 me-1"></i> Truy cập Kênh Chủ Sân
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
