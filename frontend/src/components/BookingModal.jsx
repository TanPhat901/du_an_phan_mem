import React, { useState, useEffect } from 'react';

export default function BookingModal({ court, currentUser, onClose, onBookingSuccess, onSlotConflict }) {
  const [customerName, setCustomerName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [date, setDate] = useState(court?.date || new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(
    court?.timeSlot || (court?.availableSlots ? court.availableSlots[0] : '18:00 - 19:00')
  );
  const [paymentMethod, setPaymentMethod] = useState('Tại quầy');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setCustomerName(prev => prev || currentUser.fullName || '');
      setPhone(prev => prev || currentUser.phone || '');
    }
  }, [currentUser]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      setErrorMsg('Vui lòng nhập họ tên và số điện thoại liên hệ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('sportsbooking_token') || sessionStorage.getItem('sportsbooking_token') || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/bookings', {
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
        if (response.status === 409) {
          onSlotConflict?.();
        }
        setErrorMsg(payload.message || `Không thể đặt sân (HTTP ${response.status}).`);
        return;
      }

      onBookingSuccess(payload.data);
      onClose();
    } catch {
      setErrorMsg('Không thể kết nối máy chủ đặt sân. Vui lòng kiểm tra server và thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
          {/* Header with image */}
          <div className="position-relative" style={{ height: '140px', backgroundColor: '#0b4d3c' }}>
            <img
              src={court.imageUrl}
              alt={court.name}
              className="w-100 h-100"
              style={{ objectFit: 'cover', opacity: 0.35 }}
            />
            <div className="position-absolute bottom-0 start-0 p-3 text-white">
              <span className="badge bg-success mb-1">{court.category}</span>
              <h5 className="modal-title fw-bold text-white mb-0 text-truncate" style={{ maxWidth: '380px' }}>
                {court.name}
              </h5>
              {court.subCourtName && (
                <div className="small text-white-50">{court.subCourtName}</div>
              )}
            </div>
            <button
              type="button"
              className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Form */}
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
                  >
                    {(court.availableSlots || ['17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00']).map((slot, index) => (
                      <option key={index} value={slot}>{slot}</option>
                    ))}
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
            <div className="p-3 bg-light rounded-3 mb-4 d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block">Tổng thanh toán (1 slot):</span>
                <span className="small text-success fw-semibold">
                  {court.subCourtName ? `Sân: ${court.subCourtName}` : 'Giữ chỗ tức thì trên hệ thống'}
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
              <button type="button" className="btn btn-outline-secondary w-50" onClick={onClose}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-brand w-50" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Xác nhận đặt sân'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
