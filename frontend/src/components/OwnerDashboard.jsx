import React, { useState, useEffect } from 'react';

// Dữ liệu mẫu danh sách các CỤM SÂN & CHỦ SÂN trong hệ thống đa chủ sân (Multi-Vendor)
const INITIAL_FACILITIES = [
  {
    id: 1,
    name: "The Yard Padel Club Thảo Điền",
    ownerName: "Nguyễn Văn Thảo",
    ownerPhone: "0901234567",
    ownerEmail: "theyard@sportsbooking.vn",
    category: "PADEL & PICKLEBALL",
    sportTypes: ["Padel", "Pickleball"],
    address: "28 Nguyễn Văn Hưởng, P. Thảo Điền, TP. Thủ Đức",
    city: "TP. Hồ Chí Minh",
    openTime: "06:00 - 23:00",
    bankName: "Vietcombank",
    bankAccountNo: "1029384756",
    bankAccountName: "NGUYEN VAN THAO",
    depositRate: 50,
    cancelHoursBefore: 4,
    monthlyRevenue: 54800000,
    totalBookings: 186,
    occupancyRate: 84,
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    name: "Trung Tâm Celadon Sport Club",
    ownerName: "Lê Hoàng Nam",
    ownerPhone: "0938889999",
    ownerEmail: "celadon.sports@sportsbooking.vn",
    category: "BÓNG ĐÁ & TENNIS",
    sportTypes: ["Bóng đá", "Tennis"],
    address: "Đường N1, P. Sơn Kỳ, Q. Tân Phú, TP. Hồ Chí Minh",
    city: "TP. Hồ Chí Minh",
    openTime: "06:00 - 24:00",
    bankName: "Techcombank",
    bankAccountNo: "19034567890123",
    bankAccountName: "LE HOANG NAM",
    depositRate: 40,
    cancelHoursBefore: 6,
    monthlyRevenue: 72400000,
    totalBookings: 240,
    occupancyRate: 88,
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    name: "Sky Garden Arena Phú Mỹ Hưng",
    ownerName: "Trần Minh Đức",
    ownerPhone: "0987654321",
    ownerEmail: "skygarden.arena@sportsbooking.vn",
    category: "CẦU LÔNG TRONG NHÀ",
    sportTypes: ["Cầu lông", "Bóng bàn"],
    address: "Phạm Văn Nghị, P. Tân Phong, Quận 7, TP. HCM",
    city: "TP. Hồ Chí Minh",
    openTime: "05:30 - 22:30",
    bankName: "MB Bank",
    bankAccountNo: "888899998888",
    bankAccountName: "TRAN MINH DUC",
    depositRate: 30,
    cancelHoursBefore: 3,
    monthlyRevenue: 41200000,
    totalBookings: 195,
    occupancyRate: 79,
    rating: 4.95,
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80"
  }
];

// Danh sách các sân con (Sub-Courts) theo từng Cụm sân
const INITIAL_SUB_COURTS = [
  // Cụm The Yard (id: 1)
  {
    id: 101,
    facilityId: 1,
    name: "Sân Padel 1 (Kính Panoramic Pro)",
    sportType: "Padel",
    courtType: "Kính cường lực Panoramic",
    surfaceType: "Cỏ nhân tạo WPT chuẩn thi đấu",
    priceNormal: 280000,
    pricePeak: 350000,
    status: "ACTIVE", // ACTIVE | MAINTENANCE | CLOSED
    amenities: ["Đèn LED 400W", "Mặt kính WPT", "Phòng thay đồ", "Bãi xe ô tô"],
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 102,
    facilityId: 1,
    name: "Sân Padel 2 (Có Mái Che)",
    sportType: "Padel",
    courtType: "Có mái vòm che mưa nắng",
    surfaceType: "Cỏ nhân tạo chuyên nghiệp",
    priceNormal: 280000,
    pricePeak: 360000,
    status: "ACTIVE",
    amenities: ["Mái che 100%", "Quạt thông gió", "Ghế ngồi khán giả"],
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 103,
    facilityId: 1,
    name: "Sân Pickleball A (Ngoài trời)",
    sportType: "Pickleball",
    courtType: "Ngoài trời thoáng mát",
    surfaceType: "Sơn Acrylic 5 lớp chuẩn USAPA",
    priceNormal: 180000,
    pricePeak: 240000,
    status: "ACTIVE",
    amenities: ["Lưới chuẩn quốc tế", "Đèn chiếu ban đêm", "Nước uống miễn phí"],
    imageUrl: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 104,
    facilityId: 1,
    name: "Sân Pickleball B (VIP Trong nhà)",
    sportType: "Pickleball",
    courtType: "Trong nhà máy lạnh",
    surfaceType: "Sàn Cushion chống chấn thương",
    priceNormal: 220000,
    pricePeak: 290000,
    status: "MAINTENANCE",
    amenities: ["Máy lạnh điều hòa", "Khu VIP lounge", "Trọng tài hỗ trợ"],
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80"
  },

  // Cụm Celadon (id: 2)
  {
    id: 201,
    facilityId: 2,
    name: "Sân Bóng Đá 5 Người - Sân A1",
    sportType: "Bóng đá",
    courtType: "Sân cỏ nhân tạo 5 người",
    surfaceType: "Cỏ Desso GrassMaster 50mm",
    priceNormal: 200000,
    pricePeak: 320000,
    status: "ACTIVE",
    amenities: ["Đèn cao áp 800W", "Lưới bao an toàn", "Bình nước đá miễn phí"],
    imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 202,
    facilityId: 2,
    name: "Sân Bóng Đá 7 Người - Sân FIFA Pro",
    sportType: "Bóng đá",
    courtType: "Sân cỏ nhân tạo 7 người",
    surfaceType: "Cỏ FIFA 2-Star chống trơn trượt",
    priceNormal: 380000,
    pricePeak: 550000,
    status: "ACTIVE",
    amenities: ["Khán đài có mái che", "Bảng tỉ số điện tử", "Phòng tắm nóng lạnh"],
    imageUrl: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 203,
    facilityId: 2,
    name: "Sân Tennis Đất Nện Celadon",
    sportType: "Tennis",
    courtType: "Sân ngoài trời cao cấp",
    surfaceType: "Mặt sân đất nện Clay Court",
    priceNormal: 250000,
    pricePeak: 350000,
    status: "ACTIVE",
    amenities: ["Nhặt bóng", "Cho thuê vợt Wilson/Babolat", "Bãi xe ô tô"],
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80"
  },

  // Cụm Sky Garden (id: 3)
  {
    id: 301,
    facilityId: 3,
    name: "Sân Cầu Lông Số 1 - Thảm Yonex",
    sportType: "Cầu lông",
    courtType: "Trong nhà trần cao 12m",
    surfaceType: "Thảm Yonex 5.0mm BWF Approved",
    priceNormal: 140000,
    pricePeak: 180000,
    status: "ACTIVE",
    amenities: ["Đèn chiếu sáng chống lóa", "Máy lạnh công suất lớn", "Căng vợt lấy liền"],
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: 302,
    facilityId: 3,
    name: "Sân Cầu Lông Số 2 - Thảm Yonex",
    sportType: "Cầu lông",
    courtType: "Trong nhà",
    surfaceType: "Thảm Yonex 5.0mm",
    priceNormal: 140000,
    pricePeak: 180000,
    status: "ACTIVE",
    amenities: ["Đèn LED chống lóa", "Phòng thay đồ", "Căng tin giải khát"],
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80"
  }
];

