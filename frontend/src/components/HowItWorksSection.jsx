import React from 'react';

export default function HowItWorksSection({
  onSearchClick,
  onSelectSlotsClick,
  onCheckInClick,
  isLoggedIn = false
}) {
  const steps = [
    {
      num: '01',
      icon: 'bi-search',
      title: 'Tìm sân phù hợp',
      desc: 'Lọc theo môn thể thao, khu vực, mức giá và ngày bạn muốn ra sân.',
      actionText: 'Tìm kiếm sân ngay',
      actionIcon: 'bi-arrow-right',
      onClick: () => {
        if (onSearchClick) {
          onSearchClick();
        } else {
          const el = document.getElementById('search-section') || document.getElementById('featured-courts');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      num: '02',
      icon: 'bi-clock',
      title: 'Chọn khung giờ trống',
      desc: 'Xem lịch trống cập nhật theo thời gian thực, tránh hoàn toàn việc trùng lịch.',
      actionText: 'Xem lịch & sân trống',
      actionIcon: 'bi-arrow-right',
      onClick: () => {
        if (onSelectSlotsClick) {
          onSelectSlotsClick();
        } else {
          const el = document.getElementById('featured-courts');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      num: '03',
      icon: 'bi-shield-check',
      title: 'Đặt sân & Check-in',
      desc: 'Gửi yêu cầu đặt chỗ, theo dõi chủ sân xác nhận và mở mã QR để check-in tại quầy.',
      actionText: isLoggedIn ? 'Xem lịch đặt & Mã QR' : 'Đăng nhập để xem vé',
      actionIcon: 'bi-qr-code-scan',
      onClick: () => {
        if (onCheckInClick) {
          onCheckInClick();
        } else {
          window.location.hash = '#bookings';
        }
      }
    }
  ];

  return (
    <section className="editorial-steps-band" id="how-it-works">
      <div className="container">
        <div className="hero-eyebrow mb-2">
          <span>ĐẶT SÂN DỄ DÀNG</span>
        </div>
        <h2
          className="fw-bold mb-4 mb-lg-5"
          style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          <span className="d-block text-dark">Mọi trận đấu hay</span>
          <span className="d-block text-brand">bắt đầu từ đây.</span>
        </h2>

        <div className="row g-4 g-lg-4">
          {steps.map((step) => (
            <div key={step.num} className="col-md-4">
              <div
                className="step-interactive-card h-100 p-4 rounded-4 bg-white border border-light-subtle d-flex flex-column justify-content-between shadow-sm cursor-pointer"
                onClick={step.onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    step.onClick();
                  }
                }}
              >
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div
                      className="rounded-3 d-inline-flex align-items-center justify-content-center"
                      style={{ width: '42px', height: '42px', backgroundColor: '#eef6f1', color: '#0f766e' }}
                    >
                      <i className={`bi ${step.icon} fs-5`}></i>
                    </div>
                    <span className="fw-bold" style={{ fontSize: '0.85rem', color: '#a7c0b0' }}>
                      {step.num}
                    </span>
                  </div>
                  <h3 className="h6 fw-bold text-dark mb-2">{step.title}</h3>
                  <p className="text-muted small mb-3" style={{ lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>

                <div className="pt-3 border-top border-light-subtle d-flex align-items-center justify-content-between text-brand-dark fw-semibold small mt-auto">
                  <span className="step-action-label">{step.actionText}</span>
                  <i className={`bi ${step.actionIcon} ms-1 step-action-icon`}></i>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
