import React, { useState } from 'react';

export default function MyBookingsModal({
  bookings = [],
  loading = false,
  currentUser,
  onClose,
  onRefreshBookings,
  onLookupByPhone,
  onCancelSuccess
}) {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const handleCancelBooking = async (booking) => {
    const token = localStorage.getItem('sportsbooking_token') || sessionStorage.getItem('sportsbooking_token') || '';
    if (!token) {
      setActionError('Vui lòng đăng nhập tài khoản để thực hiện hủy lịch.');
      return;
    }

    const reasonInput = window.prompt(
      `Xác nhận hủy đơn [${booking.id}] tại ${booking.courtName}?\nNhập lý do hủy (tùy chọn):`,
      'Khách hàng thay đổi kế hoạch'
    );
    if (reasonInput === null) return;

    setCancellingId(booking.id);
    setActionError('');
    setActionMsg('');

    try {
      const response = await fetch(`http://localhost:5000/api/bookings/${encodeURIComponent(booking.id)}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reasonInput.trim() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Không thể hủy đơn đặt sân.');
      }
      setActionMsg(payload.message || 'Đã hủy lịch đặt sân.');
      onCancelSuccess?.(booking.id, reasonInput.trim());
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
                <div className="col-md-4 d-flex align-items-end">
                  <button type="submit" className="btn btn-brand btn-sm w-100 mt-md-4" disabled={loading}>
                    <i className="bi bi-search me-1"></i>Tra cứu đơn đặt
                  </button>
                </div>
              </form>
            )}

            {actionError && <div className="alert alert-danger py-2 small">{actionError}</div>}
            {actionMsg && <div className="alert alert-success py-2 small">{actionMsg}</div>}

            {loading ? (
              <div className="text-center py-5 text-muted">
                <div className="spinner-border text-success mb-2" role="status"></div>
                <div className="small">Đang tải lịch đặt sân từ PostgreSQL...</div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-calendar-x fs-1 text-muted"></i>
                <h6 className="mt-3 fw-bold">Chưa có lịch đặt sân nào</h6>
                <p className="text-muted small">
                  {currentUser
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
                    {bookings.map((b) => (
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
                            {b.statusLabel || b.status || 'Đã xác nhận'}
                          </span>
                          {b.cancelReason && (
                            <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                              Lý do: {b.cancelReason}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          {currentUser && b.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={cancellingId === b.id}
                              onClick={() => handleCancelBooking(b)}
                            >
                              {cancellingId === b.id ? 'Đang hủy...' : 'Hủy lịch'}
                            </button>
                          )}
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
