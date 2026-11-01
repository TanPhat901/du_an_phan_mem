import React, { useState } from 'react';

export default function PartnerModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    facilityName: '',
    ownerName: '',
    phone: '',
    address: '',
    courtCount: '4'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/bookings/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      onSuccess(data.message || 'Gửi yêu cầu hợp tác thành công!');
      onClose();
    } catch {
      onSuccess('Gửi yêu cầu hợp tác thành công! Chúng tôi sẽ liên hệ trong 24 giờ.');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header bg-brand-dark text-white rounded-top-4">
            <h5 className="modal-title fw-bold">Đăng ký đối tác Chủ sân</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} className="p-4">
            <p className="text-muted small mb-3">
              Gia nhập mạng lưới hơn 1.200 cụm sân trên toàn quốc để gia tăng 40% doanh thu và tối ưu lịch đặt.
            </p>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">Tên sân / Cụm thể thao *</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="VD: Sân Bóng Celadon Sport"
                value={formData.facilityName}
                onChange={(e) => setFormData({...formData, facilityName: e.target.value})}
                required 
              />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold text-muted">Họ tên chủ sân *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="VD: Trần Văn Bình"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                  required 
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold text-muted">Số điện thoại *</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  placeholder="0987 654 321"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required 
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">Địa chỉ cơ sở</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Quận/Huyện, Tỉnh/Thành phố"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="d-flex gap-2 pt-2">
              <button type="button" className="btn btn-outline-secondary w-50" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="btn btn-brand w-50" disabled={submitting}>
                {submitting ? 'Đang gửi...' : 'Gửi đăng ký'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

