import { API_BASE } from './utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import SearchFilterBar from './components/SearchFilterBar';
import CourtList from './components/CourtList';
import HowItWorksSection from './components/HowItWorksSection';
import PartnerBanner from './components/PartnerBanner';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import MyBookingsPage from './components/MyBookingsPage';
import AuthPage from './components/AuthPage';
import CourtDetailPage from './components/CourtDetailPage';
import OwnerDashboard from './components/OwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProfilePage from './components/ProfilePage';
import { formatLocalYMD, getStoredToken } from './utils/vietqr';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login' | 'register' | 'register-owner' | 'profile' | 'owner-dashboard' | 'admin-dashboard' | 'court-detail' | 'my-bookings'
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();
    if (!token) {
      localStorage.removeItem('sportsbooking_user');
      setAuthReady(true);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success || !data.data) throw new Error('Invalid session');
        if (!cancelled) setCurrentUser(data.data);
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
          localStorage.removeItem('sportsbooking_user');
        }
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [courts, setCourts] = useState([]);
  const [sportTypes, setSportTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courtsError, setCourtsError] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [activeSearchTab, setActiveSearchTab] = useState('search');

  // Search & Filter state
  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [playDate, setPlayDate] = useState(() => formatLocalYMD());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterRefreshNonce, setFilterRefreshNonce] = useState(0);

  // Favorites state
  const [favoriteCourtIds, setFavoriteCourtIds] = useState([]);

  // Modals & Detail state
  const [selectedCourtDetail, setSelectedCourtDetail] = useState(null);
  const [postAuthReturnCourt, setPostAuthReturnCourt] = useState(null);
  const [postAuthReturnView, setPostAuthReturnView] = useState(null);
  const [detailScrollToReviews, setDetailScrollToReviews] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Real bookings state (tải từ PostgreSQL)
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);

  const showNotification = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  }, []);

  const loadFavorites = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setFavoriteCourtIds([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/courts/favorites/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setFavoriteCourtIds(json.data.map((c) => Number(c.id)));
      }
    } catch {
      // Ignore temporary network issue
    }
  }, []);

  const loadMyBookings = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setBookings([]);
      return;
    }
    setBookingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setBookings(json.data);
      }
    } catch {
      // Ignore temporary network issue
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const lookupBookingsByPhone = async (phone) => {
    setBookingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings?phone=${encodeURIComponent(phone)}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && Array.isArray(json.data)) {
        setBookings(json.data);
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/courts/sport-types`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setSportTypes(json.data);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMyBookings();
      loadFavorites();
    } else {
      setBookings([]);
      setFavoriteCourtIds([]);
      setFavoritesOnly(false);
    }
  }, [currentUser, loadMyBookings, loadFavorites]);

  useEffect(() => {
    if (currentView === 'my-bookings' && currentUser) {
      loadMyBookings();
    }
  }, [currentView, currentUser, loadMyBookings]);

  // Fetch courts from backend API
  const fetchCourts = useCallback(async () => {
    setLoading(true);
    setCourtsError('');
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedCategory) params.append('category', selectedCategory);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (playDate) params.append('date', playDate);
      if (sortBy) params.append('sort', sortBy);
      if (onlyAvailable) params.append('onlyAvailable', 'true');
      if (favoritesOnly) params.append('favoritesOnly', 'true');

      const token = getStoredToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/api/courts?${params.toString()}`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.data)) {
        throw new Error(data.message || 'Không thể tải danh sách sân thể thao.');
      }
      setCourts(data.data);
    } catch (err) {
      setCourts([]);
      setCourtsError(err.message || 'Không thể kết nối máy chủ để tải danh sách sân.');
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedCity, selectedCategory, maxPrice, playDate, sortBy, onlyAvailable, favoritesOnly]);

  useEffect(() => {
    if (currentView === 'home') {
      fetchCourts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCategory,
    selectedCity,
    playDate,
    sortBy,
    onlyAvailable,
    favoritesOnly,
    currentView,
    availabilityRefreshKey,
    filterRefreshNonce,
    currentUser?.id
  ]);

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedCity('');
    setSelectedCategory('');
    setMaxPrice('');
    setSortBy('featured');
    setOnlyAvailable(false);
    setFavoritesOnly(false);
    setPlayDate(formatLocalYMD());
    setFilterRefreshNonce((n) => n + 1);
  };

  const handleToggleFavorite = async (courtObj) => {
    const cId = Number(courtObj?.id || courtObj);
    if (!Number.isSafeInteger(cId) || cId <= 0) return;

    const token = getStoredToken();
    if (!currentUser || !token) {
      showNotification('Vui lòng đăng nhập tài khoản để lưu sân yêu thích.');
      openAuthView('login', currentView === 'court-detail' ? selectedCourtDetail : null);
      return;
    }

    const currentlySaved = favoriteCourtIds.includes(cId);
    const method = currentlySaved ? 'DELETE' : 'POST';

    try {
      const res = await fetch(`${API_BASE}/api/courts/${cId}/favorite`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Không thể cập nhật sân yêu thích.');
      }

      const nextSaved = Boolean(json.data?.isFavorite);
      setFavoriteCourtIds((prev) =>
        nextSaved ? Array.from(new Set([...prev, cId])) : prev.filter((id) => id !== cId)
      );
      setCourts((prev) =>
        prev.map((c) =>
          Number(c.id) === cId
            ? {
                ...c,
                isFavorite: nextSaved,
                favoritesCount: Number(json.data?.favoritesCount ?? c.favoritesCount ?? 0)
              }
            : c
        )
      );
      setSelectedCourtDetail((prev) =>
        prev && Number(prev.id) === cId
          ? {
              ...prev,
              isFavorite: nextSaved,
              favoritesCount: Number(json.data?.favoritesCount ?? prev.favoritesCount ?? 0)
            }
          : prev
      );
      showNotification(nextSaved ? 'Đã lưu vào danh sách sân yêu thích.' : 'Đã bỏ khỏi danh sách sân yêu thích.');
    } catch (err) {
      showNotification(err.message);
    }
  };

  const openCourtById = (courtOrId, { focusReviews = false } = {}) => {
    const targetId = Number(courtOrId?.id || courtOrId);
    const found =
      (typeof courtOrId === 'object' && courtOrId !== null ? courtOrId : null) ||
      courts.find((c) => Number(c.id) === targetId) ||
      { id: targetId };

    setSelectedCourtDetail(found);
    setDetailScrollToReviews(focusReviews);
    setCurrentView('court-detail');
    if (!focusReviews) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReviewUpdated = (courtId, avgRating, reviewCount) => {
    setCourts((prev) =>
      prev.map((c) =>
        Number(c.id) === Number(courtId)
          ? {
              ...c,
              rating: avgRating,
              ratingFormatted: reviewCount > 0 ? Number(avgRating).toFixed(1) : 'Mới',
              reviewCount
            }
          : c
      )
    );
    loadMyBookings();
  };

  const openMyBookingsPage = () => {
    setSelectedCourtForBooking(null);
    setDetailScrollToReviews(false);
    setActiveSearchTab('search');
    setActiveTab('bookings');
    setCurrentView('my-bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab) => {
    if (tab === 'my-bookings') {
      openMyBookingsPage();
      return;
    }
    setActiveSearchTab(tab);
  };

  const handleBookingSuccess = (newBooking) => {
    setBookings((prev) => [newBooking, ...prev.filter((b) => b.id !== newBooking.id)]);
    setAvailabilityRefreshKey((k) => k + 1);
    showNotification(
      `Đã gửi yêu cầu đặt sân (${newBooking.id}). Vui lòng chờ chủ sân xác nhận.`
    );
  };

  const handleCancelSuccess = (bookingId, reason) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: 'CANCELLED', statusLabel: 'Đã hủy', cancelReason: reason }
          : b
      )
    );
    setAvailabilityRefreshKey((k) => k + 1);
    showNotification(`Đã hủy đơn đặt sân ${bookingId}.`);
  };

  const openAuthView = (mode, returnCourt = null, returnView = null) => {
    setPostAuthReturnCourt(returnCourt);
    setPostAuthReturnView(returnView);
    setCurrentView(mode);
  };

  const handleAuthSuccess = (userData, remember = true) => {
    if (!userData?.token) {
      showNotification('Không thể xác thực tài khoản. Vui lòng đăng nhập lại.');
      return;
    }
    localStorage.removeItem('sportsbooking_token');
    sessionStorage.removeItem('sportsbooking_token');
    (remember ? localStorage : sessionStorage).setItem('sportsbooking_token', userData.token);
    const { token, ...user } = userData;
    setCurrentUser(user);
    localStorage.setItem('sportsbooking_user', JSON.stringify(user));
    if (userData.role === 'ADMIN') {
      setPostAuthReturnCourt(null);
      setPostAuthReturnView(null);
      showNotification(`Chào mừng Quản trị viên ${userData.fullName}.`);
      setCurrentView('admin-dashboard');
      return;
    }
    if (userData.role === 'OWNER') {
      setPostAuthReturnCourt(null);
      setPostAuthReturnView(null);
      showNotification(`Chào mừng đối tác chủ sân ${userData.fullName}.`);
      setCurrentView('owner-dashboard');
      return;
    }
    showNotification(`Xin chào ${userData.fullName || 'bạn'}! Đăng nhập thành công.`);
    if (postAuthReturnCourt) {
      setSelectedCourtDetail(postAuthReturnCourt);
      setPostAuthReturnCourt(null);
      setPostAuthReturnView(null);
      setCurrentView('court-detail');
      return;
    }
    if (postAuthReturnView === 'my-bookings') {
      setPostAuthReturnView(null);
      setActiveTab('bookings');
      setCurrentView('my-bookings');
      return;
    }
    setPostAuthReturnView(null);
    setCurrentView('home');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setBookings([]);
    setFavoriteCourtIds([]);
    setFavoritesOnly(false);
    localStorage.removeItem('sportsbooking_user');
    localStorage.removeItem('sportsbooking_token');
    sessionStorage.removeItem('sportsbooking_token');
    showNotification('Đã đăng xuất khỏi tài khoản.');
  };

  const handleProfileUpdated = (user) => {
    setCurrentUser((prev) => ({ ...prev, ...user }));
    localStorage.setItem('sportsbooking_user', JSON.stringify({ ...currentUser, ...user }));
  };

  const navigateToHome = (targetTab = 'home') => {
    setCurrentView('home');
    setDetailScrollToReviews(false);
    setActiveTab(targetTab === 'search' ? 'search' : 'home');
    if (targetTab === 'search') {
      setTimeout(() => {
        document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!authReady) return <div className="container py-5 small text-muted">Đang tải...</div>;

  const toastBanner = toastMessage ? (
    <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1100, maxWidth: '400px' }}>
      <div className="bg-white border shadow-sm rounded-3 py-2 px-3 d-flex align-items-center gap-2 small text-dark">
        <i className="bi bi-check-circle-fill text-success flex-shrink-0"></i>
        <div className="flex-grow-1">{toastMessage}</div>
        <button
          type="button"
          className="btn-close ms-2"
          style={{ fontSize: '0.68rem' }}
          aria-label="Đóng"
          onClick={() => setToastMessage('')}
        ></button>
      </div>
    </div>
  ) : null;

  // Personal profile page
  if (currentView === 'profile' && !currentUser) {
    return <AuthPage initialMode="login" onBackToHome={() => setCurrentView('home')} onAuthSuccess={handleAuthSuccess} />;
  }
  if (currentView === 'profile') {
    return (
      <div className="min-vh-100 d-flex flex-column bg-white">
        {toastBanner}
        <Navbar
          onOpenAuth={(mode) => openAuthView(mode)}
          onOpenMyBookings={openMyBookingsPage}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
          onOpenAdminDashboard={() => setCurrentView('admin-dashboard')}
          onOpenProfile={() => setCurrentView('profile')}
          onGoHome={navigateToHome}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeView="profile"
          currentUser={currentUser}
          onLogout={() => {
            handleLogout();
            navigateToHome('home');
          }}
        />
        <ProfilePage
          currentUser={currentUser}
          onProfileUpdated={handleProfileUpdated}
          onBackToHome={() => navigateToHome('home')}
          onOpenMyBookings={openMyBookingsPage}
          onOpenCourt={(fav) => openCourtById(fav)}
          onToggleFavorite={handleToggleFavorite}
          onLogout={() => {
            handleLogout();
            navigateToHome('home');
          }}
        />
        <Footer
          onOpenAuth={(mode) => openAuthView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />
      </div>
    );
  }

  // Dedicated My Bookings Page
  if (currentView === 'my-bookings') {
    return (
      <div className="min-vh-100 d-flex flex-column bg-white">
        {toastBanner}
        <Navbar
          onOpenAuth={(mode) => openAuthView(mode, null, 'my-bookings')}
          onOpenMyBookings={openMyBookingsPage}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
          onOpenAdminDashboard={() => setCurrentView('admin-dashboard')}
          onOpenProfile={() => setCurrentView('profile')}
          onGoHome={navigateToHome}
          activeTab="bookings"
          setActiveTab={setActiveTab}
          activeView="my-bookings"
          currentUser={currentUser}
          onLogout={() => {
            handleLogout();
            navigateToHome('home');
          }}
        />
        <MyBookingsPage
          bookings={bookings}
          loading={bookingsLoading}
          currentUser={currentUser}
          onRequireAuth={(mode) => openAuthView(mode, null, 'my-bookings')}
          onBackToHome={() => navigateToHome('home')}
          onOpenSearchCourts={() => navigateToHome('search')}
          onOpenProfile={() => setCurrentView('profile')}
          onRefreshBookings={loadMyBookings}
          onLookupByPhone={lookupBookingsByPhone}
          onCancelSuccess={handleCancelSuccess}
          onRebookCourt={(cId) => openCourtById(cId)}
          onReviewCourt={(cId) => openCourtById(cId, { focusReviews: true })}
        />
        <Footer
          onOpenAuth={(mode) => openAuthView(mode, null, 'my-bookings')}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />
      </div>
    );
  }

  // If in Login or Register Page mode
  if (['login', 'register', 'register-owner'].includes(currentView)) {
    return (
      <AuthPage
        initialMode={currentView === 'login' ? 'login' : 'register'}
        initialRole={currentView === 'register-owner' ? 'OWNER' : 'USER'}
        onBackToHome={() => {
          setPostAuthReturnCourt(null);
          setPostAuthReturnView(null);
          navigateToHome('home');
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // If in Owner Dashboard mode
  if (currentView === 'owner-dashboard') {
    return (
      <OwnerDashboard
        onOpenAuth={(mode) => openAuthView(mode)}
        onOpenProfile={() => setCurrentView('profile')}
        onOpenMyBookings={openMyBookingsPage}
        currentUser={currentUser}
        onBackToHome={() => navigateToHome('home')}
        onLogout={() => {
          handleLogout();
          navigateToHome('home');
        }}
      />
    );
  }

  // If in Admin Dashboard mode
  if (currentView === 'admin-dashboard') {
    return (
      <AdminDashboard
        onOpenAuth={(mode) => openAuthView(mode)}
        onOpenProfile={() => setCurrentView('profile')}
        onOpenMyBookings={openMyBookingsPage}
        onOpenCourt={(cId) => openCourtById(cId)}
        currentUser={currentUser}
        onBackToHome={() => navigateToHome('home')}
        onLogout={() => {
          handleLogout();
          navigateToHome('home');
        }}
      />
    );
  }

  // If in Court Detail Page mode
  if (currentView === 'court-detail') {
    const isDetailFav = favoriteCourtIds.includes(Number(selectedCourtDetail?.id));
    return (
      <div className="min-vh-100 d-flex flex-column bg-white">
        {toastBanner}

        <Navbar
          onOpenAuth={(mode) => openAuthView(mode, selectedCourtDetail)}
          onOpenMyBookings={openMyBookingsPage}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
          onOpenAdminDashboard={() => setCurrentView('admin-dashboard')}
          onOpenProfile={() => setCurrentView('profile')}
          onGoHome={navigateToHome}
          activeTab="search"
          setActiveTab={setActiveTab}
          activeView="court-detail"
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <CourtDetailPage
          court={selectedCourtDetail}
          initialDate={playDate}
          availabilityRefreshKey={availabilityRefreshKey}
          currentUser={currentUser}
          isFavorite={isDetailFav}
          scrollToReviews={detailScrollToReviews}
          onToggleFavorite={handleToggleFavorite}
          onRequireAuth={(mode) => openAuthView(mode, selectedCourtDetail)}
          onReviewUpdated={handleReviewUpdated}
          onNotify={showNotification}
          onBackToHome={() => navigateToHome('home')}
          onProceedBooking={(bookingPlan) => {
            if (!currentUser || !getStoredToken()) {
              showNotification('Vui lòng đăng nhập tài khoản để đặt sân.');
              openAuthView('login', selectedCourtDetail);
              return;
            }
            const resolvedCourtId = bookingPlan.courtId || selectedCourtDetail?.id;
            if (!resolvedCourtId) {
              showNotification('Không xác định được cụm sân để đặt.');
              return;
            }
            setSelectedCourtForBooking({
              id: resolvedCourtId,
              name: bookingPlan.courtName,
              category: bookingPlan.category || selectedCourtDetail?.category || 'THỂ THAO',
              subCourtId: bookingPlan.subCourtId || null,
              subCourtName: bookingPlan.subCourtName || '',
              slotId: bookingPlan.slotId || null,
              date: bookingPlan.date,
              timeSlot: bookingPlan.timeSlot,
              pricePerHour: bookingPlan.price,
              priceFormatted: `${Number(bookingPlan.price).toLocaleString('vi-VN')}đ`,
              ownerBank: bookingPlan.ownerBank || selectedCourtDetail?.ownerBank || null,
              imageUrl: bookingPlan.imageUrl || selectedCourtDetail?.imageUrl || null,
              availableSlots: [bookingPlan.timeSlot]
            });
          }}
        />

        <Footer
          onOpenAuth={(mode) => openAuthView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />

        {selectedCourtForBooking && (
          <BookingModal
            court={selectedCourtForBooking}
            currentUser={currentUser}
            onRequireAuth={(mode) => {
              setSelectedCourtForBooking(null);
              openAuthView(mode, selectedCourtDetail);
            }}
            onClose={() => setSelectedCourtForBooking(null)}
            onBookingSuccess={handleBookingSuccess}
            onSlotConflict={() => setAvailabilityRefreshKey((k) => k + 1)}
            onViewMyBookings={openMyBookingsPage}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      {/* Toast Alert */}
      {toastBanner}

      {/* Header / Navbar */}
      <Navbar
        onOpenAuth={(mode) => openAuthView(mode)}
        onOpenMyBookings={openMyBookingsPage}
        onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        onOpenAdminDashboard={() => setCurrentView('admin-dashboard')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeView="home"
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setCurrentView('profile')}
        onGoHome={navigateToHome}
      />

      <main className="flex-grow-1">
        {/* Hero Section */}
        <HeroSection
          featuredCourt={courts[0] || null}
          totalCourts={courts.length}
          onOpenFeatured={(court) => openCourtById(court)}
        />

        {/* Floating Search & Filter Bar */}
        <SearchFilterBar
          onSearch={fetchCourts}
          onTabChange={handleTabChange}
          activeSearchTab={activeSearchTab}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          keyword={keyword}
          setKeyword={setKeyword}
          playDate={playDate}
          setPlayDate={setPlayDate}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          sportTypes={sportTypes}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onlyAvailable={onlyAvailable}
          setOnlyAvailable={setOnlyAvailable}
          favoritesOnly={favoritesOnly}
          setFavoritesOnly={setFavoritesOnly}
          currentUser={currentUser}
          favoritesCount={favoriteCourtIds.length}
          onResetFilters={handleResetFilters}
        />

        {/* Featured Courts Listing */}
        <CourtList
          courts={courts}
          loading={loading}
          error={courtsError}
          onRetry={fetchCourts}
          currentUser={currentUser}
          favoriteCourtIds={favoriteCourtIds}
          onToggleFavorite={handleToggleFavorite}
          playDate={playDate}
          favoritesOnly={favoritesOnly}
          sportTypes={sportTypes}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          onResetFilters={handleResetFilters}
          onBookNow={(court) => openCourtById(court)}
        />

        {/* Editorial How It Works Band */}
        <HowItWorksSection
          onSearchClick={() => {
            const el = document.getElementById('search-section') || document.getElementById('featured-courts');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder*="Tên sân"]');
                if (searchInput) searchInput.focus();
              }, 400);
            }
          }}
          onSelectSlotsClick={() => {
            const el = document.getElementById('featured-courts');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onCheckInClick={() => {
            if (currentUser) {
              setCurrentView('my-bookings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              openAuthView('login');
            }
          }}
          isLoggedIn={Boolean(currentUser)}
        />

        {/* Partner Section Banner */}
        <PartnerBanner
          onOpenAuth={(mode) => openAuthView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenAuth={(mode) => openAuthView(mode)}
        onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
      />

      {/* Modals */}
      {selectedCourtForBooking && (
        <BookingModal
          court={selectedCourtForBooking}
          currentUser={currentUser}
          onRequireAuth={(mode) => {
            setSelectedCourtForBooking(null);
            openAuthView(mode);
          }}
          onClose={() => setSelectedCourtForBooking(null)}
          onBookingSuccess={handleBookingSuccess}
          onSlotConflict={() => setAvailabilityRefreshKey((k) => k + 1)}
          onViewMyBookings={openMyBookingsPage}
        />
      )}
    </div>
  );
}
