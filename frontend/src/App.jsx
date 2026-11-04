import React, { useState, useEffect } from 'react';
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

// Initial fallback courts identical to backend JSON & screenshot
const INITIAL_COURTS = [
  {
    id: 1,
    name: "The Yard Padel Club Thảo Điền",
    category: "PADEL & PICKLEBALL",
    sportType: "pickleball",
    rating: 4.9,
    ratingFormatted: "4.9",
    reviewCount: 128,
    address: "Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức",
    city: "TP. Hồ Chí Minh",
    pricePerHour: 280000,
    priceFormatted: "280.000đ",
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80",
    amenities: ["Bãi đỗ ô tô", "Phòng tắm nóng lạnh", "Café / Quầy nước"],
    featured: true,
    availableSlots: ["06:00 - 07:00", "07:00 - 08:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00"]
  },
  {
    id: 2,
    name: "Trung Tâm Celadon Sport Club",
    category: "BÓNG ĐÁ & TENNIS",
    sportType: "football",
    rating: 4.8,
    ratingFormatted: "4.8",
    reviewCount: 94,
    address: "Đường N1, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh",
    city: "TP. Hồ Chí Minh",
    pricePerHour: 190000,
    priceFormatted: "190.000đ",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    amenities: ["Đèn Led ban đêm", "Khán đài có mái", "Bảo vệ 24/7"],
    featured: true,
    availableSlots: ["07:00 - 08:30", "16:00 - 17:30", "18:00 - 19:30", "19:30 - 21:00", "21:00 - 22:30"]
  },
  {
    id: 3,
    name: "Sky Garden Arena Phú Mỹ Hưng",
    category: "CẦU LÔNG TRONG NHÀ",
    sportType: "badminton",
    rating: 4.95,
    ratingFormatted: "4.95",
    reviewCount: 210,
    address: "Phạm Văn Nghị, Tân Phong, Quận 7, TP. HCM",
    city: "TP. Hồ Chí Minh",
    pricePerHour: 140000,
    priceFormatted: "140.000đ",
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
    amenities: ["Máy lạnh công suất lớn", "Thảm Yonex chuẩn thi đấu"],
    featured: true,
    availableSlots: ["06:00 - 07:00", "08:00 - 09:00", "16:00 - 17:00", "17:00 - 18:00", "19:00 - 20:00"]
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'login' | 'register' | 'profile'
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('sportsbooking_token') || sessionStorage.getItem('sportsbooking_token');
    if (!token) {
      localStorage.removeItem('sportsbooking_user');
      setAuthReady(true);
      return;
    }
    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(async (res) => {
      const data = await res.json();
      if (!res.ok || !data.success || !data.data) throw new Error('Invalid session');
      if (!cancelled) setCurrentUser(data.data);
    }).catch(() => {
      // Không coi thông tin lưu trên trình duyệt là phiên đăng nhập hợp lệ.
      if (!cancelled) {
        setCurrentUser(null);
        localStorage.removeItem('sportsbooking_user');
      }
    }).finally(() => { if (!cancelled) setAuthReady(true); });
    return () => { cancelled = true; };
  }, []);

  const [courts, setCourts] = useState(INITIAL_COURTS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [activeSearchTab, setActiveSearchTab] = useState('search');

  // Search & Filter state
  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('TP. Hồ Chí Minh');
  const [playDate, setPlayDate] = useState('2026-11-07');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Modals state
  const [selectedCourtDetail, setSelectedCourtDetail] = useState(null);
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Bookings state
  const [bookings, setBookings] = useState([
    {
      id: 'BK-101',
      courtName: 'The Yard Padel Club Thảo Điền',
      customerName: 'Nguyễn Văn Minh',
      phone: '0901234567',
      date: '2026-11-05',
      timeSlot: '18:00 - 19:00',
      totalPrice: 280000,
      status: 'Đã xác nhận'
    }
  ]);

  // Fetch courts from backend API
  const fetchCourts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedCategory) params.append('category', selectedCategory);
      if (maxPrice) params.append('maxPrice', maxPrice);

      const res = await fetch(`http://localhost:5000/api/courts?${params.toString()}`);
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
      // Offline/fallback filtering
      let filtered = [...INITIAL_COURTS];
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(c => c.name.toLowerCase().includes(kw) || c.category.toLowerCase().includes(kw));
      }
      if (selectedCity) {
        filtered = filtered.filter(c => c.city.toLowerCase().includes(selectedCity.toLowerCase()));
      }
      if (selectedCategory) {
        filtered = filtered.filter(c => c.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      }
      if (maxPrice) {
        filtered = filtered.filter(c => c.pricePerHour <= parseInt(maxPrice, 10));
      }
      setCourts(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'home') {
      fetchCourts();
    }
  }, [selectedCategory, selectedCity, currentView]);

  const handleTabChange = (tab) => {
    setActiveSearchTab(tab);
    if (tab === 'my-bookings') {
      setShowMyBookings(true);
    }
  };

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4500);
  };

  const handleBookingSuccess = (newBooking) => {
    setBookings(prev => [newBooking, ...prev]);
    showNotification(`🎉 Đặt sân thành công! Mã đặt chỗ của bạn là: ${newBooking.id}`);
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
    localStorage.removeItem('sportsbooking_user');
    localStorage.removeItem('sportsbooking_token');
    sessionStorage.removeItem('sportsbooking_token');
    showNotification('Đã đăng xuất khỏi tài khoản.');
  };

  const handleProfileUpdated = (user) => {
    setCurrentUser(prev => ({ ...prev, ...user }));
    localStorage.setItem('sportsbooking_user', JSON.stringify({ ...currentUser, ...user }));
  };

  if (!authReady) return <div className="container py-5">Đang xác minh phiên đăng nhập...</div>;

  // Personal profile page
  if (currentView === 'profile' && !currentUser) {
    return <AuthPage initialMode="login" onBackToHome={() => setCurrentView('home')} onAuthSuccess={handleAuthSuccess} />;
  }
  if (currentView === 'profile') {
    return (
      <div className="min-vh-100 d-flex flex-column bg-white">
        <Navbar
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenMyBookings={() => setShowMyBookings(true)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
          onOpenProfile={() => setCurrentView('profile')}
          onGoHome={() => setCurrentView('home')}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={() => { handleLogout(); setCurrentView('home'); }}
        />
        <ProfilePage
          currentUser={currentUser}
          onProfileUpdated={handleProfileUpdated}
          onBackToHome={() => setCurrentView('home')}
          onOpenMyBookings={() => setShowMyBookings(true)}
          onLogout={() => { handleLogout(); setCurrentView('home'); }}
        />
        <Footer
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />
        {showMyBookings && (
          <MyBookingsModal
            bookings={bookings}
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
        currentUser={currentUser}
        onBackToHome={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onLogout={handleLogout}
      />
    );
  }

  // If in Court Detail Page mode
  if (currentView === 'court-detail') {
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

        <CourtDetailPage
          court={selectedCourtDetail}
          onBackToHome={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onProceedBooking={(bookingPlan) => {
            setSelectedCourtForBooking({
              id: selectedCourtDetail?.id || 1,
              name: bookingPlan.courtName,
              category: selectedCourtDetail?.category || 'BÓNG ĐÁ & PADEL',
              pricePerHour: bookingPlan.price,
              priceFormatted: `${Number(bookingPlan.price).toLocaleString('vi-VN')}đ`,
              imageUrl: selectedCourtDetail?.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
              availableSlots: [bookingPlan.timeSlot]
            });
          }}
          currentUser={currentUser}
          onOpenAuth={(mode) => setCurrentView(mode)}
          onOpenOwnerDashboard={() => setCurrentView('owner-dashboard')}
        />

        {selectedCourtForBooking && (
          <BookingModal 
            court={selectedCourtForBooking}
            onClose={() => setSelectedCourtForBooking(null)}
            onBookingSuccess={handleBookingSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className="position-fixed top-0 end-0 p-3" 
          style={{ zIndex: 1100 }}
        >
          <div className="alert alert-success shadow-lg border-0 d-flex align-items-center gap-2 mb-0 py-3 px-4 rounded-3 text-dark">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <div>
              <strong>Thông báo:</strong> {toastMessage}
            </div>
            <button 
              type="button" 
              className="btn-close ms-auto" 
              onClick={() => setToastMessage('')}
            ></button>
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
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => setCurrentView('profile')}
        onGoHome={() => setCurrentView('home')}
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
        />

        {/* Featured Courts Listing */}
        <CourtList 
          courts={courts}
          loading={loading}
          onBookNow={(court) => {
            setSelectedCourtDetail(court);
            setCurrentView('court-detail');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
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
          onClose={() => setSelectedCourtForBooking(null)}
          onBookingSuccess={handleBookingSuccess}
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
          onClose={() => {
            setShowMyBookings(false);
            setActiveSearchTab('search');
          }}
        />
      )}
    </div>
  );
}
