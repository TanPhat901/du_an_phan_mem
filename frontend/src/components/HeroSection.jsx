import React, { useState, useEffect } from 'react';

export default function HeroSection({
  featuredCourt = null,
  totalCourts = 0,
  onOpenFeatured
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [featuredCourt?.imageUrl]);

  const reviewCount = Number(featuredCourt?.reviewCount || 0);
  const availCount = Number(featuredCourt?.availableSlotCount || 0);
  const totalSlots = Number(featuredCourt?.totalSlots || 0);

  return (
    <section className="py-5 bg-white position-relative overflow-hidden" id="home">
      <div className="container py-lg-4">
        <div className="row align-items-center g-5">
          {/* Left Column: Hero Copy */}
          <div className="col-lg-6">
            <div className="d-inline-flex align-items-center gap-2 badge-pill-brand mb-4">
              <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '8px', height: '8px' }} role="status"></span>
              <span>HỆ THỐNG ĐẶT SÂN THỂ THAO TRỰC TUYẾN</span>
            </div>

            <h1 className="display-4 fw-extrabold text-brand-dark mb-4 lh-tight" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Tìm sân.<br />
              Chơi hết mình.
            </h1>

            <p className="lead text-muted mb-4" style={{ fontSize: '1.15rem', maxWidth: '480px', lineHeight: 1.6 }}>
              Kiểm tra khung giờ trống theo thời gian thực, gửi yêu cầu đặt sân minh bạch và quản lý vé điện tử tiện lợi.
            </p>

            {/* Checkmark points */}
            <div className="d-flex flex-wrap gap-4 pt-2">
              <div className="d-flex align-items-center gap-2 fw-semibold text-secondary small">
                <i className="bi bi-check2 text-success fs-5 fw-bold"></i>
                <span>
                  {totalCourts > 0
                    ? `${totalCourts} cụm sân đang mở đặt`
                    : 'Lịch trống cập nhật theo thời gian thực'}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2 fw-semibold text-secondary small">
                <i className="bi bi-check2 text-success fs-5 fw-bold"></i>
                <span>Đặt lịch nhanh & Vé QR tại sân</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Featured Facility Preview */}
          <div className="col-lg-6">
            <div className="position-relative d-flex justify-content-center">
              <div
                className="position-absolute rounded-circle"
                style={{
                  width: '320px',
                  height: '320px',
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(255,255,255,0) 70%)',
                  top: '10%',
                  zIndex: 0
                }}
              ></div>

              <div
                className="bg-white rounded-4 shadow-lg p-3 border position-relative"
                style={{
                  maxWidth: '520px',
                  width: '100%',
                  transform: 'perspective(1000px) rotateY(-4deg) rotateX(2deg)',
                  boxShadow: '0 25px 50px -12px rgba(11, 77, 60, 0.18)',
                  zIndex: 1
                }}
              >
                {/* Mini top bar */}
                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom mb-3 px-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-trophy-fill text-brand fs-6"></i>
                    <span className="fw-bold text-brand-dark small">SportsBooking</span>
                  </div>
                  <div className="d-flex gap-2">
                    <span className="rounded-circle bg-danger" style={{ width: '8px', height: '8px' }}></span>
                    <span className="rounded-circle bg-warning" style={{ width: '8px', height: '8px' }}></span>
                    <span className="rounded-circle bg-success" style={{ width: '8px', height: '8px' }}></span>
                  </div>
                </div>

                {featuredCourt ? (
                  <>
                    <div className="row g-3 align-items-center">
                      <div className="col-6">
                        <div className="badge bg-light text-success border small mb-2 py-1 px-2">
                          {featuredCourt.category}
                        </div>
                        <h6 className="fw-bold mb-1 text-dark line-clamp-1" title={featuredCourt.name}>
                          {featuredCourt.name}
                        </h6>
                        <p className="text-muted mb-2 text-truncate" style={{ fontSize: '0.72rem' }} title={featuredCourt.address}>
                          <i className="bi bi-geo-alt me-1 text-brand"></i>
                          {featuredCourt.address}
                        </p>
                        <div className="d-flex align-items-center gap-1 text-warning small mb-1">
                          <i className="bi bi-star-fill"></i>
                          <span className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>
                            {reviewCount > 0 ? featuredCourt.ratingFormatted : 'Mới'}
                          </span>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                            {reviewCount > 0
                              ? `(${reviewCount} đánh giá)`
                              : totalSlots > 0
                                ? `• Còn ${availCount}/${totalSlots} ca`
                                : ''}
                          </span>
                        </div>
                      </div>

                      <div className="col-6">
                        <div
                          className="rounded-3 overflow-hidden shadow-sm position-relative"
                          style={{ height: '115px', cursor: onOpenFeatured ? 'pointer' : 'default' }}
                          onClick={() => onOpenFeatured?.(featuredCourt)}
                        >
                          {featuredCourt.imageUrl && !imgError ? (
                            <img
                              src={featuredCourt.imageUrl}
                              alt={featuredCourt.name}
                              className="w-100 h-100"
                              style={{ objectFit: 'cover' }}
                              onError={() => setImgError(true)}
                            />
                          ) : (
                            <div className="court-placeholder-box">
                              <i className="bi bi-building fs-3 opacity-75"></i>
                            </div>
                          )}
                          <span className="position-absolute bottom-0 start-0 m-1 badge bg-dark bg-opacity-75 text-white" style={{ fontSize: '0.65rem' }}>
                            {featuredCourt.openTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-light rounded-3 d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                      <div className="d-flex align-items-center gap-2 min-w-0">
                        <i className="bi bi-cash-coin text-brand"></i>
                        <span className="text-truncate">
                          Chỉ từ <strong className="text-dark">{featuredCourt.priceFormatted}</strong>/giờ
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-brand btn-sm py-1 px-2"
                        style={{ fontSize: '0.68rem' }}
                        onClick={() => onOpenFeatured?.(featuredCourt)}
                      >
                        Xem & Đặt sân
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-3 text-center">
                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-2" style={{ width: '48px', height: '48px' }}>
                      <i className="bi bi-calendar2-check fs-4"></i>
                    </div>
                    <h6 className="fw-bold text-brand-dark mb-1">Đặt sân theo lịch trống thực tế</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.78rem' }}>
                      Chọn bộ môn, khu vực và ngày chơi bên dưới để kiểm tra các khung giờ còn trống.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
