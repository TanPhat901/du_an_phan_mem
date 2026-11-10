import React, { useState, useEffect, useCallback } from 'react';

const formatLocalYMD = (dateObj) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDayMeta = (ymdStr, index) => {
  const [y, m, d] = ymdStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const vnDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const fullNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayIdx = dt.getDay();
  return {
    label: index === 0 ? 'Hôm nay' : index === 1 ? 'Ngày mai' : fullNames[dayIdx],
    dateNum: String(d).padStart(2, '0'),
    monthStr: String(m).padStart(2, '0'),
    yearStr: String(y),
    dayName: vnDays[dayIdx],
    fullDate: ymdStr
  };
};

const buildDateOptions = (initialDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayYmd = formatLocalYMD(today);

  let baseDate = today;
  if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && initialDate >= todayYmd) {
    const [y, m, d] = initialDate.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  }

  return [0, 1, 2, 3].map((offset) => {
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + offset);
    const ymd = formatLocalYMD(dt);
    return getDayMeta(ymd, ymd === todayYmd ? 0 : offset);
  });
};

export default function CourtDetailPage({
  court,
  initialDate,
  availabilityRefreshKey = 0,
  onBackToHome,
  onProceedBooking,
  currentUser,
  onOpenAuth,
  onOpenOwnerDashboard
}) {
  const courtId = court?.id || 1;
  const [detail, setDetail] = useState(court || null);
  const [detailLoading, setDetailLoading] = useState(true);

  const [subCourts, setSubCourts] = useState([]);
  const [selectedSubCourt, setSelectedSubCourt] = useState(null);

  const [dateOptions] = useState(() => buildDateOptions(initialDate));
  const [selectedDate, setSelectedDate] = useState(() => buildDateOptions(initialDate)[0]);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Tải thông tin chi tiết cụm sân + danh sách sân con từ PostgreSQL
  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    fetch(`http://localhost:5000/api/courts/${courtId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || 'Không thể tải chi tiết sân.');
        }
        return json.data;
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        const realSubCourts = Array.isArray(data.subCourts) ? data.subCourts : [];
        if (realSubCourts.length > 0) {
          setSubCourts(realSubCourts);
          setSelectedSubCourt(realSubCourts[0]);
        } else {
          const fallbackSub = {
            id: null,
            name: `${data.name} (Sân tiêu chuẩn)`,
            normalPrice: Number(data.pricePerHour || 200000),
            peakPrice: Number(data.pricePerHour || 200000),
            priceFormatted: `${Number(data.pricePerHour || 200000).toLocaleString('vi-VN')}đ`,
            amenities: data.amenities || [],
            imageUrl: data.imageUrl
          };
          setSubCourts([fallbackSub]);
          setSelectedSubCourt(fallbackSub);
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (court) {
          setDetail(court);
          const fallbackSub = {
            id: null,
            name: `${court.name} (Sân tiêu chuẩn)`,
            normalPrice: Number(court.pricePerHour || 200000),
            peakPrice: Number(court.pricePerHour || 200000),
            priceFormatted: `${Number(court.pricePerHour || 200000).toLocaleString('vi-VN')}đ`,
            amenities: court.amenities || [],
            imageUrl: court.imageUrl
          };
          setSubCourts([fallbackSub]);
          setSelectedSubCourt(fallbackSub);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courtId]);

  // Kiểm tra lịch trống thực tế theo ngày & sân con
  const loadAvailability = useCallback(async () => {
    if (!selectedDate?.fullDate) return;
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const params = new URLSearchParams({ date: selectedDate.fullDate });
      if (selectedSubCourt?.id) {
        params.append('subCourtId', String(selectedSubCourt.id));
      }
      const res = await fetch(`http://localhost:5000/api/courts/${courtId}/availability?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Không thể kiểm tra khung giờ.');
      }
      const fetchedSlots = json.data.slots || [];
      setSlots(fetchedSlots);
      setSelectedSlot((prev) => {
        if (prev) {
          const same = fetchedSlots.find(s => s.slotId === prev.slotId && s.status === 'available');
          if (same) return same;
        }
        return fetchedSlots.find(s => s.status === 'available') || null;
      });
    } catch (err) {
      setSlotsError(err.message);
      setSlots([]);
      setSelectedSlot(null);
    } finally {
      setSlotsLoading(false);
    }
  }, [courtId, selectedDate?.fullDate, selectedSubCourt?.id]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability, availabilityRefreshKey]);

  const handleBooking = () => {
    if (!selectedSlot || selectedSlot.status !== 'available') return;
    onProceedBooking({
      courtId,
      courtName: detail?.name || court?.name || 'Sân thể thao',
      category: detail?.category || court?.category || 'THỂ THAO',
      subCourtId: selectedSubCourt?.id || null,
      subCourtName: selectedSubCourt?.name || '',
      slotId: selectedSlot.slotId,
      price: selectedSlot.price,
      date: selectedDate.fullDate,
      timeSlot: selectedSlot.slot,
      address: detail?.address || court?.address || '',
      imageUrl: selectedSubCourt?.imageUrl || detail?.imageUrl || court?.imageUrl
    });
  };

  const displayAmenities =
    selectedSubCourt?.amenities?.length > 0
      ? selectedSubCourt.amenities
      : detail?.amenities || ['Bãi đỗ xe', 'Đèn LED ban đêm', 'Phòng thay đồ'];

  const activePrice = selectedSlot
    ? selectedSlot.price
    : selectedSubCourt?.normalPrice || detail?.pricePerHour || 200000;

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* Top Header Navbar */}
      <header className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3">
        <div className="container">
          <a
            className="navbar-brand d-flex align-items-center gap-2"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onBackToHome();
            }}
          >
            <div className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle" style={{ width: '38px', height: '38px' }}>
              <i className="bi bi-trophy-fill text-brand fs-5"></i>
            </div>
            <span className="fw-bold fs-4 text-brand-dark tracking-tight">SportsBooking</span>
          </a>

          <div className="d-none d-lg-flex align-items-center gap-4 mx-auto">
            <a href="#home" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="nav-link-custom">Trang chủ</a>
            <a href="#courts" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="nav-link-custom active">Tìm sân</a>
            {currentUser?.role === 'OWNER' && onOpenOwnerDashboard && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success rounded-pill px-3"
                onClick={onOpenOwnerDashboard}
              >
                <i className="bi bi-buildings-fill me-1"></i>Kênh Chủ Sân
              </button>
            )}
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
              <li className="breadcrumb-item text-muted">{detail?.city || 'TP. Hồ Chí Minh'}</li>
              <li className="breadcrumb-item active fw-semibold text-dark" aria-current="page">
                {detail?.name || 'Chi tiết cụm sân'}
              </li>
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
              {detail?.category || 'THỂ THAO'}
            </span>
            <span className="badge bg-secondary-subtle text-secondary py-1 px-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
              {subCourts.length} sân thi đấu
            </span>
            {detail?.openTime && (
              <span className="badge bg-secondary-subtle text-secondary py-1 px-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                Mở cửa: {detail.openTime}
              </span>
            )}
          </div>

          <h1 className="h2 fw-bold text-brand-dark mb-2">
            {detail?.name || 'Đang tải thông tin cụm sân...'}
          </h1>

          <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
            <div className="d-flex align-items-center gap-1 text-dark fw-bold">
              <i className="bi bi-star-fill text-warning"></i>
              <span>{detail?.rating || 4.9}</span>
              <span className="text-muted fw-normal">({detail?.reviewCount || 120} đánh giá)</span>
            </div>
            <span>•</span>
            <div className="d-flex align-items-center gap-1">
              <i className="bi bi-geo-alt text-brand"></i>
              <span>{detail?.address}</span>
            </div>
            {detail?.ownerPhone && (
              <>
                <span>•</span>
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-telephone text-success"></i>
                  <span>Hotline: {detail.ownerPhone}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Photo Mosaic Gallery */}
        <div className="court-gallery-grid mb-5 shadow-sm">
          <div className="gallery-main-img">
            <img
              src={detail?.imageUrl || 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80'}
              alt={detail?.name || 'Mặt sân chính'}
            />
            <div className="position-absolute bottom-0 start-0 m-3">
              <span className="badge bg-dark bg-opacity-75 text-white py-2 px-3 fw-semibold">
                ● {selectedSubCourt?.name || detail?.name}
              </span>
            </div>
          </div>

          <div className="gallery-sub-img">
            <img
              src={selectedSubCourt?.imageUrl || 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80'}
              alt="Sân thi đấu"
            />
          </div>
          <div className="gallery-sub-img" style={{ borderRadius: '0 14px 0 0' }}>
            <img
              src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"
              alt="Phòng thay đồ"
            />
          </div>
          <div className="gallery-sub-img">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80"
              alt="Quầy dịch vụ"
            />
          </div>
          <div className="gallery-sub-img position-relative" style={{ borderRadius: '0 0 14px 0' }}>
            <img
              src="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80"
              alt="Góc sân thi đấu"
            />
          </div>
        </div>

        {/* Two-Column Details & Sticky Booking Sidebar */}
        <div className="row g-4">
          {/* Left Column */}
          <div className="col-lg-7">
            {/* DANH SÁCH SÂN CON TẠI CƠ SỞ */}
            <div className="bg-white rounded-4 p-4 border shadow-sm mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-brand-dark mb-0">SÂN CON TẠI CƠ SỞ</h5>
                <span className="text-muted small">{subCourts.length} lựa chọn khả dụng</span>
              </div>
              {detailLoading ? (
                <div className="small text-muted">Đang tải danh sách sân con...</div>
              ) : (
                <div className="row g-3">
                  {subCourts.map((sc, idx) => {
                    const isSelected = sc.id === selectedSubCourt?.id && sc.name === selectedSubCourt?.name;
                    return (
                      <div key={sc.id || idx} className="col-md-6">
                        <div
                          className={`p-3 rounded-3 border h-100 ${isSelected ? 'border-success bg-success-subtle bg-opacity-25' : 'bg-light'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSubCourt(sc)}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <div className="fw-bold text-dark small">{sc.name}</div>
                            {isSelected && <span className="badge bg-success">Đang chọn</span>}
                          </div>
                          {sc.surfaceType && (
                            <div className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-layers me-1"></i>{sc.surfaceType}
                            </div>
                          )}
                          <div className="d-flex justify-content-between small">
                            <span className="text-muted">Giờ thường: <strong>{Number(sc.normalPrice).toLocaleString('vi-VN')}đ</strong></span>
                            <span className="text-brand fw-bold">Giờ vàng: {Number(sc.peakPrice).toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TIỆN ÍCH TẠI SÂN */}
            <div className="bg-white rounded-4 p-4 border shadow-sm mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-brand-dark mb-0">TIỆN ÍCH TẠI SÂN</h5>
                <span className="text-muted small">{displayAmenities.length} tiện ích</span>
              </div>

              <div className="d-flex flex-wrap gap-2">
                {displayAmenities.map((item, idx) => (
                  <span key={idx} className="badge bg-light text-dark border px-3 py-2 fw-semibold">
                    <i className="bi bi-check-circle-fill text-success me-1"></i>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* ĐÁNH GIÁ TỪ NGƯỜI CHƠI */}
            <div className="bg-white rounded-4 p-4 border shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-inline-flex align-items-center gap-1 bg-warning bg-opacity-25 text-dark fw-bold rounded-pill px-2 py-1 small">
                    <i className="bi bi-star-fill text-warning"></i>
                    <span>{detail?.rating || 4.9}</span>
                  </div>
                  <span className="fw-bold text-dark">Đánh giá từ người chơi</span>
                  <span className="text-muted small d-none d-sm-inline">({detail?.reviewCount || 120} nhận xét)</span>
                </div>
              </div>

              <div className="p-3 bg-light rounded-3 border">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                      NK
                    </div>
                    <div>
                      <div className="fw-bold text-dark">Nguyễn Tuấn Kiệt</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>Đã trải nghiệm thực tế tại {detail?.name}</div>
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
                  "Mặt sân mới rất êm chân, đèn chiếu sáng rõ ràng. Đặt lịch online giữ chỗ đúng khung giờ, tới sân check-in nhanh gọn!"
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="col-lg-5">
            <div className="booking-sidebar-card sticky-top" style={{ top: '90px' }}>
              {/* Step 1: Chọn Sân Con */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted text-uppercase mb-1">
                  1. CHỌN SÂN THI ĐẤU
                </label>
                <select
                  className="form-select fw-semibold text-brand-dark py-2 border-1 shadow-none"
                  value={selectedSubCourt?.id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const match = subCourts.find(c => String(c.id ?? '') === val);
                    if (match) setSelectedSubCourt(match);
                  }}
                >
                  {subCourts.map((c, idx) => (
                    <option key={c.id || idx} value={c.id ?? ''}>
                      {c.name} • {Number(c.normalPrice).toLocaleString('vi-VN')}đ - {Number(c.peakPrice).toLocaleString('vi-VN')}đ/h
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
                  <span className="small text-muted fw-semibold">
                    Tháng {selectedDate.monthStr}/{selectedDate.yearStr}
                  </span>
                </div>

                <div className="row g-2 mb-2">
                  {dateOptions.map((d, index) => (
                    <div key={d.fullDate} className="col-3">
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

                <input
                  type="date"
                  className="form-control form-control-sm"
                  min={formatLocalYMD(new Date())}
                  value={selectedDate.fullDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(getDayMeta(e.target.value, -1));
                  }}
                />
              </div>

              {/* Step 3: Chọn Khung Giờ (Real DB Availability) */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label small fw-bold text-muted text-uppercase mb-0">
                    3. CHỌN KHUNG GIỜ TRỐNG
                  </label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none text-brand"
                    onClick={loadAvailability}
                    title="Làm mới lịch trống"
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
                  </button>
                </div>

                {slotsLoading ? (
                  <div className="text-center py-4 small text-muted">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                    Đang kiểm tra khung giờ trống...
                  </div>
                ) : slotsError ? (
                  <div className="alert alert-danger py-2 small">{slotsError}</div>
                ) : slots.length === 0 ? (
                  <div className="alert alert-warning py-2 small">
                    Cụm sân chưa mở khung giờ nào cho ngày này.
                  </div>
                ) : (
                  <div className="row g-2">
                    {slots.map((ts) => {
                      const isDisabled = ts.status !== 'available';
                      const isSelected = selectedSlot?.slotId === ts.slotId;

                      return (
                        <div key={ts.slotId} className="col-6">
                          <button
                            type="button"
                            disabled={isDisabled}
                            className={`slot-btn w-100 ${isDisabled ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => !isDisabled && setSelectedSlot(ts)}
                          >
                            <span className={`fw-bold ${isSelected ? 'text-brand-dark' : isDisabled ? 'text-muted' : 'text-dark'}`}>
                              {ts.slot} {ts.isPeak ? '⭐' : ''}
                            </span>
                            <span
                              style={{ fontSize: '0.72rem' }}
                              className={isDisabled ? 'text-danger-emphasis' : isSelected ? 'text-success fw-bold' : 'text-muted'}
                            >
                              {isSelected ? `Đang chọn • ${Math.round(ts.price / 1000)}k` : ts.label}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price Calculation & Checkout */}
              <div className="pt-3 border-top mb-3">
                <div className="d-flex justify-content-between align-items-baseline mb-1">
                  <span className="text-muted small">Tổng cộng (1 giờ):</span>
                  <span className="small text-muted fw-semibold">
                    {selectedSlot ? `${selectedSlot.slot} • ` : ''}{selectedDate.dateNum}/{selectedDate.monthStr}
                  </span>
                </div>
                <div className="fs-3 fw-bold text-brand-dark mb-3">
                  {Number(activePrice).toLocaleString('vi-VN')}đ
                </div>

                <button
                  type="button"
                  disabled={!selectedSlot || slotsLoading}
                  className="btn btn-brand w-100 py-3 fw-bold fs-6 d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                  onClick={handleBooking}
                >
                  <span>{selectedSlot ? 'Tiến hành Đặt sân ngay' : 'Vui lòng chọn khung giờ trống'}</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>

              {/* Guarantees */}
              <div className="text-center text-muted small" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                <div className="mb-1">
                  <i className="bi bi-shield-check text-success me-1"></i>
                  Kiểm tra lịch thời gian thực • Chống trùng lịch 100%
                </div>
                <div>
                  <i className="bi bi-clock-history text-success me-1"></i>
                  Hỗ trợ hủy lịch nhanh trong mục Lịch đặt của tôi
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
