import { API_BASE } from '../utils/apiConfig';
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
  const courtId = Number(court?.id);
  const hasValidCourtId = Number.isSafeInteger(courtId) && courtId > 0;
  const reviewsSectionRef = useRef(null);
  const [detail, setDetail] = useState(court || null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState('');
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [failedImageUrls, setFailedImageUrls] = useState({});

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
    if (!hasValidCourtId) {
      setDetail(null);
      setSubCourts([]);
      setSelectedSubCourt(null);
      setDetailError('Mã cụm sân không hợp lệ.');
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    setFailedImageUrls({});
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API_BASE}/api/courts/${courtId}`, { headers })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.message || 'Không thể tải chi tiết sân.');
        }
        return json.data;
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        const realSubCourts = Array.isArray(data.subCourts) ? data.subCourts : [];
        setSubCourts(realSubCourts);
        setSelectedSubCourt(realSubCourts[0] || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailError(err.message || 'Không thể tải thông tin chi tiết cụm sân từ máy chủ.');
        setSubCourts([]);
        setSelectedSubCourt(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courtId, hasValidCourtId, currentUser, detailReloadKey]);

  // Load real reviews from PostgreSQL
  const loadReviews = useCallback(async () => {
    if (!hasValidCourtId) return;
    setReviewsState((prev) => ({ ...prev, loading: true }));
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`${API_BASE}/api/courts/${courtId}/reviews`, { headers });
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
  }, [courtId, hasValidCourtId]);

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
    if (!hasValidCourtId || !selectedDate?.fullDate) {
      setSlotsLoading(false);
      return;
    }
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const params = new URLSearchParams({ date: selectedDate.fullDate });
      if (selectedSubCourt?.id) {
        params.append('subCourtId', String(selectedSubCourt.id));
      }
      const res = await fetch(`${API_BASE}/api/courts/${courtId}/availability?${params.toString()}`);
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
  }, [courtId, hasValidCourtId, selectedDate?.fullDate, selectedSubCourt?.id]);

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
      imageUrl: selectedSubCourt?.imageUrl || detail?.imageUrl || court?.imageUrl || null
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
      const res = await fetch(`${API_BASE}/api/courts/${courtId}/reviews`, {
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
      const res = await fetch(`${API_BASE}/api/courts/${courtId}/reviews/my`, {
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
      : Array.isArray(detail?.amenities)
        ? detail.amenities
        : [];

  const activePrice = selectedSlot
    ? Number(selectedSlot.price || 0)
    : Number(selectedSubCourt?.normalPrice ?? detail?.pricePerHour ?? 0);

  const rawGalleryCandidates = [
    selectedSubCourt?.imageUrl,
    detail?.imageUrl,
    ...subCourts.map((s) => s.imageUrl)
  ].filter((u) => typeof u === 'string' && u.trim() !== '');
  const galleryImages = Array.from(new Set(rawGalleryCandidates))
    .filter((url) => !failedImageUrls[url])
    .slice(0, 5);

  const handleImageError = (url) => {
    setFailedImageUrls((prev) => ({ ...prev, [url]: true }));
  };

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
      {/* Architectural Sage Header Band */}
      <section className="subpage-hero-band mb-4">
        <div className="container">
          {/* Breadcrumb & Action Row */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0 small text-muted">
                <li className="breadcrumb-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); onBackToHome(); }} className="text-decoration-none text-muted">
                    <i className="bi bi-house-door me-1"></i>Trang chủ
                  </a>
                </li>
                {detail?.city && (
                  <li className="breadcrumb-item text-muted">{detail.city}</li>
                )}
                <li className="breadcrumb-item active fw-semibold text-brand-dark" aria-current="page">
                  {detail?.name || 'Chi tiết cụm sân'}
                </li>
              </ol>
            </nav>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3 d-flex align-items-center gap-1 bg-white"
                onClick={handleShareClick}
              >
                <i className={`bi ${copiedLink ? 'bi-check2 text-success' : 'bi-share'}`}></i>
                <span>{copiedLink ? 'Đã sao chép ✓' : 'Chia sẻ'}</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-3 ${isSaved ? 'btn-danger' : 'btn-outline-secondary bg-white'} d-flex align-items-center gap-1`}
                onClick={() => onToggleFavorite?.(detail || court)}
                disabled={!detail}
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

          {/* Court Title & Quick Meta */}
          <div>
            <div className="hero-eyebrow mb-2">
              <span className="hero-eyebrow-dot"></span>
              <span>{detail?.category || 'Thể thao'}</span>
            </div>

            <h1 className="h2 fw-bold text-dark mb-2" style={{ letterSpacing: '-0.02em' }}>
              {detail?.name || 'Đang tải thông tin cụm sân...'}
            </h1>

            <div className="d-flex flex-wrap align-items-center gap-3 text-muted small">
              <a
                href="#court-reviews-section"
                className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill bg-white border text-dark fw-semibold text-decoration-none"
                onClick={(e) => {
                  e.preventDefault();
                  reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <i className="bi bi-star-fill text-warning"></i>
                <span>{displayAvgRating}</span>
                <span className="text-muted fw-normal">({displayReviewCount} đánh giá)</span>
              </a>
              {detail?.address && (
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-geo-alt text-brand"></i>
                  <span>{detail.address}</span>
                </div>
              )}
              <span>•</span>
              <span>{subCourts.length > 0 ? `${subCourts.length} sân con` : 'Đặt theo cụm sân'}</span>
              {detail?.openTime && (
                <>
                  <span>•</span>
                  <span>Mở cửa: <strong className="text-dark">{detail.openTime}</strong></span>
                </>
              )}
              {detail?.ownerPhone && (
                <>
                  <span>•</span>
                  <div className="d-flex align-items-center gap-1">
                    <i className="bi bi-telephone text-success"></i>
                    <span>{detail.ownerPhone}</span>
                  </div>
                </>
              )}
              {detail?.ownerBank?.bankAccountNo && (
                <>
                  <span>•</span>
                  <span className="text-brand-dark fw-semibold">
                    <i className="bi bi-qr-code me-1"></i>Hỗ trợ VietQR
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {!detailLoading && detailError && (
          <div className="alert alert-danger rounded-4 d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
            <div>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <strong>Không thể tải thông tin cụm sân:</strong> {detailError}
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger rounded-3"
                onClick={() => setDetailReloadKey((k) => k + 1)}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>Thử lại
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3"
                onClick={onBackToHome}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Real-Image Gallery */}
        {galleryImages.length === 0 ? (
          <div className="position-relative mb-4 border rounded-4 shadow-sm overflow-hidden" style={{ height: '280px' }}>
            <div className="court-placeholder-box">
              <i className="bi bi-image fs-2 opacity-75 mb-2"></i>
              <div className="fw-semibold mb-1">{detail?.name || 'Cụm sân thể thao'}</div>
              <div className="small opacity-75">Chủ sân chưa tải lên hình ảnh cơ sở</div>
            </div>
            {(selectedSubCourt?.name || detail?.name) && (
              <div className="position-absolute bottom-0 start-0 m-3">
                <span className="court-category-pill py-1 px-3">
                  {selectedSubCourt?.name || detail?.name}
                </span>
              </div>
            )}
          </div>
        ) : galleryImages.length === 1 ? (
          <div className="position-relative mb-4 border rounded-4 shadow-sm overflow-hidden" style={{ height: '360px' }}>
            <img
              src={galleryImages[0]}
              alt={detail?.name || 'Hình ảnh cụm sân'}
              className="w-100 h-100 object-fit-cover"
              onError={() => handleImageError(galleryImages[0])}
            />
            <div className="position-absolute bottom-0 start-0 m-3">
              <span className="court-category-pill py-1 px-3">
                {selectedSubCourt?.name || detail?.name}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="court-gallery-grid mb-4 border"
            style={
              galleryImages.length <= 3
                ? { gridTemplateColumns: galleryImages.length === 2 ? '1.5fr 1fr' : '2fr 1fr', gridTemplateRows: galleryImages.length === 2 ? '360px' : '200px 200px' }
                : undefined
            }
          >
            {galleryImages.map((imgUrl, idx) => {
              const isMain = idx === 0;
              const isWideLastOnFour = galleryImages.length === 4 && idx === 3;
              return (
                <div
                  key={imgUrl}
                  className={isMain ? 'gallery-main-img' : 'gallery-sub-img'}
                  style={{
                    ...(isMain && galleryImages.length === 2 ? { gridRow: 'auto', borderRadius: '16px 0 0 16px' } : {}),
                    ...(isWideLastOnFour ? { gridColumn: 'span 2' } : {})
                  }}
                >
                  <img
                    src={imgUrl}
                    alt={idx === 0 ? (detail?.name || 'Mặt sân chính') : `${detail?.name || 'Sân'} - Ảnh ${idx + 1}`}
                    onError={() => handleImageError(imgUrl)}
                  />
                  {isMain && (
                    <div className="position-absolute bottom-0 start-0 m-3">
                      <span className="court-category-pill py-1 px-3">
                        {selectedSubCourt?.name || detail?.name}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Two-Column Details & Sticky Booking Sidebar */}
        <div className="row g-4">
          {/* Left Column */}
          <div className="col-lg-7">
            {/* Danh sách sân con */}
            <div className="editorial-panel-card p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="hero-eyebrow mb-1">
                    <span>DANH SÁCH SÂN CON</span>
                  </div>
                  <h5 className="h6 fw-bold text-dark mb-0">Chọn sân thi đấu tại cơ sở</h5>
                </div>
                <span className="badge bg-brand-light text-brand-dark border border-success-subtle px-2 py-1 rounded-pill">
                  {subCourts.length > 0 ? `${subCourts.length} sân` : 'Theo cơ sở'}
                </span>
              </div>
              {detailLoading ? (
                <div className="small text-muted">Đang tải danh sách sân con...</div>
              ) : subCourts.length === 0 ? (
                <div className="p-3 bg-light rounded-3 border text-muted small">
                  <i className="bi bi-info-circle text-brand me-2"></i>
                  Cụm sân áp dụng đặt theo khung giờ chung toàn cơ sở.
                </div>
              ) : (
                <div className="row g-3">
                  {subCourts.map((sc, idx) => {
                    const isSelected = sc.id === selectedSubCourt?.id && sc.name === selectedSubCourt?.name;
                    return (
                      <div key={sc.id || idx} className="col-md-6">
                        <div
                          className={`subcourt-select-card h-100 ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedSubCourt(sc)}
                        >
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <div className="fw-bold text-dark small">{sc.name}</div>
                            {isSelected && (
                              <span className="badge bg-brand-dark text-white rounded-pill">Đang chọn</span>
                            )}
                          </div>
                          {sc.surfaceType && (
                            <div className="text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                              <i className="bi bi-layers me-1"></i>{sc.surfaceType}
                            </div>
                          )}
                          <div className="d-flex justify-content-between small pt-1">
                            <span className="text-muted">Thường: <strong className="text-dark">{Number(sc.normalPrice).toLocaleString('vi-VN')}đ</strong></span>
                            <span className="text-brand-dark fw-semibold">Giờ vàng: {Number(sc.peakPrice).toLocaleString('vi-VN')}đ</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tiện ích */}
            <div className="editorial-panel-card p-4 mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <div className="hero-eyebrow mb-1">
                    <span>CƠ SỞ VẬT CHẤT</span>
                  </div>
                  <h5 className="h6 fw-bold text-dark mb-0">Tiện ích tại sân</h5>
                </div>
                <span className="text-muted small">{displayAmenities.length} tiện ích</span>
              </div>

              {displayAmenities.length === 0 ? (
                <div className="small text-muted">Chủ sân chưa cập nhật danh sách tiện ích.</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {displayAmenities.map((item, idx) => (
                    <span key={idx} className="amenity-chip px-3 py-1">
                      <i className="bi bi-check2 text-success me-1"></i>
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Đánh giá từ người chơi */}
            <div id="court-reviews-section" ref={reviewsSectionRef} className="editorial-panel-card p-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <div>
                  <div className="hero-eyebrow mb-1">
                    <span>PHẢN HỒI THỰC TẾ</span>
                  </div>
                  <h5 className="h6 fw-bold text-dark mb-1">Đánh giá từ người chơi</h5>
                  <div className="text-muted small">{displayReviewCount} nhận xét tại sân</div>
                </div>
                <span className="badge bg-brand-light text-brand-dark border border-success-subtle px-3 py-2 rounded-pill fw-bold">
                  <i className="bi bi-star-fill text-warning me-1"></i>
                  {displayAvgRating}
                </span>
              </div>

              {/* Rating breakdown */}
              {displayReviewCount > 0 && (
                <div className="row g-2 align-items-center p-3 rounded-4 border mb-4" style={{ backgroundColor: '#f8fafc' }}>
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
                            <div
                              className="progress-bar"
                              style={{ width: `${pct}%`, backgroundColor: '#0b4d3c' }}
                            ></div>
                          </div>
                          <span className="text-muted text-end" style={{ width: '28px' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Review Submission / Eligibility Box */}
              <div
                className={`p-3 rounded-4 border mb-4 ${
                  currentUser && reviewsState.canReview ? 'bg-brand-light border-success-subtle' : 'bg-light'
                }`}
              >
                {!currentUser ? (
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div className="small text-muted">
                      <i className="bi bi-chat-square-quote text-brand me-2"></i>
                      Đăng nhập và hoàn tất Check-in sân để mở quyền viết đánh giá.
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-brand rounded-3"
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
                      className="form-control form-control-sm mb-2 bg-white"
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
                            className="btn btn-sm btn-outline-danger rounded-3"
                            disabled={reviewBusy}
                            onClick={handleDeleteMyReview}
                          >
                            Xóa đánh giá
                          </button>
                        )}
                        <button type="submit" className="btn btn-sm btn-brand rounded-3" disabled={reviewBusy}>
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
                <div className="text-center py-4 text-muted small border rounded-4 bg-white">
                  <i className="bi bi-chat-square-text fs-4 d-block mb-2 text-muted"></i>
                  Chưa có đánh giá nào cho cụm sân này. Hãy là người đầu tiên chia sẻ trải nghiệm sau khi Check-in sân!
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {reviewsState.reviews.map((rv) => (
                    <div key={rv.reviewId} className="p-3 bg-light rounded-4 border">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-brand-dark text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '36px', height: '36px', fontSize: '0.82rem' }}
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

          {/* Right Column: Sticky Editorial Booking Sidebar */}
          <div className="col-lg-5">
            <div className="booking-sidebar-card sticky-top" style={{ top: '90px' }}>
              <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
                <div className="hero-eyebrow">
                  <span className="hero-eyebrow-dot"></span>
                  <span>ĐẶT LỊCH TRỰC TIẾP</span>
                </div>
                <div className="fw-bold text-brand-dark small">
                  {Number(activePrice).toLocaleString('vi-VN')}đ <span className="text-muted fw-normal">/ ca</span>
                </div>
              </div>

              {/* Step 01: Chọn Sân Con */}
              <div className="mb-3">
                <label className="form-label small fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <span className="step-index-pill">01</span>
                  <span>Chọn sân con</span>
                </label>
                {subCourts.length > 0 ? (
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
                ) : (
                  <div className="form-control bg-light fw-semibold text-brand-dark py-2">
                    Cụm sân tiêu chuẩn • {Number(detail?.pricePerHour || 0).toLocaleString('vi-VN')}đ/slot
                  </div>
                )}
              </div>

              {/* Step 02: Chọn Ngày */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <span className="step-index-pill">02</span>
                    <span>Chọn ngày chơi</span>
                  </label>
                  <span className="small text-muted">
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

              {/* Step 03: Chọn Khung Giờ */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label small fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <span className="step-index-pill">03</span>
                    <span>Chọn khung giờ</span>
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
                              {ts.slot}
                              {ts.isPeak && (
                                <i className="bi bi-star-fill text-warning ms-1" style={{ fontSize: '0.68rem' }} title="Giờ vàng"></i>
                              )}
                            </span>
                            <span
                              style={{ fontSize: '0.72rem' }}
                              className={isDisabled ? 'text-danger-emphasis' : isSelected ? 'text-brand-dark fw-semibold' : 'text-muted'}
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
              <div className="price-highlight-box mb-3">
                <div className="d-flex justify-content-between align-items-baseline mb-1">
                  <span className="text-muted small fw-medium">
                    Tổng cộng ({formatDurationLabel(selectedSlot?.durationMinutes)}):
                  </span>
                  <span className="small text-brand-dark fw-semibold">
                    {selectedSlot?.isPeak ? 'Giờ vàng • ' : ''}
                    {selectedSlot ? `${selectedSlot.slot} • ` : ''}
                    {selectedDate.dateNum}/{selectedDate.monthStr}
                  </span>
                </div>
                <div className="fs-3 fw-bold text-brand-dark">
                  {Number(activePrice).toLocaleString('vi-VN')}đ
                </div>
              </div>

              {!currentUser && (
                <div className="alert alert-warning rounded-3 py-2 px-3 small mb-3 d-flex align-items-center gap-2 border-0">
                  <i className="bi bi-person-lock fs-5 flex-shrink-0"></i>
                  <span>Bạn cần đăng nhập tài khoản trước khi tiến hành đặt sân.</span>
                </div>
              )}

              <button
                type="button"
                disabled={slotsLoading || (Boolean(currentUser) && !selectedSlot)}
                className="btn btn-brand w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 rounded-3 mb-3"
                onClick={handleBooking}
              >
                {!currentUser ? (
                  <>
                    <i className="bi bi-box-arrow-in-right"></i>
                    <span>Đăng nhập để đặt sân</span>
                  </>
                ) : (
                  <>
                    <span>{selectedSlot ? 'Tiến hành đặt sân' : 'Chọn khung giờ trống'}</span>
                    <i className="bi bi-arrow-right"></i>
                  </>
                )}
              </button>

              {/* Guarantees */}
              <div className="text-center text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.5' }}>
                <div>Yêu cầu đặt sân sẽ được gửi tới chủ sân xác nhận</div>
                <div>Kiểm tra khung giờ trống theo thời gian thực</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
