import React, { useState, useMemo } from 'react';
import TicketBarcode from './TicketBarcode';
import { getStoredToken } from '../utils/vietqr';

const QUICK_CANCEL_REASONS = [
  'Thay đổi lịch cá nhân',
  'Thời tiết không thuận lợi',
  'Đặt nhầm ngày / khung giờ',
  'Đổi sang cụm sân khác'
];

export default function MyBookingsModal({
  bookings = [],
  loading = false,
  currentUser,
  onRequireAuth,
  onClose,
  onRefreshBookings,
  onLookupByPhone,
  onCancelSuccess,
  onRebookCourt,
  onReviewCourt
}) {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [keyword, setKeyword] = useState('');

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('Thay đổi lịch cá nhân');

  const [ticketTarget, setTicketTarget] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

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
        String(b.date || '').toLowerCase().includes(kw)
      );
    });
  }, [bookings, statusFilter, keyword]);

  const openCancelConfirm = (booking) => {
    setActionError('');
    setActionMsg('');
    setCancelTarget(booking);
    setCancelReason('Thay đổi lịch cá nhân');
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
    if (!phoneSearch.trim()) return;
    setActionError('');
    onLookupByPhone?.(phoneSearch.trim());
  };

  const getBadgeClass = (status) => {
    if (status === 'CANCELLED') return 'bg-danger-subtle text-danger border border-danger-subtle';
    if (status === 'COMPLETED') return 'bg-primary-subtle text-primary border border-primary-subtle';
    if (status === 'PENDING') return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    return 'bg-success-subtle text-success border border-success-subtle';
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold text-brand-dark d-flex align-items-center gap-2">
              <i className="bi bi-calendar-check text-brand"></i>
              <span>Lịch đặt sân của tôi</span>
            </h5>
            <div className="d-flex align-items-center gap-2 ms-auto me-2">
              {currentUser && onRefreshBookings && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-success"
                  onClick={onRefreshBookings}
                  disabled={loading}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
                </button>
              )}
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {!currentUser && (
              <form onSubmit={handlePhoneLookup} className="row g-2 align-items-center mb-3 bg-light p-3 rounded-3 border">
                <div className="col-md-8">
                  <label className="form-label small fw-semibold mb-1 text-muted">
                    Tra cứu lịch đặt theo Số điện thoại (hoặc đăng nhập để xem tự động):
                  </label>
                  <input
                    type="tel"
                    className="form-control form-control-sm"
                    placeholder="Nhập số điện thoại bạn đã dùng đặt sân..."
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-4 d-flex align-items-end gap-2">
                  <button type="submit" className="btn btn-brand btn-sm flex-grow-1 mt-md-4" disabled={loading}>
                    <i className="bi bi-search me-1"></i>Tra cứu đơn
                  </button>
                  {onRequireAuth && (
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm mt-md-4"
                      onClick={() => onRequireAuth('login')}
                    >
                      Đăng nhập
                    </button>
                  )}
                </div>
              </form>
            )}

            {actionError && <div className="alert alert-danger py-2 small">{actionError}</div>}
            {actionMsg && <div className="alert alert-success py-2 small">{actionMsg}</div>}

            {/* Inline Cancel Confirmation Panel */}
            {cancelTarget && (
              <form onSubmit={confirmCancelBooking} className="border border-danger-subtle bg-danger-subtle bg-opacity-25 rounded-3 p-3 mb-3">
                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <div className="fw-bold text-danger small">
                      <i className="bi bi-exclamation-octagon me-1"></i>
                      Xác nhận hủy đơn {cancelTarget.id} • {cancelTarget.courtName}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                      Ngày {cancelTarget.date} • Khung giờ {cancelTarget.timeSlot}
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-sm" onClick={() => setCancelTarget(null)}></button>
                </div>

                <div className="d-flex flex-wrap gap-1 mb-2">
                  {QUICK_CANCEL_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`btn btn-xs btn-sm py-0 px-2 rounded-pill ${
                        cancelReason === r ? 'btn-danger' : 'btn-outline-secondary bg-white'
                      }`}
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setCancelReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="input-group input-group-sm">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập lý do hủy lịch..."
                    maxLength={200}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setCancelTarget(null)}>
                    Giữ lịch
                  </button>
                  <button type="submit" className="btn btn-danger fw-semibold" disabled={cancellingId === cancelTarget.id}>
                    {cancellingId === cancelTarget.id ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
                  </button>
                </div>
              </form>
            )}

            {/* E-Ticket Drawer */}
            {ticketTarget && (
              <div className="mb-4 position-relative">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small fw-bold text-brand-dark">
                    <i className="bi bi-ticket-perforated me-1"></i>Chi tiết Vé điện tử & Thanh toán ({ticketTarget.id})
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                    onClick={() => setTicketTarget(null)}
                  >
                    Thu gọn vé
                  </button>
                </div>
                <TicketBarcode booking={ticketTarget} compact />
              </div>
            )}

            {/* Filter & Search Bar */}
            {bookings.length > 0 && (
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div className="btn-group btn-group-sm flex-wrap" role="group" aria-label="Lọc theo trạng thái">
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
                      className={`btn ${statusFilter === tab.key ? 'btn-brand' : 'btn-outline-secondary'}`}
                      onClick={() => setStatusFilter(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="input-group input-group-sm" style={{ maxWidth: '250px' }}>
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm mã BK-, tên sân, ngày..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
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
                <i className="bi bi-calendar-x fs-1 text-muted"></i>
                <h6 className="mt-3 fw-bold">
                  {bookings.length === 0 ? 'Chưa có lịch đặt sân nào' : 'Không có đơn đặt phù hợp bộ lọc'}
                </h6>
                <p className="text-muted small">
                  {bookings.length > 0
                    ? 'Hãy thử chuyển tab trạng thái hoặc xóa từ khóa tìm kiếm.'
                    : currentUser
                      ? 'Hãy chọn một sân yêu thích và đặt lịch ngay hôm nay!'
                      : 'Nhập số điện thoại đặt sân ở trên hoặc đăng nhập để xem lịch sử đặt sân của bạn.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive">
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
                      <tr key={b.id}>
                        <td className="fw-bold small text-secondary">{b.id}</td>
                        <td>
                          <div className="fw-semibold text-brand-dark small">{b.courtName}</div>
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
                          <div className="fw-semibold">{b.date}</div>
                          <div className="badge bg-success-subtle text-success">{b.timeSlot}</div>
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
                            {b.statusLabel || (b.status === 'PENDING' ? 'Chờ chủ sân xác nhận' : b.status === 'COMPLETED' ? 'Đã Check-in' : b.status === 'CANCELLED' ? 'Đã hủy' : 'Đã xác nhận')}
                          </span>
                          {b.cancelReason && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                              Lý do: {b.cancelReason}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-inline-flex flex-wrap justify-content-end gap-1">
                            {b.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                className={`btn btn-sm ${ticketTarget?.id === b.id ? 'btn-success' : 'btn-outline-success'}`}
                                onClick={() => setTicketTarget(ticketTarget?.id === b.id ? null : b)}
                                title="Xem vé điện tử & QR check-in"
                              >
                                <i className="bi bi-qr-code me-1"></i>Vé QR
                              </button>
                            )}

                            {currentUser && b.status === 'COMPLETED' && onReviewCourt && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning text-dark"
                                onClick={() => {
                                  onClose();
                                  onReviewCourt(b.courtId);
                                }}
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
                                onClick={() => {
                                  onClose();
                                  onRebookCourt(b.courtId);
                                }}
                                title="Đặt lại khung giờ khác tại sân này"
                              >
                                Đặt lại
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-secondary px-4" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
