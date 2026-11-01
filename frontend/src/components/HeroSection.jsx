import React from 'react';

export default function HeroSection() {
  return (
    <section className="py-5 bg-white position-relative overflow-hidden" id="home">
      <div className="container py-lg-4">
        <div className="row align-items-center g-5">
          {/* Left Column: Hero Copy */}
          <div className="col-lg-6">
            <div className="d-inline-flex align-items-center gap-2 badge-pill-brand mb-4">
              <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '8px', height: '8px' }} role="status"></span>
              <span>NỀN TẢNG THỂ THAO #1 VIỆT NAM</span>
            </div>

            <h1 className="display-4 fw-extrabold text-brand-dark mb-4 lh-tight" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Tìm sân.<br />
              Chơi hết mình.
            </h1>

            <p className="lead text-muted mb-4" style={{ fontSize: '1.15rem', maxWidth: '480px', lineHeight: 1.6 }}>
              Đặt sân thể thao yêu thích nhanh chóng, minh bạch và tiện lợi hơn bao giờ hết.
            </p>

            {/* Checkmark points */}
            <div className="d-flex flex-wrap gap-4 pt-2">
              <div className="d-flex align-items-center gap-2 fw-semibold text-secondary small">
                <i className="bi bi-check2 text-success fs-5 fw-bold"></i>
                <span>1.200+ sân đã có mặt</span>
              </div>
              <div className="d-flex align-items-center gap-2 fw-semibold text-secondary small">
                <i className="bi bi-check2 text-success fs-5 fw-bold"></i>
                <span>Xác nhận tức thì</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Mockup */}
          <div className="col-lg-6">
            <div className="position-relative d-flex justify-content-center">
              {/* Subtle background glow effect */}
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

              {/* Perspective Mockup Card mimicking screenshot */}
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
                {/* Mini browser top bar */}
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

                {/* Inner Mockup Content */}
                <div className="row g-3 align-items-center">
                  <div className="col-6">
                    <div className="badge bg-light text-success border small mb-2 py-1 px-2">Sân hot hôm nay</div>
                    <h6 className="fw-bold mb-1 text-dark">Tìm sân. Chơi hết mình.</h6>
                    <p className="text-muted" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                      Cụm sân cao cấp Thảo Điền, view thoáng mát, trang thiết bị chuẩn quốc tế.
                    </p>
                    <div className="d-flex align-items-center gap-1 text-warning small mb-2">
                      <i className="bi bi-star-fill"></i>
                      <span className="fw-bold text-dark" style={{ fontSize: '0.75rem' }}>4.9</span>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>(128 đánh giá)</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="rounded-3 overflow-hidden shadow-sm position-relative">
                      <img 
                        src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80" 
                        alt="Court Preview" 
                        className="img-fluid" 
                        style={{ height: '110px', width: '100%', objectFit: 'cover' }}
                      />
                      <span className="position-absolute bottom-0 start-0 m-1 badge bg-dark bg-opacity-75 text-white" style={{ fontSize: '0.65rem' }}>
                        Padel Court #1
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mini Search Bar Mockup */}
                <div className="mt-3 p-2 bg-light rounded-3 d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-search text-brand"></i>
                    <span>Sân Pickleball & Tennis TP.HCM</span>
                  </div>
                  <span className="badge bg-brand text-white" style={{ fontSize: '0.68rem', padding: '4px 8px' }}>Đặt ngay</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

