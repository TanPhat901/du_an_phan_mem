import React, { useState, useEffect } from 'react';
import AccountMenu from './AccountMenu';

export default function Navbar({
  onOpenAuth,
  onOpenMyBookings,
  onOpenOwnerDashboard,
  activeTab,
  setActiveTab,
  activeView = 'home',
  currentUser,
  onLogout,
  onOpenProfile,
  onGoHome
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleNavHome = (e) => {
    e.preventDefault();
    setActiveTab('home');
    setMobileNavOpen(false);
    onGoHome?.('home');
  };

  const handleNavSearch = (e) => {
    e.preventDefault();
    setActiveTab('search');
    setMobileNavOpen(false);
    const searchEl = document.getElementById('search-section');
    if (searchEl) {
      searchEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      onGoHome?.('search');
    }
  };

  const handleNavBookings = (e) => {
    e.preventDefault();
    setMobileNavOpen(false);
    onOpenMyBookings?.();
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top py-3" style={{ zIndex: 1030 }}>
      <div className="container">
        {/* Brand Logo */}
        <a
          className="navbar-brand d-flex align-items-center gap-2"
          href="#home"
          onClick={handleNavHome}
        >
          <div
            className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle"
            style={{ width: '38px', height: '38px' }}
          >
            <i className="bi bi-trophy-fill text-brand fs-5"></i>
          </div>
          <span className="fw-bold fs-4 text-brand-dark tracking-tight">SportsBooking</span>
        </a>

        {/* Right Controls (Facebook-style Account Icon + Mobile Menu Toggle) */}
        <div className="d-flex align-items-center gap-2 order-lg-3">
          {currentUser ? (
            <AccountMenu
              currentUser={currentUser}
              activeView={activeView}
              onGoHome={onGoHome}
              onOpenOwnerDashboard={onOpenOwnerDashboard}
              onOpenProfile={onOpenProfile}
              onOpenMyBookings={onOpenMyBookings}
              onLogout={onLogout}
              onOptionSelect={() => setMobileNavOpen(false)}
            />
          ) : (
            <div className="d-none d-lg-flex align-items-center gap-3">
              <button
                type="button"
                className="btn btn-link text-decoration-none text-dark fw-semibold d-flex align-items-center gap-2 p-0"
                onClick={() => onOpenAuth('login')}
              >
                <i className="bi bi-person fs-5"></i>
                <span>Đăng nhập</span>
              </button>
              <button
                type="button"
                className="btn btn-brand"
                onClick={() => onOpenAuth('register')}
              >
                Đăng ký
              </button>
            </div>
          )}

          {/* Mobile Toggle */}
          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            aria-controls="navbarContent"
            aria-expanded={mobileNavOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        </div>

        {/* Center Nav Links */}
        <div
          className={`collapse navbar-collapse order-lg-2 ${mobileNavOpen ? 'show' : ''}`}
          id="navbarContent"
        >
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3 align-items-lg-center pt-2 pt-lg-0">
            <li className="nav-item">
              <a
                className={`nav-link nav-link-custom ${activeTab === 'home' ? 'active' : ''}`}
                href="#home"
                onClick={handleNavHome}
              >
                Trang chủ
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link nav-link-custom ${activeTab === 'search' ? 'active' : ''}`}
                href="#search-section"
                onClick={handleNavSearch}
              >
                Tìm sân
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link nav-link-custom"
                href="#my-bookings"
                onClick={handleNavBookings}
              >
                Lịch đặt
              </a>
            </li>
          </ul>

          {/* Auth actions inside mobile collapsed drawer when not logged in */}
          {!currentUser && (
            <div className="d-flex d-lg-none align-items-center gap-2 pt-2 pb-1 border-top mt-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm flex-grow-1"
                onClick={() => {
                  setMobileNavOpen(false);
                  onOpenAuth('login');
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className="btn btn-brand btn-sm flex-grow-1"
                onClick={() => {
                  setMobileNavOpen(false);
                  onOpenAuth('register');
                }}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
