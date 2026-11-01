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
import AuthModal from './components/AuthModal';

// Initial fallback courts identical to backend JSON & screenshot
const INITIAL_COURTS = [
  {
    id: 1,
    name: "The Yard Padel Club Thảo Điền",
    category: "PADEL & PICKLEBALL",
    sportType: "pickleball",
    rating: 4.9,
    reviewCount: 128,
    address: "Nguyễn Văn Hưởng, Phường Thảo Điền, TP. Thủ Đức",
    city: "TP. Hồ Chí Minh",
    pricePerHour: 280000,
    priceFormatted: "280.000đ",
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80",
    amenities: ["Bãi đỗ ô tô", "Phòng tắm nóng lạnh", "Café / Giải khát"],
    featured: true,
    availableSlots: ["06:00 - 07:00", "07:00 - 08:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00"]
  },
  {
    id: 2,
    name: "Trung Tâm Celadon Sport Club",
    category: "BÓNG ĐÁ & TENNIS",
    sportType: "football",
    rating: 4.8,
    reviewCount: 95,
    address: "Đường N1, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh",
    city: "TP. Hồ Chí Minh",
    pricePerHour: 190000,
    priceFormatted: "190.000đ",
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    amenities: ["Sân cỏ nhân tạo", "Khán đài có mái", "Sân mở 24/7"],
    featured: true,
    availableSlots: ["07:00 - 08:30", "16:00 - 17:30", "18:00 - 19:30", "19:30 - 21:00", "21:00 - 22:30"]
  },
  {
    id: 3,
    name: "Sky Garden Arena Phú Mỹ Hưng",
    category: "CẦU LÔNG TRONG NHÀ",
    sportType: "badminton",
    rating: 5.0,
    reviewCount: 210,
    address: "Phạm Văn Nghị, Tân Phong, Quận 7, TP. HCM",
    city: "TP. Hồ Chí Minh",
    pricePerHour: 140000,
    priceFormatted: "140.000đ",
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80",
    amenities: ["Máy lạnh công suất lớn", "Thảm Taraflex chuẩn thi đấu"],
    featured: true,
    availableSlots: ["06:00 - 07:00", "08:00 - 09:00", "16:00 - 17:00", "17:00 - 18:00", "19:00 - 20:00"]
  }
];

export default function App() {
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
  const [selectedCourtForBooking, setSelectedCourtForBooking] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [authMode, setAuthMode] = useState(null); // 'login' | 'register' | null
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
    fetchCourts();
  }, [selectedCategory, selectedCity]);

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
        onOpenAuth={(mode) => setAuthMode(mode)}
        onOpenMyBookings={() => setShowMyBookings(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
          onBookNow={(court) => setSelectedCourtForBooking(court)}
        />

        {/* Partner Section Banner */}
        <PartnerBanner 
          onOpenPartnerModal={() => setShowPartnerModal(true)}
        />
      </main>

      {/* Footer */}
      <Footer onOpenAuth={(mode) => setAuthMode(mode)} />

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

      {authMode && (
        <AuthModal 
          initialMode={authMode}
          onClose={() => setAuthMode(null)}
          onAuthSuccess={(user) => {
            showNotification(`Xin chào ${user.name}! Bạn đã đăng nhập thành công.`);
          }}
        />
      )}
    </div>
  );
}