// Danh sách đặt sân mẫu cho các chủ sân
const INITIAL_BOOKINGS = [
  {
    id: "BK-8021",
    facilityId: 1,
    subCourtId: 101,
    subCourtName: "Sân Padel 1 (Kính Panoramic Pro)",
    customerName: "Trần Anh Tuấn",
    customerPhone: "0912345678",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "18:00 - 19:00",
    totalPrice: 350000,
    paymentMethod: "Online (VNPay QR)",
    paymentStatus: "PAID",
    status: "CONFIRMED", // PENDING | CONFIRMED | CHECKED_IN | CANCELLED
    note: "Khách mang bóng riêng, cần thuê 2 vợt Padel"
  },
  {
    id: "BK-8022",
    facilityId: 1,
    subCourtId: 103,
    subCourtName: "Sân Pickleball A (Ngoài trời)",
    customerName: "Lê Thị Thảo",
    customerPhone: "0988776655",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "19:00 - 20:00",
    totalPrice: 240000,
    paymentMethod: "Tiền mặt tại quầy",
    paymentStatus: "PENDING_AT_COUNTER",
    status: "CONFIRMED",
    note: "Đặt qua điện thoại, nhóm 4 người chơi giải trí"
  },
  {
    id: "BK-8023",
    facilityId: 1,
    subCourtId: 101,
    subCourtName: "Sân Padel 1 (Kính Panoramic Pro)",
    customerName: "Hoàng Minh Quân",
    customerPhone: "0909123888",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "20:00 - 21:00",
    totalPrice: 350000,
    paymentMethod: "Chuyển khoản VietQR",
    paymentStatus: "PAID",
    status: "CHECKED_IN",
    note: "Khách quen CLB, đã check-in vào sân"
  },
  {
    id: "BK-8024",
    facilityId: 2,
    subCourtId: 202,
    subCourtName: "Sân Bóng Đá 7 Người - Sân FIFA Pro",
    customerName: "FC Bất Động Sản Đông Nam",
    customerPhone: "0933445566",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "19:30 - 21:00",
    totalPrice: 750000,
    paymentMethod: "Online (MoMo)",
    paymentStatus: "PAID",
    status: "CONFIRMED",
    note: "Giao hữu công ty, chuẩn bị sẵn 2 két nước đá"
  },
  {
    id: "BK-8025",
    facilityId: 3,
    subCourtId: 301,
    subCourtName: "Sân Cầu Lông Số 1 - Thảm Yonex",
    customerName: "Vũ Hải Đăng",
    customerPhone: "0977112233",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "18:00 - 19:00",
    totalPrice: 180000,
    paymentMethod: "Online (Thẻ ATM)",
    paymentStatus: "PAID",
    status: "CHECKED_IN",
    note: "Tập luyện đơn nam chuẩn bị thi đấu"
  }
];

