import React, { useState, useMemo, useRef } from 'react';
import TicketBarcode from './TicketBarcode';
import { formatDisplayDate, getStoredToken } from '../utils/vietqr';

const QUICK_CANCEL_REASONS = [
  'Thay đổi lịch cá nhân',
  'Thời tiết không thuận lợi',
  'Đặt nhầm ngày / khung giờ',
  'Đổi sang cụm sân khác'
];

export default function MyBookingsPage({
  bookings = [],
  loading = false,
  currentUser,
  onRequireAuth,
  onBackToHome,
  onOpenSearchCourts,
  onOpenProfile,
  onRefreshBookings,
  onLookupByPhone,
  onCancelSuccess,
  onRebookCourt,
  onReviewCourt
}) {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [lookedUpPhone, setLookedUpPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('Thay đổi lịch cá nhân');

  const [ticketTarget, setTicketTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const ticketPanelRef = useRef(null);
  const cancelPanelRef = useRef(null);

  const counts = useMemo(() => {
    const res = { ALL: bookings.length, PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
    bookings.forEach((b) => {
      if (b.status === 'PENDING') res.PENDING += 1;
      else if (b.status === 'CONFIRMED') res.CONFIRMED += 1;
      else if (b.status === 'COMPLETED') res.COMPLETED += 1;
      else if (b.status === 'CANCELLED') res.CANCELLED += 1;
    });
    return res;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
      if (!kw) return true;
      return (
        String(b.id || '').toLowerCase().includes(kw) ||
        String(b.courtName || '').toLowerCase().includes(kw) ||
        String(b.subCourtName || '').toLowerCase().includes(kw) ||
        String(b.address || '').toLowerCase().includes(kw) ||
        String(b.date || '').toLowerCase().includes(kw) ||
        formatDisplayDate(b.date).toLowerCase().includes(kw)
      );
    });
  }, [bookings, statusFilter, keyword]);

  const openCancelConfirm = (booking) => {
    setActionError('');
    setActionMsg('');
    setCancelTarget(booking);
    setCancelReason('Thay đổi lịch cá nhân');
    setTimeout(() => {
      cancelPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const toggleTicketView = (booking) => {
    if (ticketTarget?.id === booking.id) {
      setTicketTarget(null);
      return;
    }
    setTicketTarget(booking);
    setTimeout(() => {
      ticketPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const confirmCancelBooking = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;

    const token = getStoredToken();
    if (!token) {
      setActionError('Vui lòng đăng nhập tài khoản để thực hiện hủy lịch.');
      return;
    }

    const reasonText = cancelReason.trim() || 'Khách hàng chủ động hủy lịch';
    setCancellingId(cancelTarget.id);
    setActionError('');
    setActionMsg('');

    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${encodeURIComponent(cancelTarget.id)}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reasonText })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Không thể hủy đơn đặt sân.');
      }
      setActionMsg(payload.message || 'Đã hủy lịch đặt sân.');
      onCancelSuccess?.(cancelTarget.id, reasonText);
      if (ticketTarget?.id === cancelTarget.id) setTicketTarget(null);
      setCancelTarget(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  const handlePhoneLookup = (e) => {
    e.preventDefault();
    const cleaned = phoneSearch.trim();
    if (!cleaned) return;
    setActionError('');
    setActionMsg('');
    setTicketTarget(null);
    setLookedUpPhone(cleaned);
    onLookupByPhone?.(cleaned);
  };

  const getBadgeClass = (status) => {
    if (status === 'CANCELLED') return 'bg-danger-subtle text-danger border border-danger-subtle';
    if (status === 'COMPLETED') return 'bg-primary-subtle text-primary border border-primary-subtle';
    if (status === 'PENDING') return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    return 'bg-success-subtle text-success border border-success-subtle';
  };

  const getStatusLabel = (b) => {
    if (b.statusLabel) return b.statusLabel;
    if (b.status === 'PENDING') return 'Chờ chủ sân xác nhận';
    if (b.status === 'COMPLETED') return 'Đã Check-in';
    if (b.status === 'CANCELLED') return 'Đã hủy';
    return 'Đã xác nhận';
  };

  const renderBookingActions = (b, compactButtons = true) => (
    <div className="d-inline-flex flex-wrap justify-content-end gap-1">
      {b.status !== 'CANCELLED' && (
        <button
          type="button"
          className={`btn btn-sm ${ticketTarget?.id === b.id ? 'btn-success' : 'btn-outline-success'}`}
          onClick={() => toggleTicketView(b)}
          title="Xem vé điện tử & QR check-in"
        >
          <i className="bi bi-qr-code me-1"></i>
          {ticketTarget?.id === b.id ? 'Đang xem vé' : 'Vé QR'}
        </button>
      )}

      {currentUser && b.status === 'COMPLETED' && onReviewCourt && (
        <button
          type="button"
          className="btn btn-sm btn-outline-warning text-dark"
          onClick={() => onReviewCourt(b.courtId)}
          title={b.hasReviewed ? 'Xem / chỉnh sửa đánh giá của bạn' : 'Đánh giá trải nghiệm sân'}
        >
          <i className="bi bi-star-fill text-warning me-1"></i>
          {b.hasReviewed ? 'Sửa đánh giá' : 'Đánh giá'}
        </button>
      )}

      {onRebookCourt && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => onRebookCourt(b.courtId)}
          title="Xem chi tiết hoặc đặt lại khung giờ khác tại sân này"
        >
          {compactButtons ? 'Đặt lại' : 'Xem & Đặt lại'}
        </button>
      )}

      {currentUser && (b.status === 'PENDING' || b.status === 'CONFIRMED') && (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          disabled={cancellingId === b.id}
          onClick={() => openCancelConfirm(b)}
        >
          {cancellingId === b.id ? 'Đang hủy...' : 'Hủy'}
        </button>
      )}
    </div>
  );

  const summaryCards = [
    {
      key: 'ALL',
      label: 'Tổng lượt đặt',
      value: counts.ALL,
      icon: 'bi-calendar2-week-fill',
      iconBg: 'bg-success-subtle text-brand-dark',
      borderActive: 'border-success'
    },
    {
      key: 'PENDING',
      label: 'Chờ chủ sân duyệt',
      value: counts.PENDING,
      icon: 'bi-hourglass-split',
      iconBg: 'bg-warning-subtle text-warning-emphasis',
      borderActive: 'border-warning'
    },
    {
      key: 'CONFIRMED',
      label: 'Đã xác nhận',
      value: counts.CONFIRMED,
      icon: 'bi-check-circle-fill',
      iconBg: 'bg-success-subtle text-success',
      borderActive: 'border-success'
    },
    {
      key: 'COMPLETED',
      label: 'Đã Check-in sân',
      value: counts.COMPLETED,
      icon: 'bi-patch-check-fill',
      iconBg: 'bg-primary-subtle text-primary',
      borderActive: 'border-primary'
    }
  ];

  return (
    <main className="profile-page flex-grow-1 pb-5">
      <div className="container py-4 py-lg-5">
        {/* Breadcrumb */}
        <div className="profile-breadcrumb mb-4">
          <button type="button" onClick={onBackToHome}>
            <i className="bi bi-house-door me-1" />
            Trang chủ
          </button>
          <span>/</span>
          <strong>Lịch đặt sân của tôi</strong>
        </div>

        {/* Page Header Card */}
        <div className="bg-white rounded-4 border shadow-xs p-4 mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-start gap-3">
              <div
                className="rounded-4 bg-brand-light text-brand-dark d-flex align-items-center justify-content-center flex-shrink-0 border border-success-subtle"
                style={{ width: '52px', height: '52px' }}
              >
                <i className="bi bi-calendar2-check-fill fs-4"></i>
              </div>
              <div>
                <h1 className="h4 fw-bold text-brand-dark mb-1">Lịch đặt sân của tôi</h1>
                <p className="text-muted small mb-0">
                  Theo dõi trạng thái xác nhận từ chủ sân, mở vé QR check-in, thanh toán VietQR hoặc đánh giá sân sau khi đã Check-in.
                </p>
              </div>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {currentUser && onOpenProfile && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                  onClick={onOpenProfile}
                >
                  <i className="bi bi-person me-1"></i>Hồ sơ cá nhân
                </button>
              )}
              {currentUser && onRefreshBookings && (
                <button
                  type="button"
                  className="btn btn-outline-success btn-sm rounded-pill px-3"
                  onClick={onRefreshBookings}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-brand btn-sm rounded-pill px-3"
                onClick={onOpenSearchCourts || onBackToHome}
              >
                <i className="bi bi-plus-circle me-1"></i>Đặt sân mới
              </button>
            </div>
          </div>

          {/* Interactive Status Summary KPI Cards */}
          {(currentUser || bookings.length > 0) && (
            <div className="row g-3 mt-3 pt-3 border-top">
              {summaryCards.map((card) => {
                const isSelected = statusFilter === card.key;
                return (
                  <div key={card.key} className="col-6 col-md-3">
                    <button
                      type="button"
                      onClick={() => setStatusFilter(card.key)}
                      className={`w-100 text-start p-3 rounded-3 border bg-light transition-all d-flex align-items-center gap-3 ${
                        isSelected ? `${card.borderActive} border-2 shadow-xs bg-white` : ''
                      }`}
                    >
                      <div
                        className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${card.iconBg}`}
                        style={{ width: '40px', height: '40px' }}
                      >
                        <i className={`bi ${card.icon} fs-5`}></i>
                      </div>
                      <div>
                        <div className="fw-bold fs-5 text-dark lh-1 mb-1">{card.value}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{card.label}</div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guest Phone Lookup Banner (when not logged in) */}
        {!currentUser && (
          <div className="bg-white rounded-4 border shadow-xs p-4 mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h6 className="fw-bold text-brand-dark mb-1">
                  <i className="bi bi-search me-2 text-brand"></i>Tra cứu lịch đặt bằng Số điện thoại
                </h6>
                <p className="text-muted small mb-0">
                  Nhập số điện thoại bạn đã dùng đặt sân hoặc đăng nhập tài khoản để đồng bộ lịch tự động, hủy đơn và gửi đánh giá.
                </p>
              </div>
              {onRequireAuth && (
                <button
                  type="button"
                  className="btn btn-brand btn-sm rounded-pill px-3"
                  onClick={() => onRequireAuth('login')}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>Đăng nhập ngay
                </button>
              )}
            </div>

            <form onSubmit={handlePhoneLookup} className="row g-2 align-items-center">
              <div className="col-sm-8 col-md-9">
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted">
                    <i className="bi bi-telephone"></i>
                  </span>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Nhập số điện thoại đã đặt sân (tối thiểu 8 chữ số)..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-sm-4 col-md-3">
                <button
                  type="submit"
                  className="btn btn-outline-success w-100 fw-semibold"
                  disabled={loading || phoneSearch.trim().length < 8}
                >
                  <i className="bi bi-search me-1"></i>
                  {loading ? 'Đang tra cứu...' : 'Tra cứu đơn'}
                </button>
              </div>
            </form>

            {lookedUpPhone && !loading && (
              <div className="small text-muted mt-2">
                Kết quả tra cứu cho số điện thoại <strong>{lookedUpPhone}</strong>: tìm thấy <strong>{bookings.length}</strong> đơn.
              </div>
            )}
          </div>
        )}

        {/* Action Feedback Alerts */}
        {actionError && (
          <div className="alert alert-danger border-0 shadow-xs rounded-3 d-flex align-items-center justify-content-between gap-2 mb-4">
            <span>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {actionError}
            </span>
            <button type="button" className="btn-close btn-sm" onClick={() => setActionError('')}></button>
          </div>
        )}
        {actionMsg && (
          <div className="alert alert-success border-0 shadow-xs rounded-3 d-flex align-items-center justify-content-between gap-2 mb-4">
            <span>
              <i className="bi bi-check-circle-fill me-2"></i>
              {actionMsg}
            </span>
            <button type="button" className="btn-close btn-sm" onClick={() => setActionMsg('')}></button>
          </div>
        )}

        {/* Inline Cancel Confirmation Panel */}
        {cancelTarget && (
          <div ref={cancelPanelRef} className="mb-4">
            <form
              onSubmit={confirmCancelBooking}
              className="bg-white border border-danger-subtle rounded-4 p-4 shadow-xs"
            >
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <div className="fw-bold text-danger">
                    <i className="bi bi-exclamation-octagon-fill me-2"></i>
                    Xác nhận hủy đơn {cancelTarget.id} • {cancelTarget.courtName}
                  </div>
                  <div className="text-muted small mt-1">
                    Ngày chơi: <strong>{formatDisplayDate(cancelTarget.date)}</strong> • Khung giờ:{' '}
                    <strong>{cancelTarget.timeSlot}</strong>
                    {cancelTarget.subCourtName ? ` • ${cancelTarget.subCourtName}` : ''}
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setCancelTarget(null)}></button>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-3">
                {QUICK_CANCEL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`btn btn-sm rounded-pill ${
                      cancelReason === r ? 'btn-danger' : 'btn-outline-secondary'
                    }`}
                    onClick={() => setCancelReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="row g-2 align-items-center">
                <div className="col-md-7">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập lý do hủy lịch..."
                    maxLength={200}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <div className="col-md-5 d-flex gap-2 justify-content-md-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary flex-grow-1 flex-md-grow-0"
                    onClick={() => setCancelTarget(null)}
                  >
                    Giữ lại lịch
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger fw-semibold flex-grow-1 flex-md-grow-0"
                    disabled={cancellingId === cancelTarget.id}
                  >
                    {cancellingId === cancelTarget.id ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Interactive E-Ticket & VietQR Viewer Panel */}
        {ticketTarget && (
          <div ref={ticketPanelRef} className="bg-white rounded-4 border border-success-subtle shadow-xs p-4 mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="fw-bold text-brand-dark d-flex align-items-center gap-2">
                <i className="bi bi-ticket-perforated-fill text-brand fs-5"></i>
                <span>Chi tiết Vé điện tử & Thanh toán ({ticketTarget.id})</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={() => setTicketTarget(null)}
              >
                <i className="bi bi-chevron-up me-1"></i>Thu gọn vé
              </button>
            </div>

            <TicketBarcode booking={ticketTarget} />

            {(ticketTarget.note || ticketTarget.ownerPhone) && (
              <div className="d-flex flex-wrap gap-3 mt-3 pt-3 border-top small text-muted">
                {ticketTarget.ownerPhone && (
                  <span>
                    <i className="bi bi-telephone me-1 text-brand"></i>
                    Liên hệ chủ sân: <strong className="text-dark">{ticketTarget.ownerPhone}</strong>
                  </span>
                )}
                {ticketTarget.note && (
                  <span>
                    <i className="bi bi-chat-left-text me-1 text-brand"></i>
                    Ghi chú của bạn: <strong className="text-dark">{ticketTarget.note}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Bookings Container */}
        <div className="bg-white rounded-4 border shadow-xs p-4">
          {/* Filter Tabs & Keyword Search */}
          {bookings.length > 0 && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pb-3 mb-3 border-bottom">
              <div className="d-flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
                {[
                  { key: 'ALL', label: `Tất cả (${counts.ALL})` },
                  { key: 'PENDING', label: `Chờ xác nhận (${counts.PENDING})` },
                  { key: 'CONFIRMED', label: `Đã xác nhận (${counts.CONFIRMED})` },
                  { key: 'COMPLETED', label: `Đã Check-in (${counts.COMPLETED})` },
                  { key: 'CANCELLED', label: `Đã hủy (${counts.CANCELLED})` }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 ${
                      statusFilter === tab.key ? 'btn-brand' : 'btn-outline-secondary'
                    }`}
                    onClick={() => setStatusFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                <span className="input-group-text bg-light">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Tìm mã BK-, tên sân, ngày..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                {keyword && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setKeyword('')}
                    title="Xóa từ khóa"
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-5 text-muted">
              <div className="spinner-border text-success mb-2" role="status"></div>
              <div className="small">Đang tải lịch đặt sân từ PostgreSQL...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: '72px', height: '72px' }}
              >
                <i className="bi bi-calendar-x fs-2 text-muted"></i>
              </div>
              <h5 className="fw-bold text-dark">
                {bookings.length === 0 ? 'Chưa có lịch đặt sân nào' : 'Không có đơn đặt phù hợp bộ lọc'}
              </h5>
              <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '460px' }}>
                {bookings.length > 0
                  ? 'Hãy thử chuyển sang tab trạng thái khác hoặc xóa từ khóa tìm kiếm để xem toàn bộ lịch sử đặt sân.'
                  : currentUser
                    ? 'Hãy chọn một cụm sân phù hợp và gửi yêu cầu đặt sân ngay hôm nay.'
                    : 'Hãy nhập số điện thoại đã đặt sân ở khung tra cứu phía trên hoặc đăng nhập để xem lịch sử đặt sân của bạn.'}
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                {bookings.length > 0 ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill px-4"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setKeyword('');
                    }}
                  >
                    Hiển thị tất cả đơn
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-brand btn-sm rounded-pill px-4"
                    onClick={onOpenSearchCourts || onBackToHome}
                  >
                    <i className="bi bi-search me-1"></i>Tìm sân ngay
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="table-responsive d-none d-lg-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-muted">
                    <tr>
                      <th scope="col">Mã Đơn</th>
                      <th scope="col">Cụm Sân & Sân Con</th>
                      <th scope="col">Người Đặt</th>
                      <th scope="col">Ngày & Khung Giờ</th>
                      <th scope="col">Thanh Toán</th>
                      <th scope="col">Trạng Thái</th>
                      <th scope="col" className="text-end">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className={ticketTarget?.id === b.id ? 'table-success bg-opacity-25' : ''}>
                        <td className="fw-bold small text-secondary">{b.id}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-start fw-semibold text-brand-dark small text-decoration-none"
                            onClick={() => onRebookCourt?.(b.courtId)}
                          >
                            {b.courtName}
                          </button>
                          {b.address && (
                            <div className="text-muted text-truncate" style={{ fontSize: '0.74rem', maxWidth: '240px' }}>
                              <i className="bi bi-geo-alt me-1"></i>
                              {b.address}
                            </div>
                          )}
                          {b.subCourtName && (
                            <span className="badge bg-light text-dark border mt-1" style={{ fontSize: '0.7rem' }}>
                              {b.subCourtName}
                            </span>
                          )}
                        </td>
                        <td className="small">
                          <div className="fw-semibold">{b.customerName}</div>
                          <div className="text-muted">{b.phone}</div>
                        </td>
                        <td className="small">
                          <div className="fw-semibold">{formatDisplayDate(b.date)}</div>
                          <div className="badge bg-success-subtle text-success mt-1">{b.timeSlot}</div>
                        </td>
                        <td className="small">
                          <div className="fw-bold text-brand-dark">
                            {Number(b.totalPrice).toLocaleString('vi-VN')}đ
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                            {b.paymentMethod || 'Tại quầy'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge px-2 py-1 ${getBadgeClass(b.status)}`}>
                            {getStatusLabel(b)}
                          </span>
                          {b.cancelReason && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.72rem', maxWidth: '180px' }}>
                              Lý do: {b.cancelReason}
                            </div>
                          )}
                        </td>
                        <td className="text-end">{renderBookingActions(b, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Card View */}
              <div className="d-lg-none d-flex flex-column gap-3">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`border rounded-4 p-3 ${
                      ticketTarget?.id === b.id ? 'border-success bg-light' : 'bg-white'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <span className="fw-bold small text-secondary me-2">{b.id}</span>
                        {b.subCourtName && (
                          <span className="badge bg-light text-dark border" style={{ fontSize: '0.7rem' }}>
                            {b.subCourtName}
                          </span>
                        )}
                      </div>
                      <span className={`badge px-2 py-1 ${getBadgeClass(b.status)}`}>
                        {getStatusLabel(b)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-link p-0 text-start fw-bold text-brand-dark text-decoration-none mb-1"
                      onClick={() => onRebookCourt?.(b.courtId)}
                    >
                      {b.courtName}
                    </button>

                    {b.address && (
                      <div className="small text-muted mb-2">
                        <i className="bi bi-geo-alt me-1 text-brand"></i>
                        {b.address}
                      </div>
                    )}

                    <div className="row g-2 small bg-light rounded-3 p-2 mb-2 border">
                      <div className="col-6">
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Ngày & Giờ chơi</div>
                        <div className="fw-semibold">{formatDisplayDate(b.date)}</div>
                        <span className="badge bg-success-subtle text-success">{b.timeSlot}</span>
                      </div>
                      <div className="col-6 text-end">
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>Thanh toán</div>
                        <div className="fw-bold text-brand-dark">
                          {Number(b.totalPrice).toLocaleString('vi-VN')}đ
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          {b.paymentMethod || 'Tại quầy'}
                        </div>
                      </div>
                    </div>

                    {b.cancelReason && (
                      <div className="text-danger small mb-2">
                        <i className="bi bi-info-circle me-1"></i>Lý do hủy: {b.cancelReason}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top gap-2 flex-wrap">
                      <span className="small text-muted">
                        <i className="bi bi-person me-1"></i>
                        {b.customerName} • {b.phone}
                      </span>
                      {renderBookingActions(b, false)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

