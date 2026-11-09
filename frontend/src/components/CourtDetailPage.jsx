import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatLocalYMD, getStoredToken } from '../utils/vietqr';

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

const getInitials = (name) => {
  const parts = String(name || 'U').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase() || 'U';
};

const formatReviewTime = (isoStr) => {
  if (!isoStr) return '';
  const dt = new Date(isoStr);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function CourtDetailPage({
  court,
  initialDate,
  availabilityRefreshKey = 0,
  currentUser,
  isFavorite: propIsFavorite,
  scrollToReviews = false,
  onToggleFavorite,
  onRequireAuth,
  onReviewUpdated,
  onNotify,
  onBackToHome,
  onProceedBooking
}) {
  const courtId = court?.id || 1;
  const reviewsSectionRef = useRef(null);
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
  const [copiedLink, setCopiedLink] = useState(false);

  // Real reviews state
  const [reviewsState, setReviewsState] = useState({
    loading: true,
    avgRating: Number(court?.rating || 0),
    reviewCount: Number(court?.reviewCount || 0),
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    canReview: false,
    hasConfirmedBooking: false,
    hasPendingBooking: false,
    myReview: null,
    reviews: []
  });
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewErr, setReviewErr] = useState('');

  // Load facility detail
  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`http://localhost:5000/api/courts/${courtId}`, { headers })
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
  }, [courtId, currentUser]);

  // Load real reviews from PostgreSQL
  const loadReviews = useCallback(async () => {
    setReviewsState((prev) => ({ ...prev, loading: true }));
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`http://localhost:5000/api/courts/${courtId}/reviews`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Không thể tải đánh giá.');
      }
      const d = json.data;
      setReviewsState({
        loading: false,
        avgRating: Number(d.avgRating || 0),
        reviewCount: Number(d.reviewCount || 0),
        breakdown: d.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        canReview: Boolean(d.canReview),
        hasConfirmedBooking: Boolean(d.hasConfirmedBooking),
        hasPendingBooking: Boolean(d.hasPendingBooking),
        myReview: d.myReview || null,
        reviews: Array.isArray(d.reviews) ? d.reviews : []
      });
      if (d.myReview) {
        setRatingInput(Number(d.myReview.rating || 5));
        setCommentInput(d.myReview.comment || '');
      }
    } catch {
      setReviewsState((prev) => ({ ...prev, loading: false }));
    }
  }, [courtId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews, currentUser, availabilityRefreshKey]);

  useEffect(() => {
    if (scrollToReviews && reviewsSectionRef.current) {
      setTimeout(() => {
        reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 220);
    }
  }, [scrollToReviews, detailLoading]);

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
          const same = fetchedSlots.find((s) => s.slotId === prev.slotId && s.status === 'available');
          if (same) return same;
        }
        return fetchedSlots.find((s) => s.status === 'available') || null;
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
    if (!currentUser || !getStoredToken()) {
      onNotify?.('Vui lòng đăng nhập tài khoản để tiếp tục đặt sân.');
      onRequireAuth?.('login');
      return;
    }
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
      ownerBank: detail?.ownerBank || null,
      imageUrl: selectedSubCourt?.imageUrl || detail?.imageUrl || court?.imageUrl
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewErr('');
    setReviewMsg('');
    const token = getStoredToken();
    if (!token) {
      onRequireAuth?.('login');
      return;
    }
    const cleanComment = commentInput.trim();
    if (cleanComment.length < 5) {
      setReviewErr('Vui lòng nhập nhận xét tối thiểu 5 ký tự.');
      return;
    }

    setReviewBusy(true);
    try {
      const res = await fetch(`http://localhost:5000/api/courts/${courtId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: ratingInput,
          comment: cleanComment
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Không thể lưu đánh giá.');
      }
      setReviewMsg(json.message || 'Cảm ơn bạn đã gửi đánh giá!');
      await loadReviews();
      if (json.data) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                rating: json.data.avgRating,
                reviewCount: json.data.reviewCount
              }
            : prev
        );
        onReviewUpdated?.(courtId, json.data.avgRating, json.data.reviewCount);
      }
    } catch (err) {
      setReviewErr(err.message);
    } finally {
      setReviewBusy(false);
    }
  };

  const handleDeleteMyReview = async () => {
    const token = getStoredToken();
    if (!token) return;
    setReviewBusy(true);
    setReviewErr('');
    setReviewMsg('');
    try {
      const res = await fetch(`http://localhost:5000/api/courts/${courtId}/reviews/my`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Không thể xóa đánh giá.');
      }
      setCommentInput('');
      setRatingInput(5);
      setReviewMsg(json.message || 'Đã xóa đánh giá của bạn.');
      await loadReviews();
      if (json.data) {
        setDetail((prev) =>
          prev
            ? {
                ...prev,
                rating: json.data.avgRating,
                reviewCount: json.data.reviewCount
              }
            : prev
        );
        onReviewUpdated?.(courtId, json.data.avgRating, json.data.reviewCount);
      }
    } catch (err) {
      setReviewErr(err.message);
    } finally {
      setReviewBusy(false);
    }
  };

  const isSaved = typeof propIsFavorite === 'boolean' ? propIsFavorite : Boolean(detail?.isFavorite);

  const handleShareClick = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopiedLink(true);
    onNotify?.('Đã sao chép liên kết cụm sân vào khay nhớ tạm!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const displayAmenities =
    selectedSubCourt?.amenities?.length > 0
      ? selectedSubCourt.amenities
      : detail?.amenities || ['Bãi đỗ xe', 'Đèn LED ban đêm', 'Phòng thay đồ'];

  const activePrice = selectedSlot
    ? selectedSlot.price
    : selectedSubCourt?.normalPrice || detail?.pricePerHour || 200000;

  const formatDurationLabel = (mins) => {
    const val = Number(mins || 60);
    if (val % 60 === 0) return `${val / 60} giờ`;
    return `${val} phút`;
  };

  const displayAvgRating = reviewsState.reviewCount > 0
    ? reviewsState.avgRating.toFixed(1)
    : Number(detail?.reviewCount || 0) > 0
      ? Number(detail.rating).toFixed(1)
      : 'Mới';
  const displayReviewCount = reviewsState.reviewCount;

  return (
    <div className="bg-light flex-grow-1 pb-5">
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
              onClick={handleShareClick}
            >
              <i className={`bi ${copiedLink ? 'bi-check2 text-success' : 'bi-share'}`}></i>
              <span>{copiedLink ? 'Đã sao chép ✓' : 'Chia sẻ'}</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isSaved ? 'btn-danger' : 'btn-outline-secondary bg-white'} d-flex align-items-center gap-1`}
              onClick={() => onToggleFavorite?.(detail || court)}
            >
              <i className={`bi ${isSaved ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              <span>{isSaved ? 'Đã lưu' : 'Lưu sân'}</span>
              {Number(detail?.favoritesCount || 0) > 0 && (
                <span className="badge bg-white bg-opacity-25 text-reset ms-1" style={{ fontSize: '0.68rem' }}>
                  {detail.favoritesCount}
                </span>
              )}
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
            {detail?.ownerBank?.bankAccountNo && (
              <span className="badge bg-info-subtle text-info-emphasis py-1 px-2 fw-semibold" style={{ fontSize: '0.72rem' }}>
                <i className="bi bi-qr-code me-1"></i>Hỗ trợ VietQR
              </span>
            )}
          </div>

          <h1 className="h2 fw-bold text-brand-dark mb-2">
            {detail?.name || 'Đang tải thông tin cụm sân...'}
          </h1>

          <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
            <a
              href="#court-reviews-section"
              className="d-flex align-items-center gap-1 text-dark fw-bold text-decoration-none"
              onClick={(e) => {
                e.preventDefault();
                reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <i className="bi bi-star-fill text-warning"></i>
              <span>{displayAvgRating}</span>
              <span className="text-muted fw-normal">({displayReviewCount} đánh giá)</span>
            </a>
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

            {/* ĐÁNH GIÁ TỪ NGƯỜI CHƠI (REAL POSTGRESQL) */}
            <div id="court-reviews-section" ref={reviewsSectionRef} className="bg-white rounded-4 p-4 border shadow-sm">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-inline-flex align-items-center gap-1 bg-warning bg-opacity-25 text-dark fw-bold rounded-pill px-3 py-1">
                    <i className="bi bi-star-fill text-warning"></i>
                    <span>{displayAvgRating}</span>
                  </div>
                  <div>
                    <h5 className="fw-bold text-brand-dark mb-0">Đánh giá từ người chơi</h5>
                    <div className="text-muted small">{displayReviewCount} nhận xét thực tế tại sân</div>
                  </div>
                </div>
              </div>

              {/* Rating breakdown */}
              {displayReviewCount > 0 && (
                <div className="row g-2 align-items-center p-3 bg-light rounded-3 border mb-4">
                  <div className="col-sm-4 text-center border-end-sm">
                    <div className="display-6 fw-bold text-brand-dark mb-0">{displayAvgRating}</div>
                    <div className="text-warning small mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={`bi ${star <= Math.round(reviewsState.avgRating) ? 'bi-star-fill' : 'bi-star'} me-1`}
                        ></i>
                      ))}
                    </div>
                    <div className="small text-muted">{displayReviewCount} lượt đánh giá</div>
                  </div>
                  <div className="col-sm-8">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = Number(reviewsState.breakdown?.[star] || 0);
                      const pct = displayReviewCount > 0 ? Math.round((count / displayReviewCount) * 100) : 0;
                      return (
                        <div key={star} className="d-flex align-items-center gap-2 small mb-1">
                          <span className="text-muted fw-semibold" style={{ width: '34px' }}>{star} ★</span>
                          <div className="progress flex-grow-1" style={{ height: '7px' }}>
                            <div className="progress-bar bg-warning" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-muted text-end" style={{ width: '28px' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review Submission / Eligibility Box */}
              <div className="p-3 bg-light rounded-3 border mb-4">
                {!currentUser ? (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div className="small text-muted">
                      <i className="bi bi-chat-square-quote text-brand me-2"></i>
                      Đăng nhập và hoàn tất Check-in sân để mở quyền viết đánh giá.
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-brand"
                      onClick={() => onRequireAuth?.('login')}
                    >
                      Đăng nhập
                    </button>
                  </div>
                ) : !reviewsState.canReview ? (
                  <div className="small text-muted d-flex align-items-start gap-2">
                    <i className="bi bi-info-circle text-brand fs-5 flex-shrink-0"></i>
                    <span>
                      {reviewsState.hasConfirmedBooking
                        ? 'Đơn đặt sân của bạn đã được chủ sân xác nhận. Sau khi đến sân và hoàn tất Check-in, bạn sẽ mở khóa quyền viết đánh giá.'
                        : reviewsState.hasPendingBooking
                          ? 'Yêu cầu đặt sân của bạn đang chờ chủ sân xác nhận. Bạn có thể gửi đánh giá sau khi Check-in tại sân thành công.'
                          : 'Bạn chỉ có thể viết đánh giá sau khi đã đặt sân và hoàn tất Check-in tại cơ sở này.'}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit}>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <span className="fw-bold small text-brand-dark">
                        {reviewsState.myReview ? 'Cập nhật đánh giá của bạn' : 'Chia sẻ trải nghiệm của bạn'}
                      </span>
                      <div className="d-flex align-items-center gap-1" role="group" aria-label="Chọn số sao">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className="btn btn-sm p-0 border-0 bg-transparent fs-5"
                            onClick={() => setRatingInput(star)}
                            title={`${star} sao`}
                          >
                            <i className={`bi ${star <= ratingInput ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}`}></i>
                          </button>
                        ))}
                        <span className="small fw-semibold text-dark ms-1">{ratingInput}/5</span>
                      </div>
                    </div>

                    <textarea
                      rows="3"
                      className="form-control form-control-sm mb-2"
                      placeholder="Mặt sân, ánh sáng, thái độ phục vụ, chỗ để xe như thế nào?..."
                      maxLength={1000}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                    />

                    {reviewErr && <div className="alert alert-danger py-1 px-2 small mb-2">{reviewErr}</div>}
                    {reviewMsg && <div className="alert alert-success py-1 px-2 small mb-2">{reviewMsg}</div>}

                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {commentInput.trim().length}/1000 ký tự
                      </span>
                      <div className="d-flex gap-2">
                        {reviewsState.myReview && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            disabled={reviewBusy}
                            onClick={handleDeleteMyReview}
                          >
                            Xóa đánh giá
                          </button>
                        )}
                        <button type="submit" className="btn btn-sm btn-brand" disabled={reviewBusy}>
                          {reviewBusy ? 'Đang gửi...' : reviewsState.myReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Reviews list */}
              {reviewsState.loading ? (
                <div className="text-center py-3 small text-muted">Đang tải nhận xét...</div>
              ) : reviewsState.reviews.length === 0 ? (
                <div className="text-center py-4 text-muted small border rounded-3 bg-white">
                  <i className="bi bi-stars fs-4 d-block mb-1 text-warning"></i>
                  Chưa có đánh giá nào cho cụm sân này. Hãy là người đầu tiên chia sẻ trải nghiệm sau khi Check-in sân!
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {reviewsState.reviews.map((rv) => (
                    <div key={rv.reviewId} className="p-3 bg-light rounded-3 border">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '38px', height: '38px', fontSize: '0.85rem' }}
                          >
                            {getInitials(rv.authorName)}
                          </div>
                          <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="fw-bold text-dark small">{rv.authorName}</span>
                              {rv.isMine && (
                                <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.65rem' }}>
                                  Của bạn
                                </span>
                              )}
                              {rv.verifiedBooking && (
                                <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.65rem' }}>
                                  <i className="bi bi-patch-check-fill me-1"></i>Đã Check-in
                                </span>
                              )}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                              {formatReviewTime(rv.updatedAt || rv.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="text-warning small flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i key={star} className={`bi ${star <= rv.rating ? 'bi-star-fill' : 'bi-star'}`}></i>
                          ))}
                        </div>
                      </div>
                      <p className="text-dark small mb-0" style={{ lineHeight: '1.55', whiteSpace: 'pre-line' }}>
                        {rv.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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
                    const match = subCourts.find((c) => String(c.id ?? '') === val);
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
                  {dateOptions.map((d) => (
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
                  <span className="text-muted small">
                    Tổng cộng ({formatDurationLabel(selectedSlot?.durationMinutes)}):
                  </span>
                  <span className="small text-muted fw-semibold">
                    {selectedSlot?.isPeak ? 'Giờ vàng ⭐ • ' : ''}
                    {selectedSlot ? `${selectedSlot.slot} • ` : ''}
                    {selectedDate.dateNum}/{selectedDate.monthStr}
                  </span>
                </div>
                <div className="fs-3 fw-bold text-brand-dark mb-3">
                  {Number(activePrice).toLocaleString('vi-VN')}đ
                </div>

                {!currentUser && (
                  <div className="alert alert-warning py-2 px-3 small mb-2 d-flex align-items-center gap-2 border-0">
                    <i className="bi bi-person-lock fs-5 flex-shrink-0"></i>
                    <span>Bạn cần đăng nhập tài khoản trước khi tiến hành đặt sân.</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={slotsLoading || (Boolean(currentUser) && !selectedSlot)}
                  className="btn btn-brand w-100 py-3 fw-bold fs-6 d-flex align-items-center justify-content-center gap-2 shadow-sm rounded-3"
                  onClick={handleBooking}
                >
                  {!currentUser ? (
                    <>
                      <i className="bi bi-box-arrow-in-right"></i>
                      <span>Đăng nhập để Đặt sân ngay</span>
                    </>
                  ) : (
                    <>
                      <span>{selectedSlot ? 'Tiến hành Đặt sân ngay' : 'Vui lòng chọn khung giờ trống'}</span>
                      <i className="bi bi-arrow-right"></i>
                    </>
                  )}
                </button>
              </div>

              {/* Guarantees */}
              <div className="text-center text-muted small" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                <div className="mb-1">
                  <i className="bi bi-hourglass-split text-warning me-1"></i>
                  Yêu cầu đặt sân sẽ được gửi tới chủ sân xác nhận
                </div>
                <div>
                  <i className="bi bi-shield-check text-success me-1"></i>
                  Kiểm tra lịch thời gian thực • Chống trùng lịch 100%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