export default function OwnerDashboard({ currentUser, onBackToHome, onLogout }) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'courts' | 'schedule' | 'finance' | 'settings'

  // Cụm sân thật đã xác nhận trong PostgreSQL. Backend hiện chưa có API liệt kê cụm sân.
  const facilities = [{
    id: 2, name: 'The Yard Padel Club Thảo Điền', ownerName: currentUser?.fullName || 'Chủ sân',
    ownerPhone: '', ownerEmail: '', category: 'PADEL & PICKLEBALL',
    sportTypes: ['Padel', 'Pickleball'], address: '', city: '', openTime: '',
    bankName: '', bankAccountNo: '', bankAccountName: '', depositRate: 0,
    cancelHoursBefore: 0, monthlyRevenue: 0, totalBookings: 0,
    occupancyRate: 0, rating: '—', imageUrl: ''
  }];
  const [selectedFacilityId, setSelectedFacilityId] = useState(2);
  const [subCourts, setSubCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [courtSaving, setCourtSaving] = useState(false);
  const [courtsError, setCourtsError] = useState('');
  const getToken = () => {
  return (
    localStorage.getItem('sportsbooking_token') ||
    sessionStorage.getItem('sportsbooking_token') ||
    ''
  );
};
  const ownerRequest = async (path, options = {}) => {
    const token = getToken();
    if (!token) throw new Error('Không tìm thấy JWT. Vui lòng đăng nhập lại bằng tài khoản OWNER.');
    const response = await fetch(`http://localhost:5000/api/owner${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `API trả về HTTP ${response.status}`);
    }
    return payload;
  };
  const mapCourt = (item) => ({
    id: Number(item.sub_court_id), facilityId: Number(item.court_id),
    name: item.name, sportTypeId: Number(item.sport_type_id),
    sportType: item.sport_name || ({1:'Padel',2:'Pickleball'}[Number(item.sport_type_id)] || 'Khác'),
    courtType: item.description || '', surfaceType: item.surface_type || '',
    priceNormal: Number(item.normal_price), pricePeak: Number(item.peak_price),
    status: item.status, amenities: item.amenities || [],
    imageUrl: item.image_url || 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80',
    isVisible: item.is_visible
  });
  const loadCourts = async () => {
    setCourtsLoading(true);
    setCourtsError('');
    try {
      const payload = await ownerRequest('/courts');
      setSubCourts((payload.data || []).map(mapCourt));
    } catch (error) {
      setCourtsError(error.message);
      setSubCourts([]);
    } finally {
      setCourtsLoading(false);
    }
  };
  useEffect(() => {
  if (currentUser) {
    loadCourts();
  }
}, [currentUser?.id, currentUser?.user_id]);

  // Bookings state
  const [bookings, setBookings] = useState(() => {
    const saved = localStorage.getItem('sportsbooking_owner_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  // Date selection for Schedule Matrix
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter sport type in Courts tab
  const [courtSportFilter, setCourtSportFilter] = useState('ALL');

  // Modals state
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [selectedSlotForWalkIn, setSelectedSlotForWalkIn] = useState(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Dữ liệu sân lấy từ PostgreSQL, không ghi đè bằng localStorage.
  useEffect(() => {
    localStorage.setItem('sportsbooking_owner_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Current active facility object
  const currentFacility = facilities.find(f => f.id === selectedFacilityId) || facilities[0];

  // Sub-courts belonging to current facility
  const currentSubCourts = subCourts.filter(c => c.facilityId === selectedFacilityId);

  // Filtered sub-courts for Courts tab
  const filteredSubCourts = currentSubCourts.filter(c => {
    if (courtSportFilter === 'ALL') return true;
    return c.sportType.toLowerCase() === courtSportFilter.toLowerCase();
  });

  // Bookings belonging to current facility
  const currentBookings = bookings.filter(b => b.facilityId === selectedFacilityId);

  // Bookings for selected schedule date
  const scheduleBookings = currentBookings.filter(b => b.date === selectedScheduleDate);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Switch facility handler
  const handleSelectFacility = (facId) => {
    setSelectedFacilityId(Number(facId));
    setCourtSportFilter('ALL');
    showToast(`Đã chuyển sang quản lý cụm sân: ${facilities.find(f => f.id === Number(facId))?.name}`);
  };

  // Chỉ cập nhật giao diện sau khi API ghi thành công vào PostgreSQL.
  const handleToggleCourtStatus = async (courtId) => {
    const court = subCourts.find(c => c.id === courtId);
    if (!court) return;
    const status = court.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      await ownerRequest(`/courts/${courtId}`, { method: 'PUT', body: JSON.stringify({ status }) });
      await loadCourts();
      showToast(`Đã cập nhật trạng thái sân thành ${status}.`);
    } catch (error) { showToast(`Không thể cập nhật: ${error.message}`); }
  };

  const handleDeleteCourt = () => {
    showToast('Backend chưa có API xóa sân. Không có dữ liệu nào bị xóa.');
  };

  const handleSaveCourt = async (e) => {
    e.preventDefault();
    if (courtSaving) return;
    const form = new FormData(e.currentTarget);
    const sportName = String(form.get('sportType'));
    const sportTypeId = ({ Padel: 1, Pickleball: 2 })[sportName];
    if (!sportTypeId) { showToast('Chưa có ID bộ môn tương ứng trong database.'); return; }
    const normal = Number(form.get('priceNormal'));
    const peak = Number(form.get('pricePeak'));
    if (!Number.isFinite(normal) || normal < 0 || !Number.isFinite(peak) || peak < normal) {
      showToast('Giá cao điểm phải lớn hơn hoặc bằng giá thường.'); return;
    }
    const body = {
      name: String(form.get('courtName')).trim(), sport_type_id: sportTypeId,
      description: String(form.get('courtType') || ''),
      surface_type: String(form.get('surfaceType') || ''),
      normal_price: normal, peak_price: peak,
      image_url: String(form.get('imageUrl') || '')
    };
    if (!editingCourt) { body.court_id = selectedFacilityId; body.amenities = []; }
    setCourtSaving(true);
    try {
      await ownerRequest(editingCourt ? `/courts/${editingCourt.id}` : '/courts', {
        method: editingCourt ? 'PUT' : 'POST', body: JSON.stringify(body)
      });
      await loadCourts();
      setShowAddCourtModal(false);
      showToast(editingCourt ? 'Đã lưu thay đổi vào PostgreSQL.' : 'Đã thêm sân vào PostgreSQL.');
    } catch (error) { showToast(`Lưu thất bại: ${error.message}`); }
    finally { setCourtSaving(false); }
  };

  // Update booking status
  const handleUpdateBookingStatus = (bookingId, newStatus) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: newStatus };
      }
      return b;
    }));
    
    // Call backend API if running
    fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).catch(() => {});

    showToast(`Đã cập nhật đơn đặt [${bookingId}] sang: ${newStatus}`);
    if (selectedBookingDetail) setSelectedBookingDetail(null);
  };

  // Timeline slots (06:00 to 22:00)
  const timeSlotsList = [
    "06:00 - 07:00",
    "07:00 - 08:00",
    "08:00 - 09:00",
    "09:00 - 10:00",
    "15:00 - 16:00",
    "16:00 - 17:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00",
    "20:00 - 21:00",
    "21:00 - 22:00"
  ];

  // Calculate real-time stats for current facility
  const activeCourtsCount = currentSubCourts.filter(c => c.status === 'ACTIVE').length;
  const todayBookingsCount = scheduleBookings.length;
  const todayRevenue = scheduleBookings
    .filter(b => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  return (
    <div className="min-vh-100 bg-light d-flex flex-column" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 2000 }}>
          <div className="alert alert-success shadow-lg border-0 d-flex align-items-center gap-2 mb-0 py-3 px-4 rounded-3 text-dark">
            <i className="bi bi-check-circle-fill text-success fs-5"></i>
            <div>
              <strong>Kênh Chủ Sân:</strong> {toastMessage}
            </div>
            <button type="button" className="btn-close ms-auto" onClick={() => setToastMessage('')}></button>
          </div>
        </div>
      )}

      {/* ========================================================
          1. OWNER TOPBAR HEADER
          ======================================================== */}
      <header className="bg-white border-bottom sticky-top shadow-sm py-2" style={{ zIndex: 1020 }}>
        <div className="container-fluid px-3 px-lg-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            
            {/* Logo & Portal Badge */}
            <div className="d-flex align-items-center gap-3">
              <a 
                href="#home" 
                onClick={(e) => { e.preventDefault(); onBackToHome(); }}
                className="text-decoration-none d-flex align-items-center gap-2"
              >
                <div className="d-flex align-items-center justify-content-center bg-brand-light rounded-circle" style={{ width: '36px', height: '36px' }}>
                  <i className="bi bi-trophy-fill text-brand fs-5"></i>
                </div>
                <span className="fw-bold fs-4 text-brand-dark tracking-tight">SportsBooking</span>
              </a>

              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill small fw-semibold d-flex align-items-center gap-1">
                <i className="bi bi-buildings-fill"></i>
                <span>KÊNH QUẢN LÝ CHỦ SÂN</span>
              </span>
            </div>

            {/* Facility Selector Dropdown (Multi-Vendor Highlight) */}
            <div className="d-flex align-items-center gap-2 flex-grow-1 flex-md-grow-0 justify-content-center">
              <div className="input-group input-group-sm shadow-sm" style={{ maxWidth: '380px' }}>
                <span className="input-group-text bg-light text-brand fw-bold border-end-0">
                  <i className="bi bi-geo-alt-fill me-1"></i> Cụm sân:
                </span>
                <select 
                  className="form-select fw-semibold border-start-0 bg-white" 
                  value={selectedFacilityId}
                  onChange={(e) => handleSelectFacility(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.category})
                    </option>
                  ))}
                </select>
                <button 
                  className="btn btn-outline-success" 
                  type="button" 
                  title="Thêm cụm sân / cơ sở mới"
                  onClick={() => showToast("Backend chưa hỗ trợ thêm cụm sân.")}
                >
                  <i className="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>

            {/* Quick Actions & User Profile */}
            <div className="d-flex align-items-center gap-2 ms-auto">
              {/* Back to Customer Web */}
              <button 
                type="button" 
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-3"
                onClick={onBackToHome}
                title="Quay lại giao diện người đặt sân thể thao"
              >
                <i className="bi bi-box-arrow-up-right"></i>
                <span className="d-none d-sm-inline">Xem Trang Khách Đặt</span>
              </button>

              {/* Owner Avatar & Name */}
              <div className="d-flex align-items-center gap-2 ps-2 border-start">
                <div 
                  className="rounded-circle bg-brand-dark text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '34px', height: '34px' }}
                >
                  {currentFacility.ownerName ? currentFacility.ownerName.charAt(0) : 'T'}
                </div>
                <div className="d-none d-md-block text-start lh-1">
                  <div className="small fw-bold text-dark">{currentUser?.fullName || currentFacility.ownerName}</div>
                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>Chủ sân đối tác ✅</span>
                </div>
                {onLogout && (
                  <button 
                    type="button" 
                    className="btn btn-link text-danger p-0 ms-1"
                    title="Đăng xuất"
                    onClick={onLogout}
                  >
                    <i className="bi bi-power fs-5"></i>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>

      {/* ========================================================
          2. FACILITY HERO BANNER & SUB-NAV TABS
          ======================================================== */}
      <section className="bg-white border-bottom shadow-xs pt-3 pb-0">
        <div className="container-fluid px-3 px-lg-4">
          <div className="row align-items-center mb-3 g-3">
            {/* Facility Info Card */}
            <div className="col-lg-8">
              <div className="d-flex align-items-start gap-3">
                <img 
                  src={currentFacility.imageUrl} 
                  alt={currentFacility.name} 
                  className="rounded-3 object-fit-cover shadow-sm d-none d-sm-block"
                  style={{ width: '80px', height: '80px' }}
                />
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                    <h4 className="fw-bold text-brand-dark mb-0">{currentFacility.name}</h4>
                    <span className="badge bg-success-subtle text-success border border-success-subtle">
                      {currentFacility.category}
                    </span>
                    <span className="badge bg-warning-subtle text-dark border border-warning-subtle d-flex align-items-center gap-1">
                      <i className="bi bi-star-fill text-warning"></i> {currentFacility.rating}
                    </span>
                  </div>
                  <p className="text-muted small mb-1 d-flex align-items-center gap-1">
                    <i className="bi bi-geo-alt text-brand"></i>
                    <span>{currentFacility.address}</span>
                  </p>
                  <div className="d-flex align-items-center gap-3 small text-muted flex-wrap">
                    <span><i className="bi bi-clock me-1 text-secondary"></i> Giờ mở cửa: {currentFacility.openTime}</span>
                    <span><i className="bi bi-telephone me-1 text-secondary"></i> Hotline: {currentFacility.ownerPhone}</span>
                    <span><i className="bi bi-diagram-3 me-1 text-secondary"></i> Môn: {currentFacility.sportTypes.join(', ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Button Group */}
            <div className="col-lg-4 text-lg-end">
              <div className="d-flex align-items-center justify-content-lg-end gap-2 flex-wrap">
                <button 
                  className="btn btn-outline-success btn-sm rounded-pill fw-semibold shadow-xs"
                  onClick={() => setShowWalkInModal(true)}
                >
                  <i className="bi bi-person-plus-fill me-1"></i> Đặt tại quầy
                </button>
                <button 
                  className="btn btn-brand btn-sm rounded-pill shadow-sm"
                  onClick={() => {
                    setEditingCourt(null);
                    setShowAddCourtModal(true);
                  }}
                >
                  <i className="bi bi-plus-circle-fill me-1"></i> Thêm sân con mới
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <ul className="nav nav-tabs border-bottom-0 gap-2 gap-md-4">
            <li className="nav-item">
              <button 
                className={`nav-link pb-3 fw-semibold border-0 bg-transparent text-secondary d-flex align-items-center gap-2 ${activeTab === 'overview' ? 'active text-brand border-bottom border-3 border-success' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <i className="bi bi-grid-1x2-fill"></i>
                <span>Tổng quan</span>
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link pb-3 fw-semibold border-0 bg-transparent text-secondary d-flex align-items-center gap-2 ${activeTab === 'courts' ? 'active text-brand border-bottom border-3 border-success' : ''}`}
                onClick={() => setActiveTab('courts')}
              >
                <i className="bi bi-dribbble"></i>
                <span>Quản lý Sân ({currentSubCourts.length})</span>
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link pb-3 fw-semibold border-0 bg-transparent text-secondary d-flex align-items-center gap-2 ${activeTab === 'schedule' ? 'active text-brand border-bottom border-3 border-success' : ''}`}
                onClick={() => setActiveTab('schedule')}
              >
                <i className="bi bi-calendar3"></i>
                <span>Lịch Đặt & Khung Giờ</span>
                {todayBookingsCount > 0 && (
                  <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                    {todayBookingsCount}
                  </span>
                )}
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link pb-3 fw-semibold border-0 bg-transparent text-secondary d-flex align-items-center gap-2 ${activeTab === 'finance' ? 'active text-brand border-bottom border-3 border-success' : ''}`}
                onClick={() => setActiveTab('finance')}
              >
                <i className="bi bi-cash-stack"></i>
                <span>Doanh thu & Đối soát</span>
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link pb-3 fw-semibold border-0 bg-transparent text-secondary d-flex align-items-center gap-2 ${activeTab === 'settings' ? 'active text-brand border-bottom border-3 border-success' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <i className="bi bi-gear-fill"></i>
                <span>Cài đặt Cơ sở</span>
              </button>
            </li>
          </ul>

        </div>
      </section>

      {/* ========================================================
          3. MAIN TAB CONTENT AREA
          ======================================================== */}
      <main className="flex-grow-1 py-4">
        <div className="container-fluid px-3 px-lg-4">

          {/* ==========================================
              TAB 1: TỔNG QUAN (OVERVIEW)
              ========================================== */}
          {activeTab === 'overview' && (
            <div>
              <div className="alert alert-warning small">Các số liệu doanh thu, lịch đặt và cấu hình cơ sở bên dưới vẫn là giao diện demo; chưa đồng bộ với backend.</div>
          {/* 4 KPI Cards */}
              <div className="row g-3 mb-4">
                <div className="col-xl-3 col-sm-6">
                  <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">DOANH THU THÁNG</span>
                      <div className="bg-success-subtle p-2 rounded-circle text-success">
                        <i className="bi bi-currency-dollar fs-5"></i>
                      </div>
                    </div>
                    <h3 className="fw-bold text-brand-dark mb-1">
                      {currentFacility.monthlyRevenue.toLocaleString('vi-VN')}đ
                    </h3>
                    <div className="small text-success d-flex align-items-center gap-1">
                      <i className="bi bi-arrow-up-right"></i>
                      <span><strong>+18.5%</strong> so với tháng trước</span>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-sm-6">
                  <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">LƯỢT ĐẶT SÂN</span>
                      <div className="bg-primary-subtle p-2 rounded-circle text-primary">
                        <i className="bi bi-calendar2-check-fill fs-5"></i>
                      </div>
                    </div>
                    <h3 className="fw-bold text-dark mb-1">
                      {currentFacility.totalBookings} lượt
                    </h3>
                    <div className="small text-muted d-flex align-items-center gap-1">
                      <span className="text-success fw-bold">+{todayBookingsCount} hôm nay</span> • {currentBookings.filter(b => b.status === 'CHECKED_IN').length} đã check-in
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-sm-6">
                  <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">CÔNG SUẤT LẤP ĐẦY</span>
                      <div className="bg-warning-subtle p-2 rounded-circle text-warning">
                        <i className="bi bi-speedometer2 fs-5"></i>
                      </div>
                    </div>
                    <h3 className="fw-bold text-dark mb-1">
                      {currentFacility.occupancyRate}%
                    </h3>
                    <div className="small text-success d-flex align-items-center gap-1">
                      <span>Khung giờ vàng (17h-21h): <strong>95%</strong></span>
                    </div>
                  </div>
                </div>

                <div className="col-xl-3 col-sm-6">
                  <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-muted small fw-semibold">SÂN HOẠT ĐỘNG</span>
                      <div className="bg-info-subtle p-2 rounded-circle text-info">
                        <i className="bi bi-check2-circle fs-5"></i>
                      </div>
                    </div>
                    <h3 className="fw-bold text-dark mb-1">
                      {activeCourtsCount} / {currentSubCourts.length} sân
                    </h3>
                    <div className="small text-muted">
                      {currentSubCourts.length - activeCourtsCount > 0 ? (
                        <span className="text-warning fw-semibold">{currentSubCourts.length - activeCourtsCount} sân đang bảo trì</span>
                      ) : (
                        <span className="text-success fw-semibold">Tất cả sân sẵn sàng đón khách</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart & Live Bookings Section */}
              <div className="row g-4 mb-4">
                {/* 7-Day Revenue Bar Visualization */}
                <div className="col-lg-7">
                  <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <h6 className="fw-bold text-dark mb-0">Biểu đồ doanh thu 7 ngày gần đây</h6>
                        <span className="text-muted small">Cụm: {currentFacility.name}</span>
                      </div>
                      <span className="badge bg-light text-secondary border">Tuần hiện tại</span>
                    </div>

                    <div className="d-flex align-items-end justify-content-between pt-4 px-2" style={{ height: '220px' }}>
                      {[
                        { day: 'T2', amount: '2.1M', height: '40%' },
                        { day: 'T3', amount: '3.4M', height: '60%' },
                        { day: 'T4', amount: '2.8M', height: '52%' },
                        { day: 'T5', amount: '4.2M', height: '75%' },
                        { day: 'T6', amount: '5.8M', height: '90%' },
                        { day: 'T7', amount: '7.2M', height: '100%', highlight: true },
                        { day: 'CN', amount: '6.5M', height: '95%' }
                      ].map((bar, i) => (
                        <div key={i} className="d-flex flex-column align-items-center flex-grow-1">
                          <span className="small fw-semibold text-muted mb-2" style={{ fontSize: '0.72rem' }}>{bar.amount}</span>
                          <div 
                            className="w-50 rounded-top transition-all" 
                            style={{ 
                              height: bar.height, 
                              backgroundColor: bar.highlight ? '#0b4d3c' : '#10b981',
                              boxShadow: bar.highlight ? '0 4px 10px rgba(11, 77, 60, 0.4)' : 'none'
                            }}
                          ></div>
                          <span className={`small mt-2 ${bar.highlight ? 'fw-bold text-brand' : 'text-muted'}`}>{bar.day}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-top mt-3 pt-3 d-flex align-items-center justify-content-between small text-muted">
                      <div><i className="bi bi-circle-fill text-brand me-1"></i> Ngày cao điểm: <strong>Thứ Bảy & Chủ Nhật</strong></div>
                      <div>Trung bình: <strong>4.570.000đ / ngày</strong></div>
                    </div>
                  </div>
                </div>

                {/* Sport Types Breakdown & Quick Actions */}
                <div className="col-lg-5">
                  <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100 d-flex flex-column">
                    <h6 className="fw-bold text-dark mb-3">Phân bổ doanh thu theo bộ môn</h6>
                    
                    <div className="mb-4">
                      {currentFacility.sportTypes.map((sport, idx) => {
                        const ratio = idx === 0 ? 65 : 35;
                        return (
                          <div key={idx} className="mb-3">
                            <div className="d-flex justify-content-between small fw-semibold mb-1">
                              <span>Môn {sport}</span>
                              <span className="text-brand">{ratio}% doanh thu</span>
                            </div>
                            <div className="progress" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-success" 
                                role="progressbar" 
                                style={{ width: `${ratio}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-auto border-top pt-3">
                      <h6 className="fw-bold text-dark mb-2">Thao tác nhanh cho chủ sân</h6>
                      <div className="d-grid gap-2">
                        <button 
                          className="btn btn-outline-success text-start d-flex align-items-center justify-content-between py-2 px-3 rounded-3"
                          onClick={() => setShowWalkInModal(true)}
                        >
                          <span><i className="bi bi-person-plus me-2"></i> Nhận khách vãng lai tại quầy</span>
                          <i className="bi bi-chevron-right small"></i>
                        </button>
                        <button 
                          className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between py-2 px-3 rounded-3"
                          onClick={() => {
                            setEditingCourt(null);
                            setShowAddCourtModal(true);
                          }}
                        >
                          <span><i className="bi bi-plus-square me-2"></i> Thêm sân thi đấu mới</span>
                          <i className="bi bi-chevron-right small"></i>
                        </button>
                        <button 
                          className="btn btn-outline-secondary text-start d-flex align-items-center justify-content-between py-2 px-3 rounded-3"
                          onClick={() => setActiveTab('schedule')}
                        >
                          <span><i className="bi bi-calendar-event me-2"></i> Xem lịch ma trận khung giờ</span>
                          <i className="bi bi-chevron-right small"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bookings Needing Attention Today */}
              <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                  <div>
                    <h6 className="fw-bold text-dark mb-0">Lượt đặt sân sắp tới hôm nay ({currentFacility.name})</h6>
                    <span className="text-muted small">Cập nhật tự động thời gian thực từ người chơi trên ứng dụng</span>
                  </div>
                  <button 
                    className="btn btn-sm btn-link text-brand fw-semibold text-decoration-none"
                    onClick={() => setActiveTab('schedule')}
                  >
                    Xem toàn bộ lịch đặt <i className="bi bi-arrow-right"></i>
                  </button>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th>MÃ ĐƠN</th>
                        <th>KHÁCH HÀNG</th>
                        <th>SÂN CON & MÔN</th>
                        <th>KHUNG GIỜ</th>
                        <th>SỐ TIỀN</th>
                        <th>THANH TOÁN</th>
                        <th>TRẠNG THÁI</th>
                        <th className="text-end">THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduleBookings.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-4 text-muted">
                            Hôm nay chưa có lịch đặt nào tại cơ sở này. Hãy bấm "Đặt tại quầy" nếu có khách vãng lai gọi điện!
                          </td>
                        </tr>
                      ) : (
                        scheduleBookings.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <span className="fw-bold text-dark">{b.id}</span>
                            </td>
                            <td>
                              <div className="fw-semibold text-dark">{b.customerName}</div>
                              <span className="text-muted small">{b.customerPhone}</span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border me-1">{b.subCourtName}</span>
                            </td>
                            <td>
                              <span className="badge bg-success-subtle text-success fw-bold px-2 py-1">
                                {b.timeSlot}
                              </span>
                            </td>
                            <td>
                              <strong className="text-brand-dark">{b.totalPrice?.toLocaleString('vi-VN')}đ</strong>
                            </td>
                            <td>
                              <span className="small text-muted">{b.paymentMethod}</span>
                            </td>
                            <td>
                              <span className={`badge rounded-pill ${
                                b.status === 'CONFIRMED' ? 'bg-primary' : 
                                b.status === 'CHECKED_IN' ? 'bg-success' : 
                                b.status === 'CANCELLED' ? 'bg-danger' : 'bg-warning text-dark'
                              }`}>
                                {b.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                 b.status === 'CHECKED_IN' ? 'Đã check-in' : 
                                 b.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xác nhận'}
                              </span>
                            </td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm">
                                {b.status !== 'CHECKED_IN' && b.status !== 'CANCELLED' && (
                                  <button 
                                    className="btn btn-outline-success" 
                                    title="Check-in khi khách tới sân"
                                    onClick={() => handleUpdateBookingStatus(b.id, 'CHECKED_IN')}
                                  >
                                    <i className="bi bi-check-lg me-1"></i> Check-in
                                  </button>
                                )}
                                <button 
                                  className="btn btn-outline-secondary"
                                  onClick={() => setSelectedBookingDetail(b)}
                                  title="Xem chi tiết đơn"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                                {b.status !== 'CANCELLED' && (
                                  <button 
                                    className="btn btn-outline-danger" 
                                    title="Hủy đơn đặt sân"
                                    onClick={() => {
                                      if (window.confirm(`Bạn có chắc muốn hủy đơn [${b.id}] của ${b.customerName}?`)) {
                                        handleUpdateBookingStatus(b.id, 'CANCELLED');
                                      }
                                    }}
                                  >
                                    <i className="bi bi-x-lg"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 2: QUẢN LÝ SÂN (COURTS MANAGEMENT)
              ========================================== */}
          {activeTab === 'courts' && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                <div>
                  <h5 className="fw-bold text-brand-dark mb-1">
                    Danh Sách Sân Con ({currentFacility.name})
                  </h5>
                  <p className="text-muted small mb-0">
                    Quản lý từng sân thi đấu cụ thể, mặt sân, bảng giá giờ thường / cao điểm và trạng thái đón khách
                  </p>
                </div>
                
                <div className="d-flex align-items-center gap-2">
                  {/* Filter by sport */}
                  <select 
                    className="form-select form-select-sm"
                    value={courtSportFilter}
                    onChange={(e) => setCourtSportFilter(e.target.value)}
                    style={{ width: '160px' }}
                  >
                    <option value="ALL">Tất cả môn</option>
                    {currentFacility.sportTypes.map((s, idx) => (
                      <option key={idx} value={s}>{s}</option>
                    ))}
                  </select>

                  <button 
                    className="btn btn-brand btn-sm d-flex align-items-center gap-1 rounded-3 shadow-sm"
                    onClick={() => {
                      setEditingCourt(null);
                      setShowAddCourtModal(true);
                    }}
                  >
                    <i className="bi bi-plus-lg"></i>
                    <span>Thêm Sân Mới</span>
                  </button>
                </div>
              </div>

              {courtsLoading && <div className="alert alert-info">Đang tải danh sách sân từ PostgreSQL...</div>}
          {courtsError && <div className="alert alert-danger">{courtsError} <button className="btn btn-sm btn-outline-danger ms-2" onClick={loadCourts}>Thử lại</button></div>}
          {/* Sub-Courts Grid */}
              <div className="row g-4">
                {filteredSubCourts.length === 0 ? (
                  <div className="col-12 text-center py-5">
                    <div className="bg-white p-5 rounded-3 shadow-sm">
                      <i className="bi bi-dribbble text-muted fs-1 mb-2 d-block"></i>
                      <h6>Chưa có sân con nào phù hợp với bộ lọc.</h6>
                      <button 
                        className="btn btn-outline-success btn-sm mt-2"
                        onClick={() => {
                          setEditingCourt(null);
                          setShowAddCourtModal(true);
                        }}
                      >
                        + Tạo sân con mới ngay
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredSubCourts.map((court) => (
                    <div key={court.id} className="col-lg-4 col-md-6">
                      <div className="card h-100 border-0 shadow-sm rounded-3 overflow-hidden bg-white">
                        {/* Court Image & Status Badge */}
                        <div className="position-relative" style={{ height: '170px' }}>
                          <img 
                            src={court.imageUrl} 
                            alt={court.name}
                            className="w-100 h-100 object-fit-cover"
                          />
                          <div className="position-absolute top-0 start-0 m-2">
                            <span className="badge bg-dark bg-opacity-75 text-uppercase">
                              {court.sportType}
                            </span>
                          </div>
                          <div className="position-absolute top-0 end-0 m-2">
                            <span className={`badge ${court.status === 'ACTIVE' ? 'bg-success' : 'bg-warning text-dark'} shadow-sm`}>
                              {court.status === 'ACTIVE' ? '🟢 Đang đón khách' : '🟡 Đang bảo trì'}
                            </span>
                          </div>
                        </div>

                        {/* Court Body */}
                        <div className="card-body p-3 d-flex flex-column">
                          <h6 className="fw-bold text-dark mb-1">{court.name}</h6>
                          <div className="small text-muted mb-2">
                            <i className="bi bi-layers me-1 text-secondary"></i> {court.courtType}
                          </div>
                          <div className="small text-muted mb-3">
                            <i className="bi bi-shield-check me-1 text-success"></i> {court.surfaceType}
                          </div>

                          {/* Pricing box */}
                          <div className="bg-light p-2 rounded-2 mb-3">
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted">Giờ thường:</span>
                              <strong className="text-dark">{court.priceNormal.toLocaleString('vi-VN')}đ /h</strong>
                            </div>
                            <div className="d-flex justify-content-between small">
                              <span className="text-muted">Giờ vàng (17h-21h):</span>
                              <strong className="text-brand">{court.pricePeak.toLocaleString('vi-VN')}đ /h</strong>
                            </div>
                          </div>

                          {/* Amenities chips */}
                          <div className="d-flex flex-wrap gap-1 mb-3">
                            {court.amenities && court.amenities.map((a, i) => (
                              <span key={i} className="badge bg-light text-secondary border fw-normal" style={{ fontSize: '0.7rem' }}>
                                {a}
                              </span>
                            ))}
                          </div>

                          {/* Action footer */}
                          <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
                            <button 
                              type="button" 
                              className={`btn btn-sm ${court.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'} rounded-2`}
                              onClick={() => handleToggleCourtStatus(court.id)}
                            >
                              {court.status === 'ACTIVE' ? 'Khóa bảo trì' : 'Mở lại sân'}
                            </button>

                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                  setEditingCourt(court);
                                  setShowAddCourtModal(true);
                                }}
                                title="Sửa thông tin sân"
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button 
                                className="btn btn-outline-danger"
                                onClick={() => handleDeleteCourt(court.id)} disabled
                                title="Backend chưa hỗ trợ xóa sân"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 3: LỊCH ĐẶT & BẢNG KHUNG GIỜ (SCHEDULE MATRIX)
              ========================================== */}
          {activeTab === 'schedule' && (
            <div>
              {/* Filter bar for schedule */}
              <div className="card border-0 shadow-sm rounded-3 p-3 bg-white mb-4">
                <div className="row align-items-center g-3">
                  <div className="col-md-5">
                    <label className="form-label small text-muted fw-semibold mb-1">
                      <i className="bi bi-calendar-date me-1"></i> Chọn ngày xem lịch:
                    </label>
                    <div className="d-flex align-items-center gap-2">
                      <input 
                        type="date" 
                        className="form-control form-control-sm"
                        value={selectedScheduleDate}
                        onChange={(e) => setSelectedScheduleDate(e.target.value)}
                      />
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary btn-sm text-nowrap"
                        onClick={() => setSelectedScheduleDate(new Date().toISOString().split('T')[0])}
                      >
                        Hôm nay
                      </button>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="small text-muted mb-1">Trạng thái khung giờ:</div>
                    <div className="d-flex align-items-center gap-3 small">
                      <span className="d-flex align-items-center gap-1">
                        <span className="d-inline-block rounded bg-success-subtle border border-success" style={{ width: '14px', height: '14px' }}></span>
                        <span>Trống</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span className="d-inline-block rounded bg-primary text-white" style={{ width: '14px', height: '14px' }}></span>
                        <span>Đã đặt</span>
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span className="d-inline-block rounded bg-secondary-subtle border" style={{ width: '14px', height: '14px' }}></span>
                        <span>Bảo trì</span>
                      </span>
                    </div>
                  </div>

                  <div className="col-md-3 text-md-end">
                    <button 
                      className="btn btn-brand btn-sm rounded-pill shadow-xs"
                      onClick={() => setShowWalkInModal(true)}
                    >
                      <i className="bi bi-plus-lg me-1"></i> Đặt tại quầy
                    </button>
                  </div>
                </div>
              </div>

              {/* Time-Slot Grid Matrix */}
              <div className="card border-0 shadow-sm rounded-3 bg-white mb-4 overflow-hidden">
                <div className="card-header bg-light py-3 border-0">
                  <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-grid-3x3-gap-fill text-brand"></i>
                    <span>Ma trận khung giờ: {currentFacility.name} (Ngày: {selectedScheduleDate})</span>
                  </h6>
                  <span className="text-muted small">Nhấp vào ô TRỐNG để đặt sân nhanh cho khách vãng lai gọi điện</span>
                </div>

                <div className="table-responsive p-3">
                  <table className="table table-bordered text-center align-middle mb-0" style={{ minWidth: '700px' }}>
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '140px' }} className="text-secondary small">KHUNG GIỜ</th>
                        {currentSubCourts.map(court => (
                          <th key={court.id} className="small">
                            <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '160px' }}>{court.name}</div>
                            <span className="badge bg-light text-secondary border fw-normal" style={{ fontSize: '0.65rem' }}>
                              {court.sportType}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlotsList.map((slot) => (
                        <tr key={slot}>
                          <td className="fw-semibold text-secondary small bg-light text-nowrap">
                            <i className="bi bi-clock me-1 text-muted"></i>{slot}
                          </td>
                          {currentSubCourts.map(court => {
                            // Check if this slot on this court is booked
                            const bookingMatch = scheduleBookings.find(b => 
                              b.subCourtId === court.id && 
                              b.timeSlot === slot &&
                              b.status !== 'CANCELLED'
                            );

                            const isMaintenance = court.status === 'MAINTENANCE';

                            if (isMaintenance) {
                              return (
                                <td key={court.id} className="bg-secondary-subtle text-muted small p-2" title="Sân đang bảo trì">
                                  <span className="small text-secondary">Bảo trì</span>
                                </td>
                              );
                            }

                            if (bookingMatch) {
                              return (
                                <td 
                                  key={court.id} 
                                  className="p-1 cursor-pointer"
                                  onClick={() => setSelectedBookingDetail(bookingMatch)}
                                  title={`Bấm để xem chi tiết đơn: ${bookingMatch.customerName}`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="p-2 rounded bg-primary text-white shadow-xs text-start">
                                    <div className="fw-bold small text-truncate">{bookingMatch.customerName}</div>
                                    <div style={{ fontSize: '0.68rem', opacity: 0.9 }}>
                                      {bookingMatch.status === 'CHECKED_IN' ? '✅ Đã Check-in' : '🔵 Đã xác nhận'}
                                    </div>
                                  </div>
                                </td>
                              );
                            }

                            // Slot is available
                            return (
                              <td 
                                key={court.id}
                                className="p-1"
                              >
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success w-100 h-100 py-2 border-dashed small"
                                  onClick={() => {
                                    setSelectedSlotForWalkIn({
                                      subCourtId: court.id,
                                      subCourtName: court.name,
                                      timeSlot: slot,
                                      price: court.pricePeak
                                    });
                                    setShowWalkInModal(true);
                                  }}
                                  title="Bấm để nhận khách đặt khung giờ này"
                                >
                                  <i className="bi bi-plus-circle me-1"></i>Trống
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Full Bookings List Table */}
              <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
                <h6 className="fw-bold text-dark mb-3">Danh sách toàn bộ đơn đặt sân trong hệ thống</h6>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th>MÃ ĐƠN</th>
                        <th>NGÀY ĐẶT</th>
                        <th>KHÁCH HÀNG</th>
                        <th>SÂN CON</th>
                        <th>KHUNG GIỜ</th>
                        <th>TỔNG TIỀN</th>
                        <th>HÌNH THỨC</th>
                        <th>TRẠNG THÁI</th>
                        <th className="text-end">HÀNH ĐỘNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBookings.map(b => (
                        <tr key={b.id}>
                          <td className="fw-bold text-dark">{b.id}</td>
                          <td className="small text-muted">{b.date}</td>
                          <td>
                            <div className="fw-semibold text-dark">{b.customerName}</div>
                            <span className="small text-muted">{b.customerPhone}</span>
                          </td>
                          <td className="small">{b.subCourtName}</td>
                          <td><span className="badge bg-light text-dark border">{b.timeSlot}</span></td>
                          <td><strong className="text-brand-dark">{b.totalPrice?.toLocaleString('vi-VN')}đ</strong></td>
                          <td className="small text-muted">{b.paymentMethod}</td>
                          <td>
                            <span className={`badge rounded-pill ${
                              b.status === 'CONFIRMED' ? 'bg-primary' : 
                              b.status === 'CHECKED_IN' ? 'bg-success' : 
                              b.status === 'CANCELLED' ? 'bg-danger' : 'bg-warning text-dark'
                            }`}>
                              {b.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                               b.status === 'CHECKED_IN' ? 'Đã check-in' : 
                               b.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xác nhận'}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm">
                              {b.status !== 'CHECKED_IN' && b.status !== 'CANCELLED' && (
                                <button 
                                  className="btn btn-outline-success"
                                  onClick={() => handleUpdateBookingStatus(b.id, 'CHECKED_IN')}
                                  title="Check-in khách vào sân"
                                >
                                  <i className="bi bi-check2"></i>
                                </button>
                              )}
                              <button 
                                className="btn btn-outline-secondary"
                                onClick={() => setSelectedBookingDetail(b)}
                                title="Xem chi tiết"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: DOANH THU & ĐỐI SOÁT (FINANCE)
              ========================================== */}
          {activeTab === 'finance' && (
            <div>
              <div className="row g-4 mb-4">
                <div className="col-lg-4">
                  <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
                    <span className="text-muted small fw-semibold">TỔNG THU THÁNG 11/2026</span>
                    <h2 className="fw-bold text-brand-dark mt-2 mb-1">
                      {currentFacility.monthlyRevenue.toLocaleString('vi-VN')}đ
                    </h2>
                    <p className="text-muted small mb-4">Đã ghi nhận qua 186 lượt đặt sân thành công</p>

                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between mb-2 small">
                        <span className="text-muted">Thanh toán Online (SportsBooking):</span>
                        <strong className="text-success">
                          {(currentFacility.monthlyRevenue * 0.72).toLocaleString('vi-VN')}đ
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2 small">
                        <span className="text-muted">Tiền mặt tại quầy / Chuyển khoản:</span>
                        <strong className="text-primary">
                          {(currentFacility.monthlyRevenue * 0.28).toLocaleString('vi-VN')}đ
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between pt-2 border-top small">
                        <span className="text-muted">Phí nền tảng (5%):</span>
                        <span className="text-danger">
                          -{(currentFacility.monthlyRevenue * 0.05).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    <button 
                      className="btn btn-brand w-100 mt-4 py-2 rounded-3 shadow-sm"
                      onClick={() => alert(`Yêu cầu quyết toán doanh thu đã gửi! Số dư ${(currentFacility.monthlyRevenue * 0.67).toLocaleString('vi-VN')}đ sẽ được chuyển về tài khoản ${currentFacility.bankName} (${currentFacility.bankAccountNo}) trong 24h.`)}
                    >
                      <i className="bi bi-wallet2 me-2"></i> Yêu Cầu Rút Tiền Về Ngân Hàng
                    </button>
                  </div>
                </div>

                <div className="col-lg-8">
                  <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="fw-bold text-dark mb-0">Lịch sử các kỳ đối soát & Chuyển khoản định kỳ</h6>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => alert('Xuất sao kê Excel thành công!')}
                      >
                        <i className="bi bi-file-earmark-spreadsheet me-1"></i> Xuất Excel
                      </button>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light small text-muted">
                          <tr>
                            <th>MÃ KỲ ĐỐI SOÁT</th>
                            <th>KHOẢNG THỜI GIAN</th>
                            <th>SỐ LƯỢT ĐẶT</th>
                            <th>SỐ TIỀN THỰC NHẬN</th>
                            <th>TÀI KHOẢN NGÂN HÀNG</th>
                            <th>TRẠNG THÁI</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="fw-bold">DS-2026-W44</td>
                            <td className="small text-muted">27/10 - 02/11/2026</td>
                            <td>48 lượt</td>
                            <td><strong className="text-success">14.250.000đ</strong></td>
                            <td className="small">{currentFacility.bankName} ••••{currentFacility.bankAccountNo?.slice(-4)}</td>
                            <td><span className="badge bg-success">Đã giải ngân</span></td>
                          </tr>
                          <tr>
                            <td className="fw-bold">DS-2026-W43</td>
                            <td className="small text-muted">20/10 - 26/10/2026</td>
                            <td>52 lượt</td>
                            <td><strong className="text-success">15.800.000đ</strong></td>
                            <td className="small">{currentFacility.bankName} ••••{currentFacility.bankAccountNo?.slice(-4)}</td>
                            <td><span className="badge bg-success">Đã giải ngân</span></td>
                          </tr>
                          <tr>
                            <td className="fw-bold">DS-2026-W42</td>
                            <td className="small text-muted">13/10 - 19/10/2026</td>
                            <td>45 lượt</td>
                            <td><strong className="text-success">13.600.000đ</strong></td>
                            <td className="small">{currentFacility.bankName} ••••{currentFacility.bankAccountNo?.slice(-4)}</td>
                            <td><span className="badge bg-success">Đã giải ngân</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: CÀI ĐẶT CƠ SỞ (SETTINGS)
              ========================================== */}
          {activeTab === 'settings' && (
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
                  <h6 className="fw-bold text-dark mb-3">Hồ sơ Cụm Sân & Chủ Sân Đối Tác</h6>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    showToast('Đã lưu cấu hình cơ sở thành công!');
                  }}>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Tên Cụm Sân / Tổ Hợp Thể Thao</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.name}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Người Đại Diện / Chủ Sân</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.ownerName}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Số Điện Thoại Hotline</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.ownerPhone}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Email Nhận Đơn Đặt Sân</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          defaultValue={currentFacility.ownerEmail}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold">Địa Chỉ Chi Tiết</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.address}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Khu Vực / Thành Phố</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.city}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Giờ Hoạt Động (Mở - Đóng)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.openTime}
                        />
                      </div>
                    </div>

                    <h6 className="fw-bold text-dark mt-4 mb-3 border-top pt-3">Tài Khoản Nhận Thanh Toán (Quyết Toán Doanh Thu)</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Ngân Hàng</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.bankName}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Số Tài Khoản</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.bankAccountNo}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-semibold">Chủ Tài Khoản (In hoa)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          defaultValue={currentFacility.bankAccountName}
                        />
                      </div>
                    </div>

                    <div className="text-end">
                      <button type="submit" className="btn btn-brand px-4 rounded-3 shadow-sm">
                        Lưu Cấu Hình Cơ Sở
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card border-0 shadow-sm rounded-3 p-4 bg-white text-center">
                  <h6 className="fw-bold text-dark mb-3">Mã VietQR Thanh Toán Của Cơ Sở</h6>
                  <div className="bg-light p-3 rounded-3 mb-3 d-inline-block border">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2|99|${currentFacility.bankAccountNo}|${currentFacility.bankName}|0|0|SPORTSBOOKING`} 
                      alt="VietQR" 
                      className="img-fluid rounded"
                      style={{ maxWidth: '160px' }}
                    />
                  </div>
                  <div className="small fw-bold text-dark">{currentFacility.bankAccountName}</div>
                  <div className="small text-muted">{currentFacility.bankName} - {currentFacility.bankAccountNo}</div>
                  <p className="text-muted small mt-2" style={{ fontSize: '0.75rem' }}>
                    Mã QR này được dùng để khách quét chuyển khoản khi nhận khách tại quầy hoặc cọc giữ sân.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ========================================================
          MODAL 1: THÊM / SỬA SÂN CON (SUB-COURT MODAL)
          ======================================================== */}
      {showAddCourtModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold">
                  {editingCourt ? 'Chỉnh Sửa Thông Tin Sân' : 'Thêm Sân Con Mới Vào Cụm Sân'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowAddCourtModal(false)}
                ></button>
              </div>

              <form onSubmit={handleSaveCourt}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Tên Sân Con (*)</label>
                      <input 
                        type="text" 
                        name="courtName" 
                        className="form-control" 
                        required 
                        defaultValue={editingCourt ? editingCourt.name : `Sân ${currentFacility.sportTypes[0]} Số ${currentSubCourts.length + 1}`}
                        placeholder="Ví dụ: Sân Padel 3 (Panoramic VIP)"
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Bộ Môn Thể Thao (*)</label>
                      <select 
                        name="sportType" 
                        className="form-select" 
                        defaultValue={editingCourt ? editingCourt.sportType : currentFacility.sportTypes[0]}
                      >
                        <option value="Padel">Padel</option>
                        <option value="Pickleball">Pickleball</option>
                        <option value="Bóng đá">Bóng đá</option>
                        <option value="Cầu lông">Cầu lông</option>
                        <option value="Tennis">Tennis</option>
                        <option value="Bóng rổ">Bóng rổ</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Loại Sân</label>
                      <input 
                        type="text" 
                        name="courtType" 
                        className="form-control" 
                        defaultValue={editingCourt ? editingCourt.courtType : 'Ngoài trời có mái che'}
                        placeholder="Ví dụ: Kính cường lực Panoramic, Có mái che, Trong nhà..."
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Mặt Sân Thi Đấu</label>
                      <input 
                        type="text" 
                        name="surfaceType" 
                        className="form-control" 
                        defaultValue={editingCourt ? editingCourt.surfaceType : 'Cỏ nhân tạo chuẩn quốc tế'}
                        placeholder="Ví dụ: Thảm Yonex, Cỏ FIFA, Sàn Acrylic..."
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Giá Thuê Giờ Thường (VNĐ/giờ) (*)</label>
                      <input 
                        type="number" 
                        name="priceNormal" 
                        className="form-control" 
                        required
                        defaultValue={editingCourt ? editingCourt.priceNormal : 200000}
                        step="10000"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Giá Thuê Giờ Vàng (17h - 21h) (*)</label>
                      <input 
                        type="number" 
                        name="pricePeak" 
                        className="form-control" 
                        required
                        defaultValue={editingCourt ? editingCourt.pricePeak : 320000}
                        step="10000"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Đường Dẫn Hình Ảnh Thực Tế Của Sân</label>
                      <input 
                        type="url" 
                        name="imageUrl" 
                        className="form-control" 
                        defaultValue={editingCourt ? editingCourt.imageUrl : 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80'}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowAddCourtModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={courtSaving} className="btn btn-brand px-4">
                    {courtSaving ? 'Đang lưu...' : (editingCourt ? 'Cập Nhật' : 'Lưu Sân Mới')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: ĐẶT SÂN TẠI QUẦY (WALK-IN BOOKING)
          ======================================================== */}
      {showWalkInModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>
                  Tạo Lịch Đặt Tại Quầy / Khách Gọi Điện
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setShowWalkInModal(false);
                    setSelectedSlotForWalkIn(null);
                  }}
                ></button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const subCourtId = parseInt(formData.get('subCourtId'), 10);
                const courtObj = currentSubCourts.find(c => c.id === subCourtId) || currentSubCourts[0];
                const customerName = formData.get('customerName');
                const customerPhone = formData.get('customerPhone');
                const timeSlot = formData.get('timeSlot');
                const date = formData.get('date');
                const paymentMethod = formData.get('paymentMethod');
                const totalPrice = parseInt(formData.get('price'), 10) || 280000;

                const newBooking = {
                  id: `BK-W${Date.now().toString().slice(-4)}`,
                  facilityId: selectedFacilityId,
                  subCourtId,
                  subCourtName: courtObj.name,
                  customerName,
                  customerPhone,
                  date,
                  timeSlot,
                  totalPrice,
                  paymentMethod,
                  paymentStatus: paymentMethod === 'Tiền mặt tại quầy' ? 'PAID' : 'PENDING_AT_COUNTER',
                  status: 'CHECKED_IN',
                  note: 'Khách đặt trực tiếp tại quầy / qua điện thoại'
                };

                setBookings(prev => [newBooking, ...prev]);
                showToast(`Đã nhận khách ${customerName} tại ${courtObj.name} khung giờ ${timeSlot}!`);
                setShowWalkInModal(false);
                setSelectedSlotForWalkIn(null);
              }}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Chọn Sân Con (*)</label>
                      <select 
                        name="subCourtId" 
                        className="form-select"
                        defaultValue={selectedSlotForWalkIn ? selectedSlotForWalkIn.subCourtId : (currentSubCourts[0]?.id || '')}
                      >
                        {currentSubCourts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.sportType})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Tên Khách Hàng (*)</label>
                      <input 
                        type="text" 
                        name="customerName" 
                        className="form-control" 
                        required 
                        placeholder="Nguyễn Văn A"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Số Điện Thoại (*)</label>
                      <input 
                        type="tel" 
                        name="customerPhone" 
                        className="form-control" 
                        required 
                        placeholder="0901234567"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Ngày Chơi</label>
                      <input 
                        type="date" 
                        name="date" 
                        className="form-control" 
                        defaultValue={selectedScheduleDate}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Khung Giờ Chơi</label>
                      <select 
                        name="timeSlot" 
                        className="form-select"
                        defaultValue={selectedSlotForWalkIn ? selectedSlotForWalkIn.timeSlot : timeSlotsList[4]}
                      >
                        {timeSlotsList.map((s, idx) => (
                          <option key={idx} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Tiền Thu (VNĐ)</label>
                      <input 
                        type="number" 
                        name="price" 
                        className="form-control" 
                        defaultValue={selectedSlotForWalkIn ? selectedSlotForWalkIn.price : 280000}
                        step="10000"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Hình Thức Thanh Toán</label>
                      <select name="paymentMethod" className="form-select">
                        <option value="Tiền mặt tại quầy">Tiền mặt tại quầy</option>
                        <option value="Quét mã VietQR">Quét mã VietQR</option>
                        <option value="Thanh toán sau khi đá/chơi">Thanh toán sau</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowWalkInModal(false);
                      setSelectedSlotForWalkIn(null);
                    }}
                  >
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-success px-4">
                    Xác Nhận Nhận Khách
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: XEM CHI TIẾT ĐƠN ĐẶT SÂN
          ======================================================== */}
      {selectedBookingDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title fw-bold">
                  Chi Tiết Đơn Đặt Sân: {selectedBookingDetail.id}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setSelectedBookingDetail(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="list-group list-group-flush small">
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Khách hàng:</span>
                    <strong className="text-dark">{selectedBookingDetail.customerName}</strong>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Số điện thoại:</span>
                    <strong className="text-primary">{selectedBookingDetail.customerPhone}</strong>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Sân thi đấu:</span>
                    <strong className="text-dark">{selectedBookingDetail.subCourtName}</strong>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Ngày & Giờ chơi:</span>
                    <strong className="text-success">{selectedBookingDetail.date} ({selectedBookingDetail.timeSlot})</strong>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Tổng tiền:</span>
                    <strong className="text-brand-dark fs-6">{selectedBookingDetail.totalPrice?.toLocaleString('vi-VN')}đ</strong>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Phương thức thanh toán:</span>
                    <span>{selectedBookingDetail.paymentMethod}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between px-0">
                    <span className="text-muted">Trạng thái:</span>
                    <span className={`badge ${selectedBookingDetail.status === 'CHECKED_IN' ? 'bg-success' : 'bg-primary'}`}>
                      {selectedBookingDetail.status}
                    </span>
                  </div>
                  {selectedBookingDetail.note && (
                    <div className="list-group-item px-0">
                      <span className="text-muted d-block mb-1">Ghi chú từ khách:</span>
                      <p className="p-2 bg-light rounded text-dark mb-0">{selectedBookingDetail.note}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer bg-light d-flex justify-content-between">
                <div>
                  {selectedBookingDetail.status !== 'CANCELLED' && (
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleUpdateBookingStatus(selectedBookingDetail.id, 'CANCELLED')}
                    >
                      Hủy Đơn Đặt
                    </button>
                  )}
                </div>
                <div className="d-flex gap-2">
                  {selectedBookingDetail.status !== 'CHECKED_IN' && selectedBookingDetail.status !== 'CANCELLED' && (
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleUpdateBookingStatus(selectedBookingDetail.id, 'CHECKED_IN')}
                    >
                      Xác Nhận Check-in
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => setSelectedBookingDetail(null)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

