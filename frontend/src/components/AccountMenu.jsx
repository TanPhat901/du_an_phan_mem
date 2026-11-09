import React, { useState, useRef, useEffect } from 'react';

export default function AccountMenu({
  currentUser,
  activeView = 'home',
  facilityName = '',
  onGoHome,
  onOpenOwnerDashboard,
  onOpenProfile,
  onOpenMyBookings,
  onLogout,
  onOptionSelect
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'OWNER';
  const avatarBg = isOwner
    ? '#0b4d3c'
    : currentUser.role === 'ADMIN'
      ? '#dc2626'
      : '#10b981';

  const roleLabel = isOwner
    ? 'Chủ sân'
    : currentUser.role === 'ADMIN'
      ? 'Admin'
      : 'Người chơi';

  const displayFacility = facilityName || currentUser.facilityName || '';

  const triggerAction = (fn) => {
    setOpen(false);
    onOptionSelect?.();
    fn?.();
  };

  return (
    <div className="position-relative" ref={menuRef}>
      {/* Facebook-style circular person icon button (shows name only inside dropdown when clicked) */}
      <button
        type="button"
        className={`account-icon-btn btn p-0 rounded-circle d-inline-flex align-items-center justify-content-center position-relative ${open ? 'open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu tài khoản"
        title="Tài khoản"
      >
        <i className="bi bi-person-fill fs-5 text-dark"></i>
        <span className="account-icon-badge" aria-hidden="true">
          <i className={`bi bi-chevron-${open ? 'up' : 'down'}`}></i>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="account-dropdown-menu dropdown-menu dropdown-menu-end show shadow-lg border rounded-4 p-2 mt-2"
        >
          {/* User Identity Card (revealed when clicked, Facebook style) */}
          <div className="p-2 mb-2 rounded-3 bg-light border d-flex align-items-center gap-2">
            <span
              className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0 shadow-xs"
              style={{ width: '40px', height: '40px', fontSize: '1rem', backgroundColor: avatarBg }}
            >
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </span>
            <div className="min-w-0 flex-grow-1">
              <div className="d-flex align-items-center justify-content-between gap-1">
                <span className="fw-bold small text-dark text-truncate" style={{ maxWidth: '135px' }}>
                  {currentUser.fullName || 'Tài khoản'}
                </span>
                <span
                  className={`badge rounded-pill flex-shrink-0 ${
                    isOwner
                      ? 'bg-success text-white'
                      : currentUser.role === 'ADMIN'
                        ? 'bg-danger text-white'
                        : 'bg-success-subtle text-success border border-success-subtle'
                  }`}
                  style={{ fontSize: '0.62rem' }}
                >
                  {roleLabel}
                </span>
              </div>
              {currentUser.email && (
                <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                  {currentUser.email}
                </div>
              )}
              {displayFacility && (
                <div className="text-brand fw-medium text-truncate" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-buildings me-1"></i>
                  {displayFacility}
                </div>
              )}
            </div>
          </div>

          {/* Owner View Switcher Options: Trang chủ <-> Quản lý sân */}
          {isOwner && (
            <>
              {onGoHome && (
                <button
                  type="button"
                  role="menuitem"
                  className={`dropdown-item rounded-3 py-2 px-3 d-flex align-items-center justify-content-between gap-2 small fw-medium ${
                    activeView === 'home' ? 'active-option' : ''
                  }`}
                  onClick={() => triggerAction(() => onGoHome('home'))}
                >
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-house-door-fill text-brand fs-6"></i>
                    <span>Xem Trang chủ</span>
                  </span>
                  {activeView === 'home' && (
                    <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.62rem' }}>
                      Đang xem
                    </span>
                  )}
                </button>
              )}

              {onOpenOwnerDashboard && (
                <button
                  type="button"
                  role="menuitem"
                  className={`dropdown-item rounded-3 py-2 px-3 d-flex align-items-center justify-content-between gap-2 small fw-medium ${
                    activeView === 'owner-dashboard' ? 'active-option' : ''
                  }`}
                  onClick={() => triggerAction(onOpenOwnerDashboard)}
                >
                  <span className="d-flex align-items-center gap-2">
                    <i className="bi bi-buildings-fill text-success fs-6"></i>
                    <span>Quản lý sân</span>
                  </span>
                  {activeView === 'owner-dashboard' && (
                    <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.62rem' }}>
                      Đang xem
                    </span>
                  )}
                </button>
              )}

              <div className="dropdown-divider my-1"></div>
            </>
          )}

          {onOpenProfile && (
            <button
              type="button"
              role="menuitem"
              className={`dropdown-item rounded-3 py-2 px-3 d-flex align-items-center justify-content-between gap-2 small fw-medium ${
                activeView === 'profile' ? 'active-option' : ''
              }`}
              onClick={() => triggerAction(onOpenProfile)}
            >
              <span className="d-flex align-items-center gap-2">
                <i className="bi bi-person-circle text-brand fs-6"></i>
                <span>Hồ sơ cá nhân</span>
              </span>
              {activeView === 'profile' && (
                <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.62rem' }}>
                  Đang xem
                </span>
              )}
            </button>
          )}

          {onOpenMyBookings && (
            <button
              type="button"
              role="menuitem"
              className={`dropdown-item rounded-3 py-2 px-3 d-flex align-items-center justify-content-between gap-2 small fw-medium ${
                activeView === 'my-bookings' ? 'active-option' : ''
              }`}
              onClick={() => triggerAction(onOpenMyBookings)}
            >
              <span className="d-flex align-items-center gap-2">
                <i className="bi bi-calendar2-check text-primary fs-6"></i>
                <span>Lịch đặt của tôi</span>
              </span>
              {activeView === 'my-bookings' && (
                <span className="badge bg-success-subtle text-success" style={{ fontSize: '0.62rem' }}>
                  Đang xem
                </span>
              )}
            </button>
          )}

          {onLogout && (
            <>
              <div className="dropdown-divider my-1"></div>
              <button
                type="button"
                role="menuitem"
                className="dropdown-item rounded-3 py-2 px-3 d-flex align-items-center gap-2 small fw-semibold text-danger"
                onClick={() => triggerAction(onLogout)}
              >
                <i className="bi bi-box-arrow-right fs-6"></i>
                <span>Đăng xuất</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

