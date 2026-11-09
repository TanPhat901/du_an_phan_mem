import React, { useEffect, useState, useCallback } from 'react';
import { getStoredToken } from '../utils/vietqr';

const getInitialForm = (user) => ({
  fullName: user?.fullName || '',
  phone: user?.phone || user?.phoneNumber || '',
  email: user?.email || ''
});

export default function ProfilePage({
  currentUser,
  onProfileUpdated,
  onBackToHome,
  onOpenMyBookings,
  onOpenCourt,
  onToggleFavorite,
  onLogout
}) {
  const [section, setSection] = useState('profile'); // 'profile' | 'favorites' | 'password'
  const [form, setForm] = useState(() => getInitialForm(currentUser));
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    favoritesCount: 0,
    reviewsCount: 0
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [favLoading, setFavLoading] = useState(false);

  // Change password state
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNotice, setPwNotice] = useState('');
  const [pwError, setPwError] = useState('');

  const loadProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setError('Bạn cần đăng nhập để xem hồ sơ.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('http://localhost:5000/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể tải hồ sơ.');
      setForm(getInitialForm(data.data));
      if (data.data?.stats) {
        setStats(data.data.stats);
      }
      onProfileUpdated?.(data.data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    setFavLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/courts/favorites/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setFavorites(data.data);
        setStats((prev) => ({ ...prev, favoritesCount: data.data.length }));
      }
    } catch {
      // Ignore temporary error
    } finally {
      setFavLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadFavorites();
  }, [loadProfile, loadFavorites]);

  const change = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setNotice('');
  };

  const reset = () => {
    setForm(getInitialForm(currentUser));
    setNotice('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    const token = getStoredToken();
    if (!token) {
      setError('Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('http://localhost:5000/api/profile/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: form.fullName, phone: form.phone, email: form.email })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Không thể lưu hồ sơ.');
      setForm(getInitialForm(data.data));
      onProfileUpdated?.(data.data);
      setNotice(data.message || 'Cập nhật hồ sơ thành công!');
    } catch (err) {
      setError(err.message || 'Không thể kết nối Backend.');
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPwError('');
    setPwNotice('');

    if (pwForm.newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setPwError('Vui lòng đăng nhập lại để đổi mật khẩu.');
      return;
    }

    setPwBusy(true);
    try {
      const res = await fetch('http://localhost:5000/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Không thể đổi mật khẩu.');
      }
      setPwNotice(json.message || 'Đổi mật khẩu thành công!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
    }
  };

  const handleRemoveFavorite = async (court) => {
    if (onToggleFavorite) {
      await onToggleFavorite(court);
    }
    setFavorites((prev) => prev.filter((item) => Number(item.id) !== Number(court.id)));
    setStats((prev) => ({ ...prev, favoritesCount: Math.max(0, prev.favoritesCount - 1) }));
  };

  const roleLabel =
    currentUser?.role === 'OWNER'
      ? 'Chủ sân'
      : currentUser?.role === 'ADMIN'
        ? 'Quản trị viên'
        : 'Khách hàng cá nhân';
  const initials = (currentUser?.fullName || 'U').trim().charAt(0).toUpperCase();

  return (
    <main className="profile-page flex-grow-1">
      <div className="container py-4 py-lg-5">
        <div className="profile-breadcrumb mb-4">
          <button type="button" onClick={onBackToHome}>
            <i className="bi bi-house-door me-1" />
            Trang chủ
          </button>
          <span>/</span>
          <span>Tài khoản</span>
          <span>/</span>
          <strong>
            {section === 'favorites'
              ? 'Sân yêu thích'
              : section === 'password'
                ? 'Đổi mật khẩu'
                : 'Hồ sơ cá nhân'}
          </strong>
        </div>

        <div className="row g-4 align-items-start">
          <aside className="col-12 col-lg-3">
            <div className="profile-sidebar">
              <div className="profile-sidebar-title">QUẢN LÝ TÀI KHOẢN</div>
              <button
                className={`profile-side-link ${section === 'profile' ? 'selected' : ''}`}
                type="button"
                onClick={() => setSection('profile')}
              >
                <i className="bi bi-person-fill" /> Hồ sơ cá nhân
                {section === 'profile' && <span className="ms-auto">•</span>}
              </button>
              <button
                className={`profile-side-link ${section === 'favorites' ? 'selected' : ''}`}
                type="button"
                onClick={() => {
                  setSection('favorites');
                  loadFavorites();
                }}
              >
                <i className="bi bi-heart-fill text-danger" /> Sân yêu thích
                <span className="badge bg-light text-dark border ms-auto">{stats.favoritesCount}</span>
              </button>
              <button className="profile-side-link" type="button" onClick={onOpenMyBookings}>
                <i className="bi bi-calendar3" /> Lịch sử đặt sân
                <span className="badge bg-light text-dark border ms-auto">{stats.totalBookings}</span>
              </button>
              <button
                className={`profile-side-link ${section === 'password' ? 'selected' : ''}`}
                type="button"
                onClick={() => setSection('password')}
              >
                <i className="bi bi-shield-lock-fill" /> Đổi mật khẩu
                {section === 'password' && <span className="ms-auto">•</span>}
              </button>
              <div className="profile-side-divider" />
              <button className="profile-side-link text-danger" type="button" onClick={onLogout}>
                <i className="bi bi-box-arrow-right" /> Đăng xuất
              </button>
              <div className="profile-side-tip mt-3">
                <i className="bi bi-lightning-charge-fill" />
                <div>
                  <strong>Thanh toán nhanh chóng</strong>
                  <p>Thông tin được đồng bộ để tiết kiệm thời gian khi đặt sân và xuất vé QR.</p>
                </div>
              </div>
            </div>
          </aside>

          <section className="col-12 col-lg-9">
            <div className="profile-card">
              {/* Summary Header with Live Stats */}
              <div className="profile-summary">
                <div className="profile-avatar" aria-label="Ảnh đại diện mặc định">
                  {initials}
                </div>
                <div className="profile-summary-text flex-grow-1">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <strong>{currentUser?.fullName || 'Người dùng SportsBooking'}</strong>
                    <span className="profile-role">{roleLabel}</span>
                  </div>
                  <div className="profile-summary-muted">{currentUser?.email || 'Tài khoản SportsBooking'}</div>
                  <div className="d-flex flex-wrap gap-3 mt-2 small">
                    <span className="badge bg-white text-dark border px-2 py-1">
                      <i className="bi bi-calendar2-check text-success me-1"></i>
                      {stats.totalBookings} lượt đặt ({stats.upcomingBookings} sắp tới)
                    </span>
                    <span className="badge bg-white text-dark border px-2 py-1">
                      <i className="bi bi-heart-fill text-danger me-1"></i>
                      {stats.favoritesCount} sân yêu thích
                    </span>
                    <span className="badge bg-white text-dark border px-2 py-1">
                      <i className="bi bi-star-fill text-warning me-1"></i>
                      {stats.reviewsCount} đánh giá đã gửi
                    </span>
                  </div>
                </div>
              </div>

              {section === 'profile' && (
                <>
                  <h1>Thông tin cá nhân</h1>
                  <p className="profile-description">
                    Thông tin này sẽ được dùng để tự động điền khi bạn đặt sân và xuất vé điện tử nhanh chóng.
                  </p>
                  <form onSubmit={submit}>
                    <label className="profile-field">
                      <span>Họ và tên <b>*</b></span>
                      <div className="profile-input-wrap">
                        <i className="bi bi-person" />
                        <input
                          value={form.fullName}
                          onChange={change('fullName')}
                          required
                          placeholder="Nhập họ và tên"
                          maxLength={100}
                        />
                      </div>
                    </label>
                    <label className="profile-field">
                      <span>Số điện thoại</span>
                      <div className="profile-input-wrap">
                        <i className="bi bi-telephone" />
                        <input
                          value={form.phone}
                          onChange={change('phone')}
                          inputMode="tel"
                          type="tel"
                          placeholder="Nhập số điện thoại"
                          maxLength={20}
                        />
                      </div>
                    </label>
                    <label className="profile-field">
                      <span>Email nhận vé & thông báo</span>
                      <div className="profile-input-wrap">
                        <i className="bi bi-envelope" />
                        <input
                          value={form.email}
                          onChange={change('email')}
                          type="email"
                          placeholder="Nhập email"
                          maxLength={254}
                        />
                      </div>
                      <small>
                        <i className="bi bi-info-circle me-1" />
                        Dùng để nhận vé điện tử, mã QR check-in sân và thông báo xác nhận đặt sân.
                      </small>
                    </label>
                    {notice && <div className="alert alert-success mt-3 mb-0" role="status">{notice}</div>}
                    {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
                    <div className="profile-actions">
                      <button type="button" className="profile-cancel" onClick={reset}>Hủy bỏ</button>
                      <button type="submit" className="profile-save" disabled={busy}>
                        <i className="bi bi-floppy me-2" />
                        {busy ? 'Đang xử lý...' : 'Lưu cập nhật'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {section === 'favorites' && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h1 className="mb-0">Sân yêu thích của tôi</h1>
                    <button type="button" className="btn btn-sm btn-outline-success" onClick={loadFavorites} disabled={favLoading}>
                      <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
                    </button>
                  </div>
                  <p className="profile-description">
                    Danh sách các cụm sân bạn đã đánh dấu yêu thích để truy cập và đặt giờ chơi nhanh chóng.
                  </p>

                  {favLoading ? (
                    <div className="text-center py-4 text-muted small">Đang tải danh sách sân yêu thích...</div>
                  ) : favorites.length === 0 ? (
                    <div className="text-center py-5 border rounded-4 bg-light">
                      <i className="bi bi-heart fs-1 text-muted"></i>
                      <h6 className="mt-3 fw-bold">Chưa có sân yêu thích nào</h6>
                      <p className="text-muted small mb-3">
                        Hãy nhấn nút trái tim trên các cụm sân ngoài trang chủ để lưu vào đây.
                      </p>
                      <button type="button" className="btn btn-brand btn-sm" onClick={onBackToHome}>
                        Khám phá sân ngay
                      </button>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {favorites.map((fav) => (
                        <div key={fav.id} className="col-md-6">
                          <div className="border rounded-4 p-3 h-100 d-flex flex-column justify-content-between bg-light">
                            <div>
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <span className="badge bg-success">{fav.category}</span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger rounded-pill py-0 px-2"
                                  onClick={() => handleRemoveFavorite(fav)}
                                  title="Bỏ lưu sân này"
                                >
                                  <i className="bi bi-heart-fill me-1"></i>Bỏ lưu
                                </button>
                              </div>
                              <h6 className="fw-bold text-brand-dark mb-1">{fav.name}</h6>
                              <div className="text-muted small mb-2">
                                <i className="bi bi-geo-alt me-1 text-brand"></i>
                                {fav.address}
                              </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                              <div>
                                <div className="fw-bold text-brand-dark">{fav.priceFormatted}/giờ</div>
                                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  {fav.reviewCount > 0 ? `★ ${fav.ratingFormatted} (${fav.reviewCount})` : 'Chưa có đánh giá'} • {fav.openTime}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-brand btn-sm"
                                onClick={() => onOpenCourt?.(fav)}
                              >
                                Xem & Đặt sân
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {section === 'password' && (
                <>
                  <h1>Đổi mật khẩu</h1>
                  <p className="profile-description">
                    Sử dụng mật khẩu mạnh tối thiểu 6 ký tự để bảo vệ tài khoản SportsBooking của bạn.
                  </p>
                  <form onSubmit={submitPassword}>
                    <label className="profile-field">
                      <span>Mật khẩu hiện tại <b>*</b></span>
                      <div className="profile-input-wrap">
                        <i className="bi bi-lock" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={pwForm.currentPassword}
                          onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                          placeholder="Nhập mật khẩu hiện tại"
                          required
                        />
                      </div>
                    </label>
                    <label className="profile-field">
                      <span>Mật khẩu mới <b>*</b></span>
                      <div className="profile-input-wrap">
                        <i className="bi bi-key" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={pwForm.newPassword}
                          onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                          placeholder="Tối thiểu 6 ký tự"
                          required
                          minLength={6}
                        />
                      </div>
                    </label>
                    <label className="profile-field">
                      <span>Xác nhận mật khẩu mới <b>*</b></span>
                      <div className="profile-input-wrap">
                        <i className="bi bi-check2-circle" />
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={pwForm.confirmPassword}
                          onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                          placeholder="Nhập lại mật khẩu mới"
                          required
                          minLength={6}
                        />
                      </div>
                    </label>

                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="toggleShowProfilePw"
                        checked={showPw}
                        onChange={(e) => setShowPw(e.target.checked)}
                      />
                      <label className="form-check-label small text-muted" htmlFor="toggleShowProfilePw">
                        Hiển thị mật khẩu
                      </label>
                    </div>

                    {pwNotice && <div className="alert alert-success mt-2 mb-0">{pwNotice}</div>}
                    {pwError && <div className="alert alert-danger mt-2 mb-0">{pwError}</div>}

                    <div className="profile-actions">
                      <button
                        type="button"
                        className="profile-cancel"
                        onClick={() => {
                          setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setPwError('');
                          setPwNotice('');
                        }}
                      >
                        Làm lại
                      </button>
                      <button type="submit" className="profile-save" disabled={pwBusy}>
                        <i className="bi bi-shield-check me-2" />
                        {pwBusy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
