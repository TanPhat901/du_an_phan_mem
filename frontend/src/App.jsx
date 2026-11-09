import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import SearchFilterBar from './components/SearchFilterBar';
import CourtList from './components/CourtList';
import PartnerBanner from './components/PartnerBanner';
import Footer from './components/Footer';
import BookingModal from './components/BookingModal';
import PartnerModal from './components/PartnerModal';
import MyBookingsModal from './components/MyBookingsModal';
import AuthPage from './components/AuthPage';
import CourtDetailPage from './components/CourtDetailPage';
import OwnerDashboard from './components/OwnerDashboard';
import ProfilePage from './components/ProfilePage';
import { formatLocalYMD, getStoredToken } from './utils/vietqr';

// Initial fallback courts identical to backend JSON & screenshot
const INITIAL_COURTS = [
  {
    id: 1,
    name: 'The Yard Padel Club Thảo Điền',
    category: 'PADEL & PICKLEBALL',
    sportType: 'pickleball',
    rating: 0,
    ratingFormatted: 'Mới',
    reviewCount: 0,
    address: 'Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức',
    city: 'TP. Hồ Chí Minh',
    pricePerHour: 280000,
    priceFormatted: '280.000đ',
    imageUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
    amenities: ['Bãi đỗ ô tô', 'Phòng tắm nóng lạnh', 'Café / Quầy nước'],
    featured: true,
    availableSlots: ['06:00 - 07:00', '07:00 - 08:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '20:00 - 21:00']
  },
  {
    id: 2,
    name: 'Trung Tâm Celadon Sport Club',
    category: 'BÓNG ĐÁ & TENNIS',
    sportType: 'football',
    rating: 0,
    ratingFormatted: 'Mới',
    reviewCount: 0,
    address: 'Đường N1, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    pricePerHour: 190000,
    priceFormatted: '190.000đ',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
    amenities: ['Đèn Led ban đêm', 'Khán đài có mái', 'Bảo vệ 24/7'],
    featured: true,
    availableSlots: ['07:00 - 08:30', '16:00 - 17:30', '18:00 - 19:30', '19:30 - 21:00', '21:00 - 22:30']
  },
  {
    id: 3,
    name: 'Sky Garden Arena Phú Mỹ Hưng',
    category: 'CẦU LÔNG TRONG NHÀ',
    sportType: 'badminton',
    rating: 0,
    ratingFormatted: 'Mới',
    reviewCount: 0,
    address: 'Phạm Văn Nghị, Tân Phong, Quận 7, TP. HCM',
    city: 'TP. Hồ Chí Minh',
    pricePerHour: 140000,
    priceFormatted: '140.000đ',
    imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    amenities: ['Máy lạnh công suất lớn', 'Thảm Yonex chuẩn thi đấu'],
    featured: true,
    availableSlots: ['06:00 - 07:00', '08:00 - 09:00', '16:00 - 17:00', '17:00 - 18:00', '19:00 - 20:00']
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login' | 'register' | 'register-owner' | 'profile' | 'owner-dashboard' | 'court-detail'
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
    fetch('http://localhost:5000/api/auth/me', {
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

  const [courts, setCourts] = useState(INITIAL_COURTS);
  const [loading, setLoading] = useState(false);
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
  const [detailScrollToReviews, setDetailScrollToReviews] = useState(false);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);
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
      const res = await fetch('http://localhost:5000/api/courts/favorites/my', {
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
      const res = await fetch('http://localhost:5000/api/bookings/my', {
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
      const res = await fetch(`http://localhost:5000/api/bookings?phone=${encodeURIComponent(phone)}`);
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
    if (showMyBookings && currentUser) {
      loadMyBookings();
    }
  }, [showMyBookings, currentUser, loadMyBookings]);

  // Fetch courts from backend API
  const fetchCourts = useCallback(async () => {
    setLoading(true);
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

      const res = await fetch(`http://localhost:5000/api/courts?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCourts(data.data);
          setLoading(false);
          return;
        }
      }
      throw new Error('Fallback to local filter');
    } catch {
      let filtered = [...INITIAL_COURTS];
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter((c) => c.name.toLowerCase().includes(kw) || c.category.toLowerCase().includes(kw));
      }
      if (selectedCity) {
        filtered = filtered.filter((c) => c.city.toLowerCase().includes(selectedCity.toLowerCase()));
      }
      if (selectedCategory) {
        filtered = filtered.filter((c) => c.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      }
      if (maxPrice) {
        filtered = filtered.filter((c) => c.pricePerHour <= parseInt(maxPrice, 10));
      }
      setCourts(filtered);
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
      setCurrentView('login');
      return;
    }

    const currentlySaved = favoriteCourtIds.includes(cId);
    const method = currentlySaved ? 'DELETE' : 'POST';

    try {
      const res = await fetch(`http://localhost:5000/api/courts/${cId}/favorite`, {
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
      showNotification(nextSaved ? 'Đã thêm vào danh sách sân yêu thích ❤️' : 'Đã bỏ khỏi danh sách sân yêu thích.');
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

  const handleTabChange = (tab) => {
    setActiveSearchTab(tab);
    if (tab === 'my-bookings') {
      setShowMyBookings(true);
    }
  };

  const handleBookingSuccess = (newBooking) => {
    setBookings((prev) => [newBooking, ...prev.filter((b) => b.id !== newBooking.id)]);
    setAvailabilityRefreshKey((k) => k + 1);
    showNotification(`🎉 Đặt sân thành công! Mã đặt chỗ của bạn là: ${newBooking.id}`);
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
    if (userData.role === 'OWNER') {
      showNotification(`🎉 Chào mừng Đối tác Chủ sân ${userData.fullName}! Chuyển đến Giao diện Quản lý Chủ Sân.`);
      setCurrentView('owner-dashboard');
      return;
    } else {
      showNotification(`Xin chào ${userData.fullName || 'bạn'}! Đăng nhập thành công.`);
    }
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

  if (!authReady) return <div className="container py-5">Đang xác minh phiên đăng nhập...</div>;

  // Personal profile page
  if (currentView === 'profile' && !currentUser) {
    return <AuthPage initialMode="login" onBackToHome={() => setCurrentView('home')} onAuthSuccess={handleAuthSuccess} />;
  }
  if (currentView === 'profile') {
    return (
      <div className="min-vh-100 d-flex flex-column bg-white">
        {toastMessage && (
          <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
            <div className="alert alert-success shadow-lg border-0 d-flex align-items-center gap-2 mb-0 py-3 px-4 rounded-3 text-dark">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <div>
                <strong>Thông báo:</strong> {toastMessage}
              </div>
              <button type="button" className="btn-close ms-auto" onClick={() => setToastMessage('')}></button>
            </div>
          </div>
        )}
        <Navbar
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenMyBookings={() => setShowMyBookings(true)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
          onOpenProfile={() => setCurrentView('profile')}
          onGoHome={navigateToHome}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeView="profile"
          currentUser={currentUser}
          onLogout={() => {
            handleLogout();
            setCurrentView('home');
          }}
        />
        <ProfilePage
          currentUser={currentUser}
          onProfileUpdated={handleProfileUpdated}
          onBackToHome={() => setCurrentView('home')}
          onOpenMyBookings={() => setShowMyBookings(true)}
          onOpenCourt={(fav) => openCourtById(fav)}
          onToggleFavorite={handleToggleFavorite}
          onLogout={() => {
            handleLogout();
            setCurrentView('home');
          }}
        />
        <Footer
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />
        {showMyBookings && (
          <MyBookingsModal
            bookings={bookings}
            loading={bookingsLoading}
            currentUser={currentUser}
            onRefreshBookings={loadMyBookings}
            onLookupByPhone={lookupBookingsByPhone}
            onCancelSuccess={handleCancelSuccess}
            onRebookCourt={(cId) => openCourtById(cId)}
            onReviewCourt={(cId) => openCourtById(cId, { focusReviews: true })}
            onClose={() => setShowMyBookings(false)}
          />
        )}
      </div>
    );
  }

  // If in Login or Register Page mode
  if (['login', 'register', 'register-owner'].includes(currentView)) {
    return (
      <AuthPage
        initialMode={currentView === 'login' ? 'login' : 'register'}
        initialRole={currentView === 'register-owner' ? 'OWNER' : 'USER'}
        onBackToHome={() => setCurrentView('home')}
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // If in Owner Dashboard mode
  if (currentView === 'owner-dashboard') {
    return (
      <OwnerDashboard
        onOpenAuth={(mode) => setCurrentView(mode)}
        onOpenProfile={() => setCurrentView('profile')}
        currentUser={currentUser}
        onBackToHome={() => navigateToHome('home')}
        onLogout={handleLogout}
      />
    );
  }

  // If in Court Detail Page mode
  if (currentView === 'court-detail') {
    const isDetailFav = favoriteCourtIds.includes(Number(selectedCourtDetail?.id));
    return (
      <div className="min-vh-100 d-flex flex-column bg-white">
        {toastMessage && (
          <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
            <div className="alert alert-success shadow-lg border-0 d-flex align-items-center gap-2 mb-0 py-3 px-4 rounded-3 text-dark">
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <div>
                <strong>Thông báo:</strong> {toastMessage}
              </div>
              <button type="button" className="btn-close ms-auto" onClick={() => setToastMessage('')}></button>
            </div>
          </div>
        )}

        <Navbar
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenMyBookings={() => setShowMyBookings(true)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
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
          onRequireAuth={(mode) => setCurrentView(mode)}
          onReviewUpdated={handleReviewUpdated}
          onNotify={showNotification}
          onBackToHome={() => navigateToHome('home')}
          onProceedBooking={(bookingPlan) => {
            setSelectedCourtForBooking({
              id: bookingPlan.courtId || selectedCourtDetail?.id || 1,
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
              imageUrl:
                bookingPlan.imageUrl ||
                selectedCourtDetail?.imageUrl ||
                'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
              availableSlots: [bookingPlan.timeSlot]
            });
          }}
        />

        <Footer
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />

        {selectedCourtForBooking && (
          <BookingModal
            court={selectedCourtForBooking}
            currentUser={currentUser}
            onClose={() => setSelectedCourtForBooking(null)}
            onBookingSuccess={handleBookingSuccess}
            onSlotConflict={() => setAvailabilityRefreshKey((k) => k + 1)}
            onViewMyBookings={() => setShowMyBookings(true)}
          />
        )}

        {showMyBookings && (
          <MyBookingsModal
            bookings={bookings}
            loading={bookingsLoading}
            currentUser={currentUser}
            onRefreshBookings={loadMyBookings}
            onLookupByPhone={lookupBookingsByPhone}
            onCancelSuccess={handleCancelSuccess}
            onRebookCourt={(cId) => openCourtById(cId)}
            onReviewCourt={(cId) => openCourtById(cId, { focusReviews: true })}
            onClose={() => setShowMyBookings(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
          <div className="alert alert-success shadow-lg border-0 d-flex align-items-center gap-2 mb-0 py-3 px-4 rounded-3 text-dark">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <div>
              <strong>Thông báo:</strong> {toastMessage}
            </div>
            <button type="button" className="btn-close ms-auto" onClick={() => setToastMessage('')}></button>
          </div>
        </div>
      )}

      {/* Header / Navbar */}
      <Navbar
        onOpenAuth={(mode) => setCurrentView(mode)}
        onOpenMyBookings={() => setShowMyBookings(true)}
        onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
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
        <HeroSection />

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
          currentUser={currentUser}
          favoriteCourtIds={favoriteCourtIds}
          onToggleFavorite={handleToggleFavorite}
          playDate={playDate}
          favoritesOnly={favoritesOnly}
          onResetFilters={handleResetFilters}
          onBookNow={(court) => openCourtById(court)}
        />

        {/* Partner Section Banner */}
        <PartnerBanner
          onOpenPartnerModal={() => setShowPartnerModal(true)}
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />
      </main>

      {/* Footer */}
      <Footer
        onOpenAuth={(mode) => setCurrentView(mode)}
        onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
      />

      {/* Modals */}
      {selectedCourtForBooking && (
        <BookingModal
          court={selectedCourtForBooking}
          currentUser={currentUser}
          onClose={() => setSelectedCourtForBooking(null)}
          onBookingSuccess={handleBookingSuccess}
          onSlotConflict={() => setAvailabilityRefreshKey((k) => k + 1)}
          onViewMyBookings={() => setShowMyBookings(true)}
        />
      )}

      {showPartnerModal && (
        <PartnerModal
          onClose={() => setShowPartnerModal(false)}
          onSuccess={(msg) => showNotification(msg)}
        />
      )}

      {showMyBookings && (
        <MyBookingsModal
          bookings={bookings}
          loading={bookingsLoading}
          currentUser={currentUser}
          onRefreshBookings={loadMyBookings}
          onLookupByPhone={lookupBookingsByPhone}
          onCancelSuccess={handleCancelSuccess}
          onRebookCourt={(cId) => openCourtById(cId)}
          onReviewCourt={(cId) => openCourtById(cId, { focusReviews: true })}
          onClose={() => {
            setShowMyBookings(false);
            setActiveSearchTab('search');
          }}
        />
      )}
    </div>
  );
}
