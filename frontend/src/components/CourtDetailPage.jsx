import React, { useState } from 'react';

export default function CourtDetailPage({ court, onBackToHome, onProceedBooking, currentUser, onOpenAuth }) {
  // Court Types available for this venue
  const courtTypes = [
    { id: 1, name: 'Sân 1 - Cỏ 7 người (FIFA Pro)', price: 380000, priceFormatted: '380.000đ' },
    { id: 2, name: 'Sân 2 - Cỏ 5 người tiêu chuẩn', price: 260000, priceFormatted: '260.000đ' },
    { id: 3, name: 'Sân 3 - Padel Court Ngoài Trời', price: 320000, priceFormatted: '320.000đ' },
  ];

  const [selectedCourtType, setSelectedCourtType] = useState(courtTypes[0]);

  // Date picker options (Dynamic based on today)
  const today = new Date();
  const dateOptions = [
    { label: 'Hôm nay', dateNum: today.getDate(), dayName: 'T7', fullDate: today.toISOString().split('T')[0] },
    { label: 'Ngày mai', dateNum: today.getDate() + 1, dayName: 'CN', fullDate: new Date(today.getTime() + 86400000).toISOString().split('T')[0] },
    { label: 'Thứ 2', dateNum: today.getDate() + 2, dayName: 'T2', fullDate: new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0] },
    { label: 'Thứ 3', dateNum: today.getDate() + 3, dayName: 'T3', fullDate: new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0] },
  ];

  const [selectedDate, setSelectedDate] = useState(dateOptions[0]);

  // Time slots
  const timeSlots = [
    { slot: '16:00 - 17:00', status: 'booked', label: 'Đã kín chỗ' },
    { slot: '17:00 - 18:00', status: 'booked', label: 'Đã kín chỗ' },
    { slot: '18:00 - 19:00', status: 'booked', label: 'Đã kín chỗ' },
    { slot: '19:00 - 20:00', status: 'available', price: '380k' },
    { slot: '20:00 - 21:00', status: 'available', price: '380k' },
    { slot: '21:00 - 22:00', status: 'available', price: '350k' },
  ];

  const [selectedSlot, setSelectedSlot] = useState(timeSlots[4]); // default 20:00 - 21:00
  const [isSaved, setIsSaved] = useState(false);

  const handleBooking = () => {
    onProceedBooking({
      courtName: court ? court.name : 'The Yard Sport Arena - Tổ hợp Cỏ Nhân Tạo & Padel Thảo Điền',
      courtType: selectedCourtType.name,
      price: selectedCourtType.price,
      date: selectedDate.fullDate,
      timeSlot: selectedSlot.slot,
      address: court ? court.address : '28 Đường Quốc Hương, P. Thảo Điền, TP. Thủ Đức'
    });
  };

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Top Header Navbar */}
      <header className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center gap-2" href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }}>
            <div className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle" style={{ width: '38px', height: '38px' }}>
              <i className="bi bi-trophy-fill text-brand fs-5"></i>
            </div>
            <span className="fw-bold fs-4 text-brand-dark tracking-tight">SportsBooking</span>
          </a>

          <div className="d-none d-lg-flex align-items-center gap-4 mx-auto">
            <a href="#home" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="nav-link-custom">Trang chủ</a>
            <a href="#courts" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="nav-link-custom active">Tìm sân</a>
            <a href="#bookings" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="nav-link-custom">Lịch đặt</a>
            <a href="#guide" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="nav-link-custom">Hướng dẫn</a>
          </div>

          <div className="d-flex align-items-center gap-3">
            {currentUser ? (
              <div className="d-flex align-items-center gap-2">
                <div className="rounded-circle bg-brand-dark text-white fw-bold d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="small fw-bold text-dark d-none d-sm-inline">{currentUser.fullName}</span>
              </div>
            ) : (
              <>
                <button className="btn btn-link text-decoration-none text-dark fw-semibold p-0" onClick={() => onOpenAuth('login')}>
                  <i className="bi bi-person fs-5 me-1"></i>
                  <span>Đăng nhập</span>
                </button>
                <button className="btn btn-brand" onClick={() => onOpenAuth('register')}>
                  Đăng ký
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="container py-4">
        
        {/* Breadcrumb & Action Row */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small text-muted">
              <li className="breadcrumb-item">
                <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="text-decoration-none text-muted">
                  <i className="bi bi-house-door me-1"></i>Trang chủ
                </a>
              </li>
              <li className="breadcrumb-item">
                <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="text-decoration-none text-muted">Tìm sân</a>
              </li>
              <li className="breadcrumb-item text-muted">The Yard Club</li>
              <li className="breadcrumb-item active fw-semibold text-dark" aria-current="page">Chi tiết sân</li>
            </ol>
          </nav>

          <div className="d-flex align-items-center gap-2">
            <button 
              type="button" 
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 bg-white"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Đã sao chép liên kết sân để chia sẻ!');
              }}
            >
              <i className="bi bi-share"></i>
              <span>Chia sẻ</span>
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${isSaved ? 'btn-danger' : 'btn-outline-secondary bg-white'} d-flex align-items-center gap-1`}
              onClick={() => setIsSaved(!isSaved)}
            >
              <i className={`bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              <span>{isSaved ? 'Đã lưu' : 'Lưu sân'}</span>
            </button>
          </div>
        </div>

        {/* Court Header Info */}
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <span className="badge bg-success text-uppercase py-1 px-2 fw-bold" style={{ fontSize: '0.72rem' }}>
              BÓNG ĐÁ 7 & 5 NGƯỜI
            </span>
            <span className="badge bg-success text-uppercase py-1 px-2 fw-bold" style={{ fontSize: '0.72rem' }}>
              PADEL COURT QUỐC TẾ
            </span>
            <span className="badge bg-secondary-subtle text-secondary py-1 px-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
              Chuẩn FIFA Pro
            </span>
            <span className="badge bg-secondary-subtle text-secondary py-1 px-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
              Mặt sân bán phần
            </span>
          </div>

          <h1 className="h2 fw-bold text-brand-dark mb-2">
            The Yard Sport Arena - Tổ hợp Cỏ Nhân Tạo & Padel Thảo Điền
          </h1>

          <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
            <div className="d-flex align-items-center gap-1 text-dark fw-bold">
              <i className="bi bi-star-fill text-warning"></i>
              <span>4.9</span>
              <span className="text-muted fw-normal">(186 đánh giá thực tế)</span>
            </div>
            <span>•</span>
            <div className="d-flex align-items-center gap-1">
              <i className="bi bi-trophy text-success"></i>
              <span>Top 1 địa điểm thể thao yêu thích nhất TP. Thủ Đức</span>
            </div>
            <span>•</span>
            <div className="d-flex align-items-center gap-1">
              <i className="bi bi-geo-alt text-brand"></i>
              <span>28 Đường Quốc Hương, P. Thảo Điền, TP. Thủ Đức</span>
              <a 
                href="#map" 
                className="text-brand fw-semibold text-decoration-none ms-1"
                onClick={(e) => { e.preventDefault(); alert('Địa chỉ sân: 28 Đường Quốc Hương, Phường Thảo Điền, TP. Thủ Đức (Đối diện trường Quốc Tế).'); }}
              >
                [🗺 Xem bản đồ]
              </a>
            </div>
          </div>
        </div>

        {/* Photo Mosaic Gallery (5 Images) */}
        <div className="court-gallery-grid mb-5 shadow-sm">
          {/* Main Soccer Pitch */}
          <div className="gallery-main-img">
            <img 
              src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80" 
              alt="Mặt sân chính 7 người" 
            />
            <div className="position-absolute bottom-0 start-0 m-3">
              <span className="badge bg-dark bg-opacity-75 text-white py-2 px-3 fw-semibold">
                ● Mặt sân chính 7 người (FIFA Quality)
              </span>
            </div>
          </div>

          {/* Sub Image 1: Padel court action */}
          <div className="gallery-sub-img">
            <img 
              src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80" 
              alt="Padel Court Đêm" 
            />
          </div>

          {/* Sub Image 2: Luxury shower & locker */}
          <div className="gallery-sub-img" style={{ borderRadius: '0 14px 0 0' }}>
            <img 
              src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80" 
              alt="Phòng thay đồ" 
            />
          </div>

          {/* Sub Image 3: Café / lounge */}
          <div className="gallery-sub-img">
            <img 
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80" 
              alt="Quán Cafe & Giải khát" 
            />
          </div>

          {/* Sub Image 4: Goal post + button view all */}
          <div className="gallery-sub-img position-relative" style={{ borderRadius: '0 0 14px 0' }}>
            <img 
              src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80" 
              alt="Góc sân thi đấu" 
            />
            <button 
              type="button" 
              className="btn btn-dark bg-opacity-80 border-0 btn-sm position-absolute bottom-0 end-0 m-3 d-flex align-items-center gap-1 rounded-pill px-3 py-1 text-white"
              onClick={() => alert('Thư viện 18 ảnh chi tiết các góc sân The Yard Sport Arena.')}
            >
              <i className="bi bi-camera"></i>
              <span>+ Xem tất cả 18 ảnh</span>
            </button>
          </div>
        </div>

        {/* Two-Column Details & Sticky Booking Sidebar */}
        <div className="row g-4">
          
          {/* Left Column: Amenities & Reviews */}
          <div className="col-lg-7">
            
            {/* TIỆN ÍCH TẠI SÂN */}
            <div className="bg-white rounded-4 p-4 border shadow-sm mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-brand-dark mb-0">TIỆN ÍCH TẠI SÂN</h5>
                <span className="text-muted small">Đầy đủ 8 tiện ích tiêu chuẩn</span>
              </div>

              <div className="row g-3 text-center">
                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-wifi"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Wifi miễn phí</div>
                </div>

                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-p-square"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Bãi đỗ ô tô</div>
                </div>

                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-shield-lock"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Tủ khóa an toàn</div>
                </div>

                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-droplet"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Tắm nóng lạnh</div>
                </div>

                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-cup-hot"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Café / Quầy nước</div>
                </div>

                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-lightbulb"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Đèn Led ban đêm</div>
                </div>

                <div className="col-3 col-sm-auto">
                  <div className="facility-icon-box mb-1">
                    <i className="bi bi-bag-check"></i>
                  </div>
                  <div className="small fw-semibold text-dark">Thuê bóng & áo</div>
                </div>
              </div>
            </div>

            {/* ĐÁNH GIÁ TỪ NGƯỜI CHƠI */}
            <div className="bg-white rounded-4 p-4 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-inline-flex align-items-center gap-1 bg-warning bg-opacity-25 text-dark fw-bold rounded-pill px-2 py-1 small">
                    <i className="bi bi-star-fill text-warning"></i>
                    <span>4.9</span>
                  </div>
                  <span className="fw-bold text-dark">Đánh giá từ người chơi</span>
                  <span className="text-muted small d-none d-sm-inline">(186 nhận xét đã xác thực tại sân)</span>
                </div>
                <a href="#reviews" className="small text-brand text-decoration-none fw-semibold" onClick={(e) => { e.preventDefault(); alert('Hiển thị 186 đánh giá từ thành viên.'); }}>
                  Xem tất cả 186 đánh giá →
                </a>
              </div>

              {/* Sample Review */}
              <div className="p-3 bg-light rounded-3 border">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                      NK
                    </div>
                    <div>
                      <div className="fw-bold text-dark">Nguyễn Tuấn Kiệt</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Đá sân 7 • 18:30 thứ Tư tuần trước</div>
                    </div>
                  </div>
                  <div className="text-warning small">
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                  </div>
                </div>
                <p className="text-dark small mb-0 fst-italic" style={{ lineHeight: '1.5' }}>
                  "Mặt sân cỏ mới rất êm chân, dàn đèn sáng đều không chói mắt khi sút bóng. Dịch vụ trà đá, gửi xe chu đáo dắt xe tận nơi. Sẽ ủng hộ lâu dài!"
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="col-lg-5">
            <div className="booking-sidebar-card sticky-top" style={{ top: '90px' }}>
              
              {/* Step 1: Chọn Loại Sân */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted text-uppercase mb-1">
                  1. CHỌN LOẠI SÂN
                </label>
                <select 
                  className="form-select fw-semibold text-brand-dark py-2 border-1 shadow-none"
                  value={selectedCourtType.id}
                  onChange={(e) => {
                    const match = courtTypes.find(c => c.id === parseInt(e.target.value, 10));
                    if (match) setSelectedCourtType(match);
                  }}
                >
                  {courtTypes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.priceFormatted} / 60p
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Chọn Ngày Thi Đấu */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-0">
                    2. CHỌN NGÀY THI ĐẤU
                  </label>
                  <span className="small text-muted fw-semibold">Tháng 08/2024</span>
                </div>

                <div className="row g-2">
                  {dateOptions.map((d, index) => (
                    <div key={index} className="col-3">
                      <div 
                        className={`date-select-pill ${selectedDate.fullDate === d.fullDate ? 'active' : ''}`}
                        onClick={() => setSelectedDate(d)}
                      >
                        <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{d.label}</div>
                        <div className="fs-5 fw-bold">{d.dateNum}</div>
                        <div className="small text-muted" style={{ fontSize: '0.7rem' }}>{d.dayName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Chọn Khung Giờ Vàng */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-0">
                    3. CHỌN KHUNG GIỜ VÀNG
                  </label>
                  <div className="d-flex align-items-center gap-2 small" style={{ fontSize: '0.72rem' }}>
                    <span className="d-flex align-items-center gap-1 text-muted">
                      <span className="rounded-circle bg-secondary" style={{ width: '6px', height: '6px' }}></span>
                      Đã đặt
                    </span>
                    <span className="d-flex align-items-center gap-1 text-success fw-bold">
                      <span className="rounded-circle bg-success" style={{ width: '6px', height: '6px' }}></span>
                      Đang chọn
                    </span>
                  </div>
                </div>

                <div className="row g-2">
                  {timeSlots.map((ts, idx) => {
                    const isBooked = ts.status === 'booked';
                    const isSelected = selectedSlot.slot === ts.slot;

                    return (
                      <div key={idx} className="col-6">
                        <button
                          type="button"
                          disabled={isBooked}
                          className={`slot-btn w-100 ${isBooked ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => !isBooked && setSelectedSlot(ts)}
                        >
                          <span className={`fw-bold ${isSelected ? 'text-brand-dark' : isBooked ? 'text-muted' : 'text-dark'}`}>
                            {ts.slot}
                          </span>
                          <span style={{ fontSize: '0.72rem' }} className={isBooked ? 'text-danger-emphasis' : isSelected ? 'text-success fw-bold' : 'text-muted'}>
                            {isBooked ? 'Đã kín chỗ' : isSelected ? `Đang chọn • ${ts.price}` : `Trống • ${ts.price}`}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Calculation & Checkout */}
              <div className="pt-3 border-top mb-3">
                <div className="d-flex justify-content-between align-items-baseline mb-1">
                  <span className="text-muted small">Tổng cộng (1 giờ):</span>
                  <span className="small text-muted fw-semibold">
                    {selectedSlot.slot} • {selectedDate.dateNum}/08
                  </span>
                </div>
                <div className="fs-3 fw-bold text-brand-dark mb-3">
                  {selectedCourtType.priceFormatted}
                </div>

                <button 
                  type="button" 
                  className="btn btn-brand w-100 py-3 fw-bold fs-6 d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                  onClick={handleBooking}
                >
                  <span>Tiến hành Đặt sân ngay</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>

              {/* Guarantees */}
              <div className="text-center text-muted small" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                <div className="mb-1">
                  <i className="bi bi-shield-check text-success me-1"></i>
                  Xác nhận tức thì qua SMS • Không trùng lịch 100%
                </div>
                <div>
                  <i className="bi bi-clock-history text-success me-1"></i>
                  Hỗ trợ đổi lịch linh hoạt trước giờ đá 4 tiếng
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="footer-dark pt-5 pb-4 mt-5">
        <div className="container">
          <div className="row align-items-center justify-content-between pb-4 border-bottom border-secondary border-opacity-25 gy-3">
            <div className="col-md-5">
              <div className="d-flex align-items-center gap-2 mb-2">
                <div className="d-flex align-items-center justify-content-center bg-white bg-opacity-10 rounded-circle" style={{ width: '34px', height: '34px' }}>
                  <i className="bi bi-trophy-fill text-success fs-6"></i>
                </div>
                <span className="fw-bold fs-4 text-white">SportsBooking</span>
              </div>
              <p className="text-white-50 small mb-0">Nền tảng đặt sân thể thao #1 Việt Nam</p>
            </div>
            <div className="col-md-7 d-flex flex-wrap align-items-center justify-content-md-end gap-4">
              <a href="#guide" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="small text-white-50 text-decoration-none">Hướng dẫn</a>
              <a href="#login" onClick={(e) => { e.preventDefault(); onOpenAuth('login'); }} className="small text-white-50 text-decoration-none">Đăng nhập</a>
              <a href="#register" onClick={(e) => { e.preventDefault(); onOpenAuth('register'); }} className="small text-white-50 text-decoration-none">Đăng ký</a>
              <div className="d-inline-flex align-items-center gap-2 bg-white bg-opacity-10 text-white rounded-pill px-3 py-1 small fw-semibold">
                <i className="bi bi-telephone-fill text-success"></i>
                <span>Hotline: 1900 8888</span>
              </div>
            </div>
          </div>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-4 small text-white-50 gy-2">
            <p className="mb-2 mb-md-0">© 2024 SportsBooking Vietnam. Tất cả quyền được bảo lưu.</p>
            <div className="d-flex align-items-center gap-3">
              <span>Tiếng Việt ▾</span>
              <span>•</span>
              <span>Hà Nội & TP.HCM</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

