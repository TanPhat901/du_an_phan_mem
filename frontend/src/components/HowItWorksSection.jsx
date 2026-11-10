import React from 'react';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      icon: 'bi-search',
      title: 'Tìm sân phù hợp',
      desc: 'Lọc theo môn thể thao, khu vực, mức giá và ngày bạn muốn ra sân.'
    },
    {
      num: '02',
      icon: 'bi-clock',
      title: 'Chọn khung giờ trống',
      desc: 'Xem lịch trống cập nhật theo thời gian thực, tránh hoàn toàn việc trùng lịch.'
    },
    {
      num: '03',
      icon: 'bi-shield-check',
      title: 'Đặt sân & Check-in',
      desc: 'Gửi yêu cầu đặt chỗ, theo dõi chủ sân xác nhận và mở mã QR để check-in tại quầy.'
    }
  ];

  return (
    <section className="editorial-steps-band">
      <div className="container">
        <div className="hero-eyebrow mb-2">
          <span>ĐẶT SÂN DỄ DÀNG</span>
        </div>
        <h2
          className="fw-bold mb-5"
          style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          <span className="d-block text-dark">Mọi trận đấu hay</span>
          <span className="d-block text-brand">bắt đầu từ đây.</span>
        </h2>

        <div className="row g-4 g-lg-5">
          {steps.map((step) => (
            <div key={step.num} className="col-md-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <i className={`bi ${step.icon} fs-5 text-brand-dark`}></i>
                <span className="fw-semibold" style={{ fontSize: '0.82rem', color: '#a7c0b0' }}>
                  {step.num}
                </span>
              </div>
              <h3 className="h6 fw-bold text-dark mb-2">{step.title}</h3>
              <p className="text-muted small mb-0" style={{ maxWidth: '280px', lineHeight: 1.6 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

