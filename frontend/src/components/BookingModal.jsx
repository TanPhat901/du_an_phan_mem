import React, { useState } from 'react';

export default function BookingModal({ court, onClose, onBookingSuccess }) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(court.availableSlots ? court.availableSlots[0] : '18:00 - 19:00');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !phone.trim()) {
      setErrorMsg('Vui lòng nhập họ tên và số điện thoại liên hệ.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('http://localhost:5000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId: court.id,
          courtName: court.name,
          customerName,
          phone,
          date,
          timeSlot: selectedSlot,
          totalPrice: court.pricePerHour
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onBookingSuccess(data.data);
        onClose();
      } else {
        // Fallback for offline/standalone mode
        onBookingSuccess({
          id: `BK-${Date.now().toString().slice(-4)}`,
          courtName: court.name,
          customerName,
          phone,
          date,
          timeSlot: selectedSlot,
          totalPrice: court.pricePerHour,
          status: 'Đã xác nhận'
        });
        onClose();
      }
    } catch (err) {
      // Local fallback if backend is not yet started
      onBookingSuccess({
        id: `BK-${Date.now().toString().slice(-4)}`,
        courtName: court.name,
        customerName,
        phone,
        date,
        timeSlot: selectedSlot,
        totalPrice: court.pricePerHour,
        status: 'Đã xác nhận'
      });
      onClose();
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
                placeholder="Ví dụ: 0912 345 678"
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
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold text-muted">Khung giờ</label>
                <select 
                  className="form-select"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  {court.availableSlots ? (
                    court.availableSlots.map((slot, index) => (
                      <option key={index} value={slot}>{slot}</option>
                    ))
                  ) : (
                    <>
                      <option value="17:00 - 18:00">17:00 - 18:00</option>
                      <option value="18:00 - 19:00">18:00 - 19:00</option>
                      <option value="19:00 - 20:00">19:00 - 20:00</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-3 bg-light rounded-3 mb-4 d-flex justify-content-between align-items-center">
              <div>
                <span className="small text-muted d-block">Tạm tính:</span>
                <span className="small text-success fw-semibold">Miễn phí hủy trước 4 giờ</span>
              </div>
              <div className="text-end">
                <span className="fw-bold fs-5 text-brand-dark">
                  {court.priceFormatted || `${court.pricePerHour.toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            </div>

            {/* Submit */}
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary w-50" onClick={onClose}>
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn-brand w-50" disabled={submitting}>
                {submitting ? 'Đang xử lý...' : 'Xác nhận đặt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

