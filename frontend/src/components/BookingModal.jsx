import { API_BASE } from '../utils/apiConfig';
import React, { useState, useEffect } from 'react';
import TicketBarcode from './TicketBarcode';
import { formatLocalYMD, getStoredToken } from '../utils/vietqr';

export default function BookingModal({
  court,
  currentUser,
  onRequireAuth,
  onClose,
  onBookingSuccess,
  onSlotConflict,
  onViewMyBookings
}) {
  const todayYmd = formatLocalYMD();
  const isLoggedIn = Boolean(currentUser && getStoredToken());
  const slotOptions = Array.isArray(court?.availableSlots) ? court.availableSlots : [];
  const [customerName, setCustomerName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [date, setDate] = useState(court?.date || todayYmd);
  const [selectedSlot, setSelectedSlot] = useState(
    court?.timeSlot || slotOptions[0] || ''
  );
  const [imgError, setImgError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Tại quầy');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.fullName || '');
      setPhone((prev) => prev || currentUser.phone || '');
    }
  }, [currentUser]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    const token = getStoredToken();
    if (!currentUser || !token) {
      setErrorMsg('Vui lòng đăng nhập tài khoản trước khi đặt sân.');
      onRequireAuth?.('login');
      return;
    }

    if (!customerName.trim() || !phone.trim()) {
      setErrorMsg('Vui lòng nhập họ tên và số điện thoại liên hệ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courtId: court.id,
          subCourtId: court.subCourtId || null,
          slotId: court.slotId || null,
          customerName: customerName.trim(),
          phone: phone.trim(),
          date,
          timeSlot: selectedSlot,
          paymentMethod,
          note: note.trim()
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.success === false) {
        if (response.status === 401) {
          setErrorMsg(payload.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          return;
        }
        if (response.status === 409) {
          onSlotConflict?.();
        }
        setErrorMsg(payload.message || `Không thể đặt sân (HTTP ${response.status}).`);
        return;
      }

      onBookingSuccess?.(payload.data);
      setConfirmedBooking(payload.data);
    } catch {
      setErrorMsg('Không thể kết nối máy chủ đặt sân. Vui lòng kiểm tra server và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const isBankSelected =
    paymentMethod === 'Chuyển khoản VietQR' || paymentMethod === 'VNPay QR / Ví điện tử';

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className={`modal-dialog modal-dialog-centered ${confirmedBooking ? 'modal-lg' : ''}`}>
        <div className="modal-content border rounded-4 shadow-lg overflow-hidden">
          {/* Header with image or brand banner */}
          <div className="position-relative" style={{ height: '136px', backgroundColor: '#0b4d3c' }}>
            {court?.imageUrl && !imgError && (
              <img
                src={court.imageUrl}
                alt={court.name}
                className="w-100 h-100"
                style={{ objectFit: 'cover', opacity: 0.35 }}
                onError={() => setImgError(true)}
              />
            )}
            <div className="position-absolute bottom-0 start-0 p-3 text-white">
              <span
                className={`badge rounded-pill mb-1 ${
                  confirmedBooking
                    ? confirmedBooking.status === 'PENDING'
                      ? 'bg-warning text-dark'
                      : 'bg-success'
                    : 'bg-white text-brand-dark'
                }`}
                style={{ fontSize: '0.68rem', letterSpacing: '0.03em' }}
              >
                {confirmedBooking
                  ? confirmedBooking.status === 'PENDING'
                    ? 'ĐÃ GỬI YÊU CẦU • CHỜ XÁC NHẬN'
                    : 'ĐẶT SÂN THÀNH CÔNG'
                  : court.category}
              </span>
              <h5 className="modal-title fw-bold text-white mb-0 text-truncate" style={{ maxWidth: '420px' }}>
                {court.name}
              </h5>
              {court.subCourtName && (
                <div className="small" style={{ color: '#86efac' }}>{court.subCourtName}</div>
              )}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {!isLoggedIn ? (
            <div className="p-4 text-center">
              <div className="mb-3 text-warning">
                <i className="bi bi-person-lock fs-1"></i>
              </div>
              <h6 className="fw-bold text-brand-dark">Yêu cầu đăng nhập để đặt sân</h6>
              <p className="text-muted small mb-4">
                Vui lòng đăng nhập tài khoản SportsBooking trước khi gửi yêu cầu đặt sân.
              </p>
              <div className="d-flex gap-2 justify-content-center">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-brand px-4"
                  onClick={() => onRequireAuth?.('login')}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>Đăng nhập ngay
                </button>
              </div>
            </div>
          ) : confirmedBooking ? (
            <div className="p-4">
              {confirmedBooking.status === 'PENDING' ? (
                <div className="alert alert-warning border-0 d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-hourglass-split fs-4 text-warning-emphasis"></i>
                  <div>
                    <div className="fw-bold">Đã gửi yêu cầu đặt sân! Đang chờ chủ sân xác nhận.</div>
                    <div className="small">
                      Mã đặt chỗ <strong>{confirmedBooking.id}</strong> đã được giữ chỗ tạm thời. Chủ sân sẽ duyệt đơn và xác nhận lịch cho bạn sớm nhất.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success border-0 d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-check-circle-fill fs-4"></i>
                  <div>
                    <div className="fw-bold">Lịch chơi của bạn đã được giữ chỗ thành công!</div>
                    <div className="small">
                      Mã đặt chỗ <strong>{confirmedBooking.id}</strong> đã được lưu vào hệ thống.
                    </div>
                  </div>
                </div>
              )}

              <TicketBarcode booking={confirmedBooking} />

              <div className="d-flex flex-wrap justify-content-end gap-2 mt-4">
                {onViewMyBookings && (
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={() => {
                      onClose();
                      onViewMyBookings();
                    }}
                  >
                    <i className="bi bi-calendar2-check me-1"></i>Xem Lịch đặt của tôi
                  </button>
                )}
                <button type="button" className="btn btn-brand px-4" onClick={onClose}>
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="p-4">
              {errorMsg && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  {errorMsg}
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Họ và tên người đặt *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Số điện thoại nhận mã đặt sân *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="Ví dụ: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Ngày chơi</label>
                  <input
                    type="date"
                    className="form-control"
                    min={todayYmd}
                    value={date}
                    readOnly={Boolean(court.slotId)}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Khung giờ</label>
                  {court.slotId ? (
                    <input type="text" className="form-control bg-light fw-semibold" value={selectedSlot} readOnly />
                  ) : (
                    <select
                      className="form-select"
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      required
                    >
                      {slotOptions.length === 0 ? (
                        <option value="">Chưa có khung giờ trống</option>
                      ) : (
                        slotOptions.map((slot, index) => (
                          <option key={index} value={slot}>{slot}</option>
                        ))
                      )}
                    </select>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Phương thức thanh toán</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Tại quầy">Thanh toán tiền mặt tại quầy sân</option>
                  <option value="Chuyển khoản VietQR">Chuyển khoản nhanh VietQR</option>
                  <option value="VNPay QR / Ví điện tử">Thanh toán trực tuyến VNPay QR</option>
                </select>

                {isBankSelected && court.ownerBank?.bankAccountNo && (
                  <div className="alert alert-info py-2 px-3 small mt-2 mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-qr-code-scan fs-5 text-primary"></i>
                    <div>
                      Mã <strong>VietQR</strong> của <strong>{court.ownerBank.bankName}</strong> ({court.ownerBank.bankAccountNo}) sẽ hiển thị ngay sau khi bạn nhấn xác nhận đặt sân.
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Ghi chú cho chủ sân (tùy chọn)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Cần thuê thêm 2 vợt, mang nước..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Price Breakdown */}
              <div className="price-highlight-box mb-4 d-flex justify-content-between align-items-center">
                <div>
                  <span className="small text-muted d-block">Tổng thanh toán (1 slot):</span>
                  <span className="small text-brand-dark fw-semibold">
                    {court.subCourtName ? `Sân: ${court.subCourtName}` : 'Chủ sân sẽ xác nhận yêu cầu đặt chỗ'}
                  </span>
                </div>
                <div className="text-end">
                  <span className="fw-bold fs-5 text-brand-dark">
                    {court.priceFormatted || `${Number(court.pricePerHour || 0).toLocaleString('vi-VN')}đ`}
                  </span>
                </div>
              </div>

              {/* Submit */}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary rounded-3 w-50" onClick={onClose}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-brand rounded-3 fw-semibold w-50" disabled={submitting || !selectedSlot}>
                  {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  {!submitting && <i className="bi bi-arrow-right ms-1"></i>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
