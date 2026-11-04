import React, { useEffect, useState } from 'react';

const getInitialForm = (user) => ({
  fullName: user?.fullName || '',
  phone: user?.phone || user?.phoneNumber || '',
  email: user?.email || '',
});

export default function ProfilePage({ currentUser, onBackToHome, onOpenMyBookings, onLogout }) {
  const [form, setForm] = useState(() => getInitialForm(currentUser));
  const [notice, setNotice] = useState('');
  useEffect(() => { setForm(getInitialForm(currentUser)); setNotice(''); }, [currentUser]);

  const change = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setNotice('');
  };
  const reset = () => { setForm(getInitialForm(currentUser)); setNotice(''); };
  const submit = (event) => {
    event.preventDefault();
    setNotice('Giao diện đã hoàn thành. Chức năng lưu vào PostgreSQL sẽ được tích hợp ở giai đoạn backend.');
  };
  const roleLabel = currentUser?.role === 'OWNER' ? 'Chủ sân' : currentUser?.role === 'ADMIN' ? 'Quản trị viên' : 'Khách hàng cá nhân';
  const initials = (currentUser?.fullName || 'U').trim().charAt(0).toUpperCase();

  return (
    <main className="profile-page flex-grow-1">
      <div className="container py-4 py-lg-5">
        <div className="profile-breadcrumb mb-4">
          <button type="button" onClick={onBackToHome}><i className="bi bi-house-door me-1" />Trang chủ</button>
          <span>/</span><span>Tài khoản</span><span>/</span><strong>Hồ sơ cá nhân</strong>
        </div>
        <div className="row g-4 align-items-start">
          <aside className="col-12 col-lg-3">
            <div className="profile-sidebar">
              <div className="profile-sidebar-title">QUẢN LÝ TÀI KHOẢN</div>
              <button className="profile-side-link selected" type="button" aria-current="page">
                <i className="bi bi-person-fill" /> Hồ sơ cá nhân <span className="ms-auto">•</span>
              </button>
              <button className="profile-side-link" type="button" onClick={onOpenMyBookings}>
                <i className="bi bi-calendar3" /> Lịch sử đặt sân
              </button>
              <div className="profile-side-divider" />
              <button className="profile-side-link" type="button" onClick={onLogout}>
                <i className="bi bi-box-arrow-right" /> Đăng xuất
              </button>
              <div className="profile-side-tip mt-3">
                <i className="bi bi-lightning-charge-fill" />
                <div><strong>Thanh toán nhanh chóng</strong><p>Thông tin được đồng bộ để tiết kiệm thời gian khi đặt sân.</p></div>
              </div>
            </div>
          </aside>
          <section className="col-12 col-lg-9">
            <div className="profile-card">
              <h1>Thông tin cá nhân</h1>
              <p className="profile-description">Thông tin này sẽ được dùng để tự động điền khi bạn đặt sân và xuất hoá đơn điện tử nhanh chóng.</p>
              <div className="profile-summary">
                <div className="profile-avatar" aria-label="Ảnh đại diện mặc định">{initials}</div>
                <div className="profile-summary-text">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <strong>{currentUser?.fullName || 'Người dùng SportsBooking'}</strong>
                    <span className="profile-role">{roleLabel}</span>
                  </div>
                  <div className="profile-summary-muted">Tài khoản SportsBooking</div>
                  <div className="profile-summary-muted">Thông tin lịch sử đặt sân và xác thực sẽ được bổ sung khi có dữ liệu.</div>
                </div>
              </div>
              <form onSubmit={submit}>
                <label className="profile-field">
                  <span>Họ và tên <b>*</b></span>
                  <div className="profile-input-wrap"><i className="bi bi-person" /><input value={form.fullName} onChange={change('fullName')} required placeholder="Nhập họ và tên" maxLength={100} /></div>
                </label>
                <label className="profile-field">
                  <span>Số điện thoại</span>
                  <div className="profile-input-wrap"><i className="bi bi-telephone" /><input value={form.phone} onChange={change('phone')} inputMode="tel" type="tel" placeholder="Nhập số điện thoại" maxLength={20} /></div>
                </label>
                <label className="profile-field">
                  <span>Email nhận vé & thông báo</span>
                  <div className="profile-input-wrap"><i className="bi bi-envelope" /><input value={form.email} onChange={change('email')} type="email" placeholder="Nhập email" maxLength={254} /></div>
                  <small><i className="bi bi-info-circle me-1" />Dùng để nhận vé điện tử, mã QR check-in sân và thông báo xác nhận đặt sân.</small>
                </label>
                {notice && <div className="alert alert-info mt-3 mb-0" role="status">{notice}</div>}
                <div className="profile-actions">
                  <button type="button" className="profile-cancel" onClick={reset}>Hủy bỏ</button>
                  <button type="submit" className="profile-save"><i className="bi bi-floppy me-2" />Lưu cập nhật</button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
