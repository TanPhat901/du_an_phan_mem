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

  const heroImageSrc =
    featuredCourt?.imageUrl && !imgError ? featuredCourt.imageUrl : '/hero-court.jpg';

  const reviewCount = Number(featuredCourt?.reviewCount || 0);
  const availCount = Number(featuredCourt?.availableSlotCount || 0);
  const totalSlots = Number(featuredCourt?.totalSlots || 0);

  return (
    <section className="hero-editorial-section border-bottom" id="home">
      <div className="container">
        <div className="row align-items-center g-4 g-lg-5">
          {/* Left Editorial Column */}
          <div className="col-lg-5">
            <div className="hero-eyebrow mb-3">
              <span className="hero-eyebrow-dot"></span>
              <span>NỀN TẢNG ĐẶT SÂN THỂ THAO</span>
            </div>

            <h1 className="hero-display-title mb-3">
              <span className="d-block text-dark">Tìm sân.</span>
              <span className="d-block text-brand-dark">Chơi hết mình.</span>
            </h1>

            <p className="text-muted mb-4" style={{ maxWidth: '430px', lineHeight: 1.65 }}>
              Đặt sân thể thao yêu thích nhanh chóng, theo dõi khung giờ trống theo ngày và check-in gọn gàng tại quầy.
            </p>

            <div className="d-flex flex-wrap align-items-center gap-3 small text-secondary">
              <span>
                <i className="bi bi-check2 text-success me-1"></i>
                {totalCourts > 0 ? `${totalCourts} cụm sân đang mở đặt` : 'Cập nhật lịch trống trực tiếp'}
              </span>
              <span className="text-muted opacity-50">•</span>
              <span>
                <i className="bi bi-check2 text-success me-1"></i>
                Hỗ trợ tại quầy & VietQR
              </span>
            </div>
          </div>

          {/* Right Photographic Showcase Column */}
          <div className="col-lg-7">
            <div className="position-relative pb-2 pb-lg-0">
              <div
                className="hero-media-frame"
                style={{ cursor: featuredCourt && onOpenFeatured ? 'pointer' : 'default' }}
                onClick={() => featuredCourt && onOpenFeatured?.(featuredCourt)}
              >
                <img
                  src={heroImageSrc}
                  alt={featuredCourt?.name || 'Sân thể thao ngoài trời'}
                  className="w-100 h-100 object-fit-cover"
                  onError={() => setImgError(true)}
                />

                {/* Subtle top-bottom vignette for readable editorial overlay */}
                <div
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(11,31,24,0.3) 0%, rgba(11,31,24,0) 45%, rgba(11,31,24,0.28) 100%)',
                    pointerEvents: 'none'
                  }}
                ></div>

                <div className="hero-media-caption">
                  <span className="fs-2 fw-light lh-1 opacity-75">01</span>
                  <div className="text-end" style={{ fontSize: '0.72rem', lineHeight: 1.35 }}>
                    <div className="fw-semibold">Chơi đẹp</div>
                    <div className="opacity-75">Chọn sân chất lượng</div>
                  </div>
                </div>
              </div>

              {/* Floating Highlight Pill Card */}
              <div
                className="hero-floating-card d-flex align-items-center gap-3"
                style={{ cursor: featuredCourt && onOpenFeatured ? 'pointer' : 'default' }}
                onClick={() => featuredCourt && onOpenFeatured?.(featuredCourt)}
              >
                <div
                  className="rounded-3 bg-brand-light text-brand-dark d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="bi bi-calendar2-check fs-5"></i>
                </div>

                <div className="min-w-0 flex-grow-1">
                  <div className="fw-bold text-dark small text-truncate">
                    {featuredCourt ? featuredCourt.name : 'Sẵn sàng ra sân hôm nay'}
                  </div>
                  <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>
                    {featuredCourt
                      ? totalSlots > 0
                        ? `${featuredCourt.priceFormatted}/giờ • Còn ${availCount}/${totalSlots} ca`
                        : `${featuredCourt.priceFormatted}/giờ • ${reviewCount > 0 ? `★ ${featuredCourt.ratingFormatted}` : featuredCourt.category}`
                      : 'Chọn khung giờ trống trực tiếp'}
                  </div>
                </div>

                <div
                  className="rounded-circle bg-brand-light text-brand-dark d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: '28px', height: '28px' }}
                >
                  <i className="bi bi-arrow-right small"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
