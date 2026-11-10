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
    if (b.status === 'PENDING') return 'Chờ xác nhận';
    if (b.status === 'COMPLETED') return 'Đã Check-in';
    if (b.status === 'CANCELLED') return 'Đã hủy';
    return 'Đã xác nhận';
  };

  const renderBookingActions = (b, compactButtons = true) => (
    <div className="d-inline-flex flex-wrap justify-content-end gap-1">
      {b.status !== 'CANCELLED' && (
        <button
          type="button"
          className={`btn btn-sm rounded-3 ${ticketTarget?.id === b.id ? 'btn-brand' : 'btn-outline-success'}`}
          onClick={() => toggleTicketView(b)}
        >
          <i className="bi bi-qr-code me-1"></i>
          {ticketTarget?.id === b.id ? 'Đóng vé' : 'Vé QR'}
        </button>
      )}

      {currentUser && b.status === 'COMPLETED' && onReviewCourt && (
        <button
          type="button"
          className="btn btn-sm rounded-3 btn-outline-warning text-dark"
          onClick={() => onReviewCourt(b.courtId)}
        >
          <i className="bi bi-star-fill text-warning me-1"></i>
          {b.hasReviewed ? 'Sửa đánh giá' : 'Đánh giá'}
        </button>
      )}

      {onRebookCourt && (
        <button
          type="button"
          className="btn btn-sm rounded-3 btn-outline-secondary"
          onClick={() => onRebookCourt(b.courtId)}
        >
          {compactButtons ? 'Đặt lại' : 'Xem sân'}
        </button>
      )}

      {currentUser && (b.status === 'PENDING' || b.status === 'CONFIRMED') && (
        <button
          type="button"
          className="btn btn-sm rounded-3 btn-outline-danger"
          disabled={cancellingId === b.id}
          onClick={() => openCancelConfirm(b)}
        >
          {cancellingId === b.id ? 'Đang hủy...' : 'Hủy'}
        </button>
      )}
    </div>
  );

  return (
    <main className="profile-page flex-grow-1 pb-5">
      {/* Architectural Header Band */}
      <section className="subpage-hero-band mb-4">
        <div className="container">
          <div className="profile-breadcrumb mb-2">
            <button type="button" onClick={onBackToHome}>
              <i className="bi bi-house-door me-1" />
              Trang chủ
            </button>
            <span>/</span>
            <strong>Lịch đặt của tôi</strong>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
            <div>
              <div className="hero-eyebrow mb-2">
                <span className="hero-eyebrow-dot"></span>
                <span>QUẢN LÝ LỊCH CHƠI</span>
              </div>
              <h1 className="h2 fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em' }}>
                Lịch đặt của tôi
              </h1>
              <p className="text-muted small mb-0">
                Theo dõi xác nhận từ chủ sân, mở vé QR check-in và lịch sử đặt sân của bạn.
              </p>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-2">
              {currentUser && onOpenProfile && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-3 bg-white"
                  onClick={onOpenProfile}
                >
                  <i className="bi bi-person me-1"></i>Hồ sơ
                </button>
              )}
              {currentUser && onRefreshBookings && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-3 bg-white"
                  onClick={onRefreshBookings}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-brand btn-sm rounded-3 d-inline-flex align-items-center gap-1"
                onClick={onOpenSearchCourts || onBackToHome}
              >
                <i className="bi bi-plus-lg"></i>
                <span>Đặt sân mới</span>
              </button>
            </div>
          </div>

          {bookings.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-3 pt-3 border-top border-success-subtle">
              <span className="badge bg-white text-dark border px-3 py-2 rounded-pill fw-semibold">
                <span className="text-brand-dark me-1">{counts.ALL}</span> tổng đơn
              </span>
              <span className="badge bg-white text-dark border px-3 py-2 rounded-pill fw-semibold">
                <span className="text-warning-emphasis me-1">{counts.PENDING}</span> chờ xác nhận
              </span>
              <span className="badge bg-white text-dark border px-3 py-2 rounded-pill fw-semibold">
                <span className="text-success me-1">{counts.CONFIRMED}</span> sắp tới
              </span>
              <span className="badge bg-white text-dark border px-3 py-2 rounded-pill fw-semibold">
                <span className="text-primary me-1">{counts.COMPLETED}</span> đã check-in
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="container">
        {/* Guest Phone Lookup */}
        {!currentUser && (
          <div className="editorial-panel-card p-4 mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <div className="hero-eyebrow mb-1">
                  <span className="hero-eyebrow-dot"></span>
                  <span>TRA CỨU NHANH</span>
                </div>
                <h6 className="fw-bold text-dark mb-1">Tra cứu đơn theo Số điện thoại</h6>
                <p className="text-muted small mb-0">
                  Nhập số điện thoại bạn đã dùng đặt sân hoặc đăng nhập để quản lý lịch đặt, hủy đơn và đánh giá.
                </p>
              </div>
              {onRequireAuth && (
                <button
                  type="button"
                  className="btn btn-brand btn-sm rounded-3"
                  onClick={() => onRequireAuth('login')}
                >
                  Đăng nhập
                </button>
              )}
            </div>

            <form onSubmit={handlePhoneLookup} className="row g-2 align-items-center">
              <div className="col-sm-8 col-md-9">
                <input
                  type="tel"
                  className="form-control"
                  placeholder="Nhập số điện thoại đặt sân (tối thiểu 8 chữ số)..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                />
              </div>
              <div className="col-sm-4 col-md-3">
                <button
                  type="submit"
                  className="btn btn-outline-success w-100 rounded-3 fw-semibold"
                  disabled={loading || phoneSearch.trim().length < 8}
                >
                  <i className="bi bi-search me-1"></i>
                  {loading ? 'Đang tìm...' : 'Tra cứu'}
                </button>
              </div>
            </form>

            {lookedUpPhone && !loading && (
              <div className="small text-muted mt-2">
                Tìm thấy <strong>{bookings.length}</strong> đơn cho SĐT <strong>{lookedUpPhone}</strong>.
              </div>
            )}
          </div>
        )}

        {/* Action Alerts */}
        {actionError && (
          <div className="alert alert-danger py-2 px-3 rounded-3 small d-flex align-items-center justify-content-between mb-3">
            <span>{actionError}</span>
            <button type="button" className="btn-close btn-sm" onClick={() => setActionError('')}></button>
          </div>
        )}
        {actionMsg && (
          <div className="alert alert-success py-2 px-3 rounded-3 small d-flex align-items-center justify-content-between mb-3">
            <span>{actionMsg}</span>
            <button type="button" className="btn-close btn-sm" onClick={() => setActionMsg('')}></button>
          </div>
        )}

        {/* Inline Cancel Confirmation */}
        {cancelTarget && (
          <div ref={cancelPanelRef} className="mb-4">
            <form onSubmit={confirmCancelBooking} className="editorial-panel-card border-danger-subtle p-4">
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <div className="fw-bold text-danger">
                    Xác nhận hủy đơn {cancelTarget.id} • {cancelTarget.courtName}
                  </div>
                  <div className="text-muted small mt-1">
                    {formatDisplayDate(cancelTarget.date)} • {cancelTarget.timeSlot}
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
                    className={`sport-filter-pill ${cancelReason === r ? 'bg-danger text-white border-danger' : ''}`}
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
                    placeholder="Lý do hủy lịch..."
                    maxLength={200}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </div>
                <div className="col-md-5 d-flex gap-2 justify-content-md-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3 flex-grow-1 flex-md-grow-0"
                    onClick={() => setCancelTarget(null)}
                  >
                    Giữ lịch
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger rounded-3 fw-semibold flex-grow-1 flex-md-grow-0"
                    disabled={cancellingId === cancelTarget.id}
                  >
                    {cancellingId === cancelTarget.id ? 'Đang hủy...' : 'Xác nhận hủy'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* E-Ticket & VietQR Viewer */}
        {ticketTarget && (
          <div ref={ticketPanelRef} className="editorial-panel-card border-success-subtle p-4 mb-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div className="d-flex align-items-center gap-2">
                <span className="step-index-pill">
                  <i className="bi bi-qr-code-scan"></i>
                </span>
                <span className="fw-bold text-dark">
                  Vé điện tử & Thanh toán ({ticketTarget.id})
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3"
                onClick={() => setTicketTarget(null)}
              >
                Thu gọn
              </button>
            </div>

            <TicketBarcode booking={ticketTarget} />

            {(ticketTarget.note || ticketTarget.ownerPhone) && (
              <div className="d-flex flex-wrap gap-3 mt-3 pt-3 border-top small text-muted">
                {ticketTarget.ownerPhone && (
                  <span>
                    Liên hệ sân: <strong className="text-dark">{ticketTarget.ownerPhone}</strong>
                  </span>
                )}
                {ticketTarget.note && (
                  <span>
                    Ghi chú: <strong className="text-dark">{ticketTarget.note}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Bookings Table / Card List */}
        <div className="editorial-panel-card p-4">
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
                    className={`sport-filter-pill ${statusFilter === tab.key ? 'active' : ''}`}
                    onClick={() => setStatusFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="input-group input-group-sm" style={{ maxWidth: '260px' }}>
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
              <div className="small">Đang tải lịch đặt sân...</div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-calendar-x fs-2 text-muted"></i>
              <h6 className="mt-3 fw-bold text-dark">
                {bookings.length === 0 ? 'Chưa có lịch đặt sân nào' : 'Không có đơn phù hợp bộ lọc'}
              </h6>
              <p className="text-muted small mx-auto mb-3" style={{ maxWidth: '420px' }}>
                {bookings.length > 0
                  ? 'Thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm.'
                  : currentUser
                    ? 'Chọn một cụm sân phù hợp và gửi yêu cầu đặt sân.'
                    : 'Nhập số điện thoại đặt sân ở trên hoặc đăng nhập để xem lịch đặt của bạn.'}
              </p>
              {bookings.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm rounded-3"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setKeyword('');
                  }}
                >
                  Hiển thị tất cả
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-brand btn-sm rounded-3"
                  onClick={onOpenSearchCourts || onBackToHome}
                >
                  Tìm sân ngay
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-responsive d-none d-lg-block">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light small text-muted">
                    <tr>
                      <th scope="col">Mã đơn</th>
                      <th scope="col">Sân</th>
                      <th scope="col">Người đặt</th>
                      <th scope="col">Thời gian</th>
                      <th scope="col">Thanh toán</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col" className="text-end">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className={ticketTarget?.id === b.id ? 'table-success bg-opacity-25' : ''}>
                        <td className="fw-semibold small text-brand-dark">{b.id}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-start fw-bold text-dark small text-decoration-none"
                            onClick={() => onRebookCourt?.(b.courtId)}
                          >
                            {b.courtName}
                          </button>
                          {b.subCourtName && (
                            <div className="small text-muted">{b.subCourtName}</div>
                          )}
                        </td>
                        <td className="small">
                          <div>{b.customerName}</div>
                          <div className="text-muted">{b.phone}</div>
                        </td>
                        <td className="small">
                          <div className="fw-semibold mb-1">{formatDisplayDate(b.date)}</div>
                          <span className="bg-brand-light text-brand-dark px-2 py-1 rounded-2 fw-semibold d-inline-block" style={{ fontSize: '0.76rem' }}>
                            {b.timeSlot}
                          </span>
                        </td>
                        <td className="small">
                          <div className="fw-bold text-dark">
                            {Number(b.totalPrice).toLocaleString('vi-VN')}đ
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {b.paymentMethod || 'Tại quầy'}
                          </div>
                        </td>
                        <td>
                          <span className={`badge rounded-pill px-2 py-1 ${getBadgeClass(b.status)}`}>
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

              {/* Mobile Cards */}
              <div className="d-lg-none d-flex flex-column gap-3">
                {filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`border rounded-4 p-3 ${
                      ticketTarget?.id === b.id ? 'border-success bg-brand-light' : 'bg-white'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                      <span className="fw-semibold small text-brand-dark">{b.id}</span>
                      <span className={`badge rounded-pill px-2 py-1 ${getBadgeClass(b.status)}`}>
                        {getStatusLabel(b)}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-link p-0 text-start fw-bold text-dark text-decoration-none"
                      onClick={() => onRebookCourt?.(b.courtId)}
                    >
                      {b.courtName}
                    </button>
                    {b.subCourtName && (
                      <div className="small text-muted mb-2">{b.subCourtName}</div>
                    )}

                    <div className="d-flex justify-content-between small bg-light rounded-3 p-2 my-2 border">
                      <div>
                        <div className="fw-semibold">{formatDisplayDate(b.date)}</div>
                        <span className="text-brand-dark fw-semibold">{b.timeSlot}</span>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-dark">
                          {Number(b.totalPrice).toLocaleString('vi-VN')}đ
                        </div>
                        <div className="text-muted">{b.paymentMethod || 'Tại quầy'}</div>
                      </div>
                    </div>

                    {b.cancelReason && (
                      <div className="text-danger small mb-2">
                        Lý do hủy: {b.cancelReason}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top gap-2 flex-wrap">
                      <span className="small text-muted">
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
