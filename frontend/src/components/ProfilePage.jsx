import { API_BASE } from '../utils/apiConfig';
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
  const [failedFavImgs, setFailedFavImgs] = useState({});

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
      const res = await fetch(`${API_BASE}/api/profile/me`, {
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
      const res = await fetch(`${API_BASE}/api/courts/favorites/my`, {
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
      const response = await fetch(`${API_BASE}/api/profile/me`, {
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
      const res = await fetch(`${API_BASE}/api/profile/password`, {
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
    <main className="profile-page flex-grow-1 pb-5">
      {/* Architectural Sage Header Band */}
      <section className="subpage-hero-band mb-4">
        <div className="container">
          <div className="profile-breadcrumb mb-2">
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

          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
            <div>
              <div className="hero-eyebrow mb-2">
                <span className="hero-eyebrow-dot"></span>
                <span>KHÔNG GIAN CÁ NHÂN</span>
              </div>
              <h1 className="h2 fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em' }}>
                {section === 'favorites'
                  ? 'Cụm sân đã lưu'
                  : section === 'password'
                    ? 'Bảo mật tài khoản'
                    : 'Hồ sơ & Tùy chọn'}
              </h1>
              <p className="text-muted small mb-0">
                Quản lý thông tin liên hệ, sân yêu thích và bảo mật đăng nhập trên SportsBooking.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-brand btn-sm rounded-3 d-inline-flex align-items-center gap-1"
              onClick={onOpenMyBookings}
            >
              <i className="bi bi-calendar2-check"></i>
              <span>Lịch đặt của tôi</span>
            </button>
          </div>
        </div>
      </section>

      <div className="container">
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
            </div>
          </aside>

          <section className="col-12 col-lg-9">
            <div className="profile-card">
              {/* Deep Forest Summary Banner with Mint Accents */}
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
                  <div className="d-flex flex-wrap gap-3 mt-2 small profile-summary-stats">
                    <span>
                      <span className="stat-num">{stats.totalBookings}</span> lượt đặt ({stats.upcomingBookings} sắp tới)
                    </span>
                    <span className="opacity-50">•</span>
                    <span>
                      <span className="stat-num">{stats.favoritesCount}</span> sân yêu thích
                    </span>
                    <span className="opacity-50">•</span>
                    <span>
                      <span className="stat-num">{stats.reviewsCount}</span> đánh giá
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
                    <button type="button" className="btn btn-sm btn-outline-success rounded-3" onClick={loadFavorites} disabled={favLoading}>
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
                        Nhấn nút trái tim trên các cụm sân ngoài trang chủ để lưu vào đây.
                      </p>
                      <button type="button" className="btn btn-brand btn-sm rounded-3" onClick={onBackToHome}>
                        Khám phá sân ngay
                      </button>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {favorites.map((fav) => {
                        const hasImg = Boolean(fav.imageUrl) && !failedFavImgs[fav.id];
                        return (
                          <div key={fav.id} className="col-md-6">
                            <div className="court-card h-100 d-flex flex-column">
                              <div
                                className="court-card-img-wrapper cursor-pointer"
                                style={{ height: '150px' }}
                                onClick={() => onOpenCourt?.(fav)}
                              >
                                {hasImg ? (
                                  <img
                                    src={fav.imageUrl}
                                    alt={fav.name}
                                    className="court-card-img"
                                    onError={() =>
                                      setFailedFavImgs((prev) => ({ ...prev, [fav.id]: true }))
                                    }
                                  />
                                ) : (
                                  <div className="court-placeholder-box">
                                    <i className="bi bi-image fs-3 opacity-75 mb-1"></i>
                                    <span className="small fw-medium">{fav.category}</span>
                                  </div>
                                )}

                                <span className="court-category-pill position-absolute top-0 start-0 m-2">
                                  {fav.category}
                                </span>

                                <button
                                  type="button"
                                  className="btn btn-light btn-sm rounded-circle position-absolute top-0 end-0 m-2 p-0 d-flex align-items-center justify-content-center court-fav-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFavorite(fav);
                                  }}
                                  title="Bỏ lưu sân này"
                                >
                                  <i className="bi bi-heart-fill text-danger"></i>
                                </button>
                              </div>

                              <div className="p-3 d-flex flex-column flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                  <h6
                                    className="fw-bold text-dark mb-0 cursor-pointer"
                                    onClick={() => onOpenCourt?.(fav)}
                                  >
                                    {fav.name}
                                  </h6>
                                  <div className="d-flex align-items-center gap-1 small fw-semibold flex-shrink-0">
                                    <i className="bi bi-star-fill text-warning"></i>
                                    <span>{fav.reviewCount > 0 ? fav.ratingFormatted : 'Mới'}</span>
                                  </div>
                                </div>

                                <div className="text-muted small mb-3 text-truncate">
                                  <i className="bi bi-geo-alt me-1 text-brand"></i>
                                  {fav.address}
                                </div>

                                <div className="mt-auto pt-2 border-top d-flex justify-content-between align-items-center">
                                  <div>
                                    <span className="fw-bold text-dark">{fav.priceFormatted}</span>
                                    <span className="text-muted small"> / giờ</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none fw-semibold small text-brand-dark d-inline-flex align-items-center gap-1"
                                    onClick={() => onOpenCourt?.(fav)}
                                  >
                                    <span>Xem sân</span>
                                    <i className="bi bi-arrow-right"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
