import React from 'react';

export default function MyBookingsModal({ bookings, onClose }) {
  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-bottom">
            <h5 className="modal-title fw-bold text-brand-dark d-flex align-items-center gap-2">
              <i className="bi bi-calendar-check text-brand"></i>
              <span>Lịch đặt sân của tôi</span>
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            {bookings.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-calendar-x fs-1 text-muted"></i>
                <h6 className="mt-3 fw-bold">Chưa có lịch đặt sân nào</h6>
                <p className="text-muted small">Hãy chọn một sân yêu thích và đặt lịch ngay hôm nay!</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Mã</th>
                      <th scope="col">Tên Sân</th>
                      <th scope="col">Người Đặt</th>
                      <th scope="col">Ngày & Giờ</th>
                      <th scope="col">Giá Tiền</th>
                      <th scope="col">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="fw-bold small text-secondary">{b.id}</td>
                        <td className="fw-semibold text-brand-dark">{b.courtName}</td>
                        <td className="small">
                          <div>{b.customerName}</div>
                          <div className="text-muted">{b.phone}</div>
                        </td>
                        <td className="small">
                          <div className="fw-semibold">{b.date}</div>
                          <div className="text-muted">{b.timeSlot}</div>
                        </td>
                        <td className="fw-bold text-success">
                          {Number(b.totalPrice).toLocaleString('vi-VN')}đ
                        </td>
                        <td>
                          <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            {b.status || 'Đã xác nhận'}
                          </span>
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

