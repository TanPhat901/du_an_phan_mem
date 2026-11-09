import React, { useState, useEffect, useCallback } from 'react';

// Dữ liệu đặt sân tạm thời cho tab Tổng quan & Lịch đặt (sẽ được thay thế bằng API PostgreSQL ở tính năng tiếp theo)
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
    status: "CONFIRMED",
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
    facilityId: 2,
    subCourtId: 1,
    subCourtName: "Sân Padel Số 1",
    customerName: "Hoàng Minh Quân",
    customerPhone: "0909123888",
    date: new Date().toISOString().split('T')[0],
    timeSlot: "20:00 - 21:00",
    totalPrice: 350000,
    paymentMethod: "Chuyển khoản VietQR",
    paymentStatus: "PAID",
    status: "CHECKED_IN",
    note: "Khách quen CLB, đã check-in vào sân"
  }
];

const FACILITY_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80"
];

export default function OwnerDashboard({ currentUser, onBackToHome, onLogout, onOpenAuth }) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'courts' | 'schedule' | 'finance' | 'settings'

  const isAuthorizedOwner = Boolean(currentUser && currentUser.role === 'OWNER');

  // State dữ liệu thực từ PostgreSQL
  const [sportTypes, setSportTypes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState('');

  const [subCourts, setSubCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [courtSaving, setCourtSaving] = useState(false);
  const [courtsError, setCourtsError] = useState('');

  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilitySaving, setFacilitySaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Form controlled state cho Cài đặt cơ sở
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    sport_type_id: '',
    owner_name: '',
    owner_phone: '',
    ownerEmail: '',
    address: '',
    area: '',
    price_per_slot: 0,
    description: '',
    operational_status: 'ACTIVE',
    business_name: '',
    tax_code: '',
    bank_name: '',
    bank_account_no: '',
    bank_account_name: ''
  });

  const getToken = () => {
    return (
      localStorage.getItem('sportsbooking_token') ||
      sessionStorage.getItem('sportsbooking_token') ||
      ''
    );
  };

  const ownerRequest = useCallback(async (path, options = {}) => {
    const token = getToken();
    if (!token) throw new Error('Không tìm thấy JWT. Vui lòng đăng nhập lại bằng tài khoản OWNER.');
    const response = await fetch(`http://localhost:5000/api/owner${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      throw new Error(payload.message || `API trả về HTTP ${response.status}`);
    }
    return payload;
  }, []);

  const mapFacility = useCallback((f) => {
    const idNum = Number(f.court_id);
    return {
      id: idNum,
      name: f.name,
      sportTypeId: Number(f.sport_type_id),
      category: f.sport_type_name || 'THỂ THAO',
      ownerName: f.owner_name || currentUser?.fullName || 'Chủ sân',
      ownerPhone: f.owner_phone || '',
      ownerEmail: f.owner_email || currentUser?.email || '',
      address: f.address || '',
      city: f.area || 'TP. Hồ Chí Minh',
      description: f.description || '',
      pricePerSlot: Number(f.price_per_slot || 0),
      operationalStatus: f.operational_status || 'ACTIVE',
      isVisible: Boolean(f.is_visible),
      businessName: f.business_name || '',
      taxCode: f.tax_code || '',
      bankName: f.bank_name || '',
      bankAccountNo: f.bank_account_no || '',
      bankAccountName: f.bank_account_name || '',
      openTime: '06:00 - 22:00',
      monthlyRevenue: 0,
      totalBookings: 0,
      occupancyRate: 0,
      rating: '4.9',
      imageUrl: FACILITY_FALLBACK_IMAGES[(idNum - 1) % FACILITY_FALLBACK_IMAGES.length]
    };
  }, [currentUser?.email, currentUser?.fullName]);

  const mapCourt = (item) => ({
    id: Number(item.sub_court_id),
    facilityId: Number(item.court_id),
    name: item.name,
    sportTypeId: Number(item.sport_type_id),
    sportType: item.sport_name || 'Khác',
    courtType: item.description || '',
    surfaceType: item.surface_type || '',
    priceNormal: Number(item.normal_price),
    pricePeak: Number(item.peak_price),
    status: item.status,
    amenities: item.amenities || [],
    imageUrl: item.image_url || 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80',
    isVisible: Boolean(item.is_visible)
  });

  const loadFacilities = useCallback(async (preferredFacilityId = null) => {
    setFacilitiesLoading(true);
    setFacilitiesError('');
    try {
      const payload = await ownerRequest('/facilities');
      const mapped = (payload.data || []).map(mapFacility);
      setFacilities(mapped);
      setSelectedFacilityId((prev) => {
        const candidate = preferredFacilityId ?? prev;
        if (candidate && mapped.some(f => f.id === Number(candidate))) {
          return Number(candidate);
        }
        return mapped[0]?.id || null;
      });
    } catch (error) {
      setFacilitiesError(error.message);
      setFacilities([]);
    } finally {
      setFacilitiesLoading(false);
    }
  }, [mapFacility, ownerRequest]);

  const loadCourts = useCallback(async () => {
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
  }, [ownerRequest]);

  const loadSportTypes = useCallback(async () => {
    try {
      const payload = await ownerRequest('/sport-types');
      setSportTypes(payload.data || []);
    } catch {
      setSportTypes([]);
    }
  }, [ownerRequest]);

  useEffect(() => {
    if (!isAuthorizedOwner) {
      setFacilitiesLoading(false);
      setCourtsLoading(false);
      return;
    }
    loadSportTypes();
    loadFacilities();
    loadCourts();
  }, [isAuthorizedOwner, currentUser?.id, loadSportTypes, loadFacilities, loadCourts]);

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

  useEffect(() => {
    localStorage.setItem('sportsbooking_owner_bookings', JSON.stringify(bookings));
  }, [bookings]);

  // Current active facility object
  const currentFacility = facilities.find(f => f.id === selectedFacilityId) || facilities[0] || null;

  // Đồng bộ form cài đặt khi đổi cụm sân hoặc tải lại dữ liệu từ PostgreSQL
  useEffect(() => {
    if (!currentFacility) return;
    setSettingsForm({
      name: currentFacility.name || '',
      sport_type_id: String(currentFacility.sportTypeId || ''),
      owner_name: currentFacility.ownerName || '',
      owner_phone: currentFacility.ownerPhone || '',
      ownerEmail: currentFacility.ownerEmail || '',
      address: currentFacility.address || '',
      area: currentFacility.city || '',
      price_per_slot: currentFacility.pricePerSlot || 0,
      description: currentFacility.description || '',
      operational_status: currentFacility.operationalStatus || 'ACTIVE',
      business_name: currentFacility.businessName || '',
      tax_code: currentFacility.taxCode || '',
      bank_name: currentFacility.bankName || '',
      bank_account_no: currentFacility.bankAccountNo || '',
      bank_account_name: currentFacility.bankAccountName || ''
    });
  }, [
    currentFacility?.id,
    currentFacility?.name,
    currentFacility?.sportTypeId,
    currentFacility?.ownerName,
    currentFacility?.ownerPhone,
    currentFacility?.ownerEmail,
    currentFacility?.address,
    currentFacility?.city,
    currentFacility?.pricePerSlot,
    currentFacility?.description,
    currentFacility?.operationalStatus,
    currentFacility?.businessName,
    currentFacility?.taxCode,
    currentFacility?.bankName,
    currentFacility?.bankAccountNo,
    currentFacility?.bankAccountName
  ]);

  // Sub-courts belonging to current facility
  const currentSubCourts = currentFacility
    ? subCourts.filter(c => c.facilityId === currentFacility.id)
    : [];

  // Danh sách bộ môn hiển thị của cụm sân
  const facilitySports = currentFacility
    ? Array.from(new Set([
        ...currentSubCourts.map(c => c.sportType).filter(Boolean),
        currentFacility.category
      ].filter(Boolean)))
    : [];

  // Filtered sub-courts for Courts tab
  const filteredSubCourts = currentSubCourts.filter(c => {
    if (courtSportFilter === 'ALL') return true;
    return c.sportType.toLowerCase() === courtSportFilter.toLowerCase();
  });

  // Bookings belonging to current facility
  const currentBookings = currentFacility
    ? bookings.filter(b => b.facilityId === currentFacility.id)
    : [];

  // Bookings for selected schedule date
  const scheduleBookings = currentBookings.filter(b => b.date === selectedScheduleDate);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Switch facility handler
  const handleSelectFacility = (facId) => {
    const idNum = Number(facId);
    setSelectedFacilityId(idNum);
    setCourtSportFilter('ALL');
    const found = facilities.find(f => f.id === idNum);
    if (found) showToast(`Đã chuyển sang quản lý cụm sân: ${found.name}`);
  };

  // Tạo cụm sân mới trong PostgreSQL
  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (facilitySaving) return;
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get('facilityName') || '').trim(),
      sport_type_id: Number(form.get('sportTypeId')),
      address: String(form.get('address') || '').trim(),
      area: String(form.get('area') || '').trim() || 'TP. Hồ Chí Minh',
      description: String(form.get('description') || '').trim(),
      price_per_slot: Number(form.get('pricePerSlot') || 0)
    };
    setFacilitySaving(true);
    try {
      const payload = await ownerRequest('/facilities', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const createdId = payload.data?.court_id ? Number(payload.data.court_id) : null;
      await loadFacilities(createdId);
      setShowFacilityModal(false);
      showToast(payload.message || 'Tạo cụm sân mới thành công!');
    } catch (error) {
      showToast(`Tạo cụm sân thất bại: ${error.message}`);
    } finally {
      setFacilitySaving(false);
    }
  };

  // Cập nhật trạng thái sân con trong PostgreSQL
  const handleToggleCourtStatus = async (courtId) => {
    const court = subCourts.find(c => c.id === courtId);
    if (!court) return;
    const payload = court.status === 'ACTIVE'
      ? { status: 'MAINTENANCE' }
      : { status: 'ACTIVE', is_visible: true };
    try {
      await ownerRequest(`/courts/${courtId}`, { method: 'PUT', body: JSON.stringify(payload) });
      await loadCourts();
      showToast(`Đã cập nhật trạng thái sân thành ${payload.status}.`);
    } catch (error) {
      showToast(`Không thể cập nhật: ${error.message}`);
    }
  };

  // Xóa sân con khỏi PostgreSQL (hoặc đóng & ẩn nếu đã có lịch sử đặt)
  const handleDeleteCourt = async (court) => {
    if (!court) return;
    if (!window.confirm(`Bạn có chắc muốn xóa sân "${court.name}"?`)) return;
    try {
      const payload = await ownerRequest(`/courts/${court.id}`, { method: 'DELETE' });
      await loadCourts();
      showToast(payload.message || 'Đã xóa sân con thành công!');
    } catch (error) {
      showToast(`Xóa thất bại: ${error.message}`);
    }
  };

  const handleSaveCourt = async (e) => {
    e.preventDefault();
    if (courtSaving) return;
    const form = new FormData(e.currentTarget);
    const sportTypeId = Number(form.get('sportTypeId'));
    if (!Number.isSafeInteger(sportTypeId) || sportTypeId <= 0) {
      showToast('Vui lòng chọn bộ môn thể thao hợp lệ.');
      return;
    }
    const normal = Number(form.get('priceNormal'));
    const peak = Number(form.get('pricePeak'));
    if (!Number.isFinite(normal) || normal < 0 || !Number.isFinite(peak) || peak < normal) {
      showToast('Giá cao điểm phải lớn hơn hoặc bằng giá thường.');
      return;
    }
    const amenitiesRaw = String(form.get('amenitiesText') || '');
    const amenities = amenitiesRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const body = {
      name: String(form.get('courtName') || '').trim(),
      sport_type_id: sportTypeId,
      description: String(form.get('courtType') || '').trim(),
      surface_type: String(form.get('surfaceType') || '').trim(),
      amenities,
      normal_price: normal,
      peak_price: peak,
      image_url: String(form.get('imageUrl') || '').trim()
    };

    if (editingCourt) {
      body.status = String(form.get('status') || editingCourt.status);
      body.is_visible = form.get('isVisible') === 'on';
    } else {
      if (!currentFacility) {
        showToast('Vui lòng tạo cụm sân trước khi thêm sân con.');
        return;
      }
      body.court_id = currentFacility.id;
    }

    setCourtSaving(true);
    try {
      await ownerRequest(editingCourt ? `/courts/${editingCourt.id}` : '/courts', {
        method: editingCourt ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      await loadCourts();
      setShowAddCourtModal(false);
      showToast(editingCourt ? 'Đã lưu thay đổi vào PostgreSQL.' : 'Đã thêm sân mới vào PostgreSQL.');
    } catch (error) {
      showToast(`Lưu thất bại: ${error.message}`);
    } finally {
      setCourtSaving(false);
    }
  };

  // Lưu cấu hình cơ sở + thông tin ngân hàng chủ sân
  const handleSaveFacilitySettings = async (e) => {
    e.preventDefault();
    if (!currentFacility || settingsSaving) return;
    setSettingsSaving(true);
    try {
      const payload = await ownerRequest(`/facilities/${currentFacility.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: settingsForm.name.trim(),
          sport_type_id: Number(settingsForm.sport_type_id),
          address: settingsForm.address.trim(),
          area: settingsForm.area.trim(),
          description: settingsForm.description.trim(),
          price_per_slot: Number(settingsForm.price_per_slot || 0),
          operational_status: settingsForm.operational_status,
          owner_name: settingsForm.owner_name.trim(),
          owner_phone: settingsForm.owner_phone.trim(),
          business_name: settingsForm.business_name.trim(),
          tax_code: settingsForm.tax_code.trim(),
          bank_name: settingsForm.bank_name.trim(),
          bank_account_no: settingsForm.bank_account_no.trim(),
          bank_account_name: settingsForm.bank_account_name.trim().toUpperCase()
        })
      });
      await loadFacilities(currentFacility.id);
      showToast(payload.message || 'Đã lưu cấu hình cụm sân vào PostgreSQL!');
    } catch (error) {
      showToast(`Lưu cấu hình thất bại: ${error.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Update booking status (sẽ đồng bộ API ở tính năng 3)
  const handleUpdateBookingStatus = (bookingId, newStatus) => {
    setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b)));
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

  // Màn hình yêu cầu đăng nhập tài khoản OWNER nếu người dùng chưa đăng nhập đúng vai trò
  if (!isAuthorizedOwner) {
    return (
      <div className="min-vh-100 bg-light d-flex flex-column justify-content-center align-items-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
        <div className="card border-0 shadow-lg rounded-4 p-4 p-md-5 text-center bg-white" style={{ maxWidth: '520px', width: '100%' }}>
          <div className="mx-auto mb-3 d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '72px', height: '72px' }}>
            <i className="bi bi-buildings-fill fs-1"></i>
          </div>
          <h4 className="fw-bold text-brand-dark mb-2">Kênh Quản Lý Dành Cho Chủ Sân</h4>
          <p className="text-muted small mb-4">
            {currentUser
              ? `Tài khoản hiện tại (${currentUser.email}) đang ở vai trò ${currentUser.role}. Vui lòng đăng nhập bằng tài khoản OWNER để quản lý cụm sân, sân con và lịch đặt trong PostgreSQL.`
              : 'Vui lòng đăng nhập bằng tài khoản Chủ sân (OWNER) để truy cập bảng điều khiển quản lý cụm sân và sân thi đấu.'}
          </p>
          <div className="d-grid gap-2">
            {onOpenAuth && (
              <button
                type="button"
                className="btn btn-brand py-2 fw-semibold rounded-3"
                onClick={() => onOpenAuth('login')}
              >
                <i className="bi bi-box-arrow-in-right me-2"></i>Đăng nhập tài khoản Chủ sân
              </button>
            )}
            {onOpenAuth && (
              <button
                type="button"
                className="btn btn-outline-success py-2 fw-semibold rounded-3"
                onClick={() => onOpenAuth('register-owner')}
              >
                <i className="bi bi-building-add me-2"></i>Đăng ký trở thành Đối tác Chủ sân
              </button>
            )}
            <button
              type="button"
              className="btn btn-light py-2 text-secondary rounded-3"
              onClick={onBackToHome}
            >
              <i className="bi bi-arrow-left me-2"></i>Quay lại Trang đặt sân
            </button>
          </div>
        </div>
      </div>
    );
  }

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

            {/* Facility Selector Dropdown (Multi-Vendor from PostgreSQL) */}
            <div className="d-flex align-items-center gap-2 flex-grow-1 flex-md-grow-0 justify-content-center">
              <div className="input-group input-group-sm shadow-sm" style={{ maxWidth: '420px' }}>
                <span className="input-group-text bg-light text-brand fw-bold border-end-0">
                  <i className="bi bi-geo-alt-fill me-1"></i> Cụm sân:
                </span>
                <select
                  className="form-select fw-semibold border-start-0 bg-white"
                  value={selectedFacilityId || ''}
                  disabled={facilitiesLoading || facilities.length === 0}
                  onChange={(e) => handleSelectFacility(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  {facilitiesLoading && <option value="">Đang tải cụm sân...</option>}
                  {!facilitiesLoading && facilities.length === 0 && <option value="">Chưa có cụm sân nào</option>}
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
                  onClick={() => setShowFacilityModal(true)}
                >
                  <i className="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>

            {/* Quick Actions & User Profile */}
            <div className="d-flex align-items-center gap-2 ms-auto">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-3"
                onClick={onBackToHome}
                title="Quay lại giao diện người đặt sân thể thao"
              >
                <i className="bi bi-box-arrow-up-right"></i>
                <span className="d-none d-sm-inline">Xem Trang Khách Đặt</span>
              </button>

              <div className="d-flex align-items-center gap-2 ps-2 border-start">
                <div
                  className="rounded-circle bg-brand-dark text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '34px', height: '34px' }}
                >
                  {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'O'}
                </div>
                <div className="d-none d-md-block text-start lh-1">
                  <div className="small fw-bold text-dark">{currentUser?.fullName || currentFacility?.ownerName}</div>
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

      {/* Nếu chủ sân chưa có cụm sân nào trong PostgreSQL */}
      {!facilitiesLoading && !facilitiesError && !currentFacility ? (
        <main className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white" style={{ maxWidth: '520px' }}>
            <i className="bi bi-building-add text-brand fs-1 mb-3"></i>
            <h5 className="fw-bold text-dark">Bạn chưa có cụm sân nào</h5>
            <p className="text-muted small mb-4">
              Hãy tạo cụm sân thể thao đầu tiên của bạn để bắt đầu cấu hình sân con và nhận lịch đặt từ khách hàng.
            </p>
            <button
              type="button"
              className="btn btn-brand rounded-pill px-4"
              onClick={() => setShowFacilityModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>Tạo cụm sân ngay
            </button>
          </div>
        </main>
      ) : (
        <>
          {/* ========================================================
              2. FACILITY HERO BANNER & SUB-NAV TABS
              ======================================================== */}
          {currentFacility && (
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
                          <span className={`badge ${currentFacility.operationalStatus === 'ACTIVE' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'} border`}>
                            {currentFacility.operationalStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                          </span>
                          {!currentFacility.isVisible && (
                            <span className="badge bg-warning-subtle text-dark border border-warning-subtle">
                              <i className="bi bi-hourglass-split me-1"></i>Chờ Admin duyệt hiển thị
                            </span>
                          )}
                        </div>
                        <p className="text-muted small mb-1 d-flex align-items-center gap-1">
                          <i className="bi bi-geo-alt text-brand"></i>
                          <span>{currentFacility.address || 'Chưa cập nhật địa chỉ'}</span>
                        </p>
                        <div className="d-flex align-items-center gap-3 small text-muted flex-wrap">
                          <span><i className="bi bi-clock me-1 text-secondary"></i> Giờ mở cửa: {currentFacility.openTime}</span>
                          <span><i className="bi bi-telephone me-1 text-secondary"></i> Hotline: {currentFacility.ownerPhone || 'Chưa cập nhật'}</span>
                          <span><i className="bi bi-diagram-3 me-1 text-secondary"></i> Môn: {facilitySports.join(', ')}</span>
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
                        disabled={currentSubCourts.length === 0}
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
          )}

          {/* ========================================================
              3. MAIN TAB CONTENT AREA
              ======================================================== */}
          <main className="flex-grow-1 py-4">
            <div className="container-fluid px-3 px-lg-4">
              {facilitiesError && (
                <div className="alert alert-danger d-flex align-items-center justify-content-between">
                  <span>{facilitiesError}</span>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => loadFacilities()}>Thử lại</button>
                </div>
              )}

              {currentFacility && activeTab === 'overview' && (
                <div>
                  <div className="alert alert-warning small">
                    Các số liệu doanh thu và lịch đặt bên dưới đang hiển thị dữ liệu demo; quản lý cụm sân, sân con và cài đặt cơ sở đã kết nối trực tiếp PostgreSQL.
                  </div>

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
                        <div className="small text-muted">Thống kê đặt sân theo kỳ</div>
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
                        <div className="small text-muted">Cụm: {currentFacility.name}</div>
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
                            <span className="text-warning fw-semibold">{currentSubCourts.length - activeCourtsCount} sân đang bảo trì / đóng</span>
                          ) : (
                            <span className="text-success fw-semibold">Tất cả sân sẵn sàng đón khách</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart & Quick Actions Section */}
                  <div className="row g-4 mb-4">
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
                      </div>
                    </div>

                    <div className="col-lg-5">
                      <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100 d-flex flex-column">
                        <h6 className="fw-bold text-dark mb-3">Phân bổ sân theo bộ môn</h6>

                        <div className="mb-4">
                          {facilitySports.map((sport, idx) => {
                            const count = currentSubCourts.filter(sc => sc.sportType === sport).length;
                            const ratio = currentSubCourts.length > 0 ? Math.round((count / currentSubCourts.length) * 100) : 100;
                            return (
                              <div key={idx} className="mb-3">
                                <div className="d-flex justify-content-between small fw-semibold mb-1">
                                  <span>{sport}</span>
                                  <span className="text-brand">{count} sân ({ratio}%)</span>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                  <div className="progress-bar bg-success" role="progressbar" style={{ width: `${ratio}%` }}></div>
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
                              disabled={currentSubCourts.length === 0}
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
                              onClick={() => setActiveTab('settings')}
                            >
                              <span><i className="bi bi-gear me-2"></i> Cập nhật cấu hình cơ sở & VietQR</span>
                              <i className="bi bi-chevron-right small"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Today Bookings Preview */}
                  <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <div>
                        <h6 className="fw-bold text-dark mb-0">Lượt đặt sân sắp tới hôm nay ({currentFacility.name})</h6>
                        <span className="text-muted small">Theo dõi nhanh các lượt đặt sân trong ngày</span>
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
                                Hôm nay chưa có lịch đặt nào tại cơ sở này.
                              </td>
                            </tr>
                          ) : (
                            scheduleBookings.map((b) => (
                              <tr key={b.id}>
                                <td><span className="fw-bold text-dark">{b.id}</span></td>
                                <td>
                                  <div className="fw-semibold text-dark">{b.customerName}</div>
                                  <span className="text-muted small">{b.customerPhone}</span>
                                </td>
                                <td><span className="badge bg-light text-dark border me-1">{b.subCourtName}</span></td>
                                <td><span className="badge bg-success-subtle text-success fw-bold px-2 py-1">{b.timeSlot}</span></td>
                                <td><strong className="text-brand-dark">{b.totalPrice?.toLocaleString('vi-VN')}đ</strong></td>
                                <td><span className="small text-muted">{b.paymentMethod}</span></td>
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
                  TAB 2: QUẢN LÝ SÂN (COURTS MANAGEMENT - LIVE POSTGRESQL)
                  ========================================== */}
              {currentFacility && activeTab === 'courts' && (
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
                      <select
                        className="form-select form-select-sm"
                        value={courtSportFilter}
                        onChange={(e) => setCourtSportFilter(e.target.value)}
                        style={{ width: '200px' }}
                      >
                        <option value="ALL">Tất cả môn</option>
                        {sportTypes.map((st) => (
                          <option key={st.sport_type_id} value={st.name}>{st.name}</option>
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
                  {courtsError && (
                    <div className="alert alert-danger d-flex align-items-center justify-content-between">
                      <span>{courtsError}</span>
                      <button className="btn btn-sm btn-outline-danger" onClick={loadCourts}>Thử lại</button>
                    </div>
                  )}

                  <div className="row g-4">
                    {!courtsLoading && filteredSubCourts.length === 0 ? (
                      <div className="col-12 text-center py-5">
                        <div className="bg-white p-5 rounded-3 shadow-sm">
                          <i className="bi bi-dribbble text-muted fs-1 mb-2 d-block"></i>
                          <h6>Chưa có sân con nào thuộc cụm sân hoặc phù hợp bộ lọc.</h6>
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
                              <div className="position-absolute top-0 end-0 m-2 d-flex gap-1">
                                {!court.isVisible && (
                                  <span className="badge bg-secondary shadow-sm">Ẩn</span>
                                )}
                                <span className={`badge ${
                                  court.status === 'ACTIVE' ? 'bg-success' :
                                  court.status === 'CLOSED' ? 'bg-danger' : 'bg-warning text-dark'
                                } shadow-sm`}>
                                  {court.status === 'ACTIVE' ? '🟢 Đang đón khách' :
                                   court.status === 'CLOSED' ? '🔴 Đã đóng' : '🟡 Đang bảo trì'}
                                </span>
                              </div>
                            </div>

                            {/* Court Body */}
                            <div className="card-body p-3 d-flex flex-column">
                              <h6 className="fw-bold text-dark mb-1">{court.name}</h6>
                              <div className="small text-muted mb-2">
                                <i className="bi bi-layers me-1 text-secondary"></i> {court.courtType || 'Tiêu chuẩn'}
                              </div>
                              <div className="small text-muted mb-3">
                                <i className="bi bi-shield-check me-1 text-success"></i> {court.surfaceType || 'Mặt sân chuẩn thi đấu'}
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
                                    onClick={() => handleDeleteCourt(court)}
                                    title="Xóa sân con"
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
              {currentFacility && activeTab === 'schedule' && (
                <div>
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
                          disabled={currentSubCourts.length === 0}
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
                          {currentSubCourts.length === 0 ? (
                            <tr>
                              <td colSpan="2" className="text-muted py-4">Chưa có sân con nào trong cụm sân này.</td>
                            </tr>
                          ) : timeSlotsList.map((slot) => (
                            <tr key={slot}>
                              <td className="fw-semibold text-secondary small bg-light text-nowrap">
                                <i className="bi bi-clock me-1 text-muted"></i>{slot}
                              </td>
                              {currentSubCourts.map(court => {
                                const bookingMatch = scheduleBookings.find(b =>
                                  b.subCourtId === court.id &&
                                  b.timeSlot === slot &&
                                  b.status !== 'CANCELLED'
                                );

                                if (court.status !== 'ACTIVE') {
                                  return (
                                    <td key={court.id} className="bg-secondary-subtle text-muted small p-2" title="Sân không hoạt động">
                                      <span className="small text-secondary">{court.status === 'CLOSED' ? 'Đã đóng' : 'Bảo trì'}</span>
                                    </td>
                                  );
                                }

                                if (bookingMatch) {
                                  return (
                                    <td
                                      key={court.id}
                                      className="p-1"
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

                                return (
                                  <td key={court.id} className="p-1">
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
                </div>
              )}

              {/* ==========================================
                  TAB 4: DOANH THU & ĐỐI SOÁT (FINANCE)
                  ========================================== */}
              {currentFacility && activeTab === 'finance' && (
                <div>
                  <div className="row g-4 mb-4">
                    <div className="col-lg-4">
                      <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
                        <span className="text-muted small fw-semibold">TỔNG THU THÁNG HIỆN TẠI</span>
                        <h2 className="fw-bold text-brand-dark mt-2 mb-1">
                          {currentFacility.monthlyRevenue.toLocaleString('vi-VN')}đ
                        </h2>
                        <p className="text-muted small mb-4">Tài khoản thụ hưởng: {currentFacility.bankName || 'Chưa cấu hình'}</p>

                        <button
                          className="btn btn-brand w-100 mt-auto py-2 rounded-3 shadow-sm"
                          onClick={() => showToast(`Đã ghi nhận yêu cầu đối soát về ${currentFacility.bankName || 'Ngân hàng'} (${currentFacility.bankAccountNo || 'Chưa cập nhật STK'}).`)}
                        >
                          <i className="bi bi-wallet2 me-2"></i> Yêu Cầu Rút Tiền Về Ngân Hàng
                        </button>
                      </div>
                    </div>

                    <div className="col-lg-8">
                      <div className="card border-0 shadow-sm rounded-3 p-4 bg-white h-100">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <h6 className="fw-bold text-dark mb-0">Lịch sử các kỳ đối soát & Chuyển khoản định kỳ</h6>
                        </div>

                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small text-muted">
                              <tr>
                                <th>MÃ KỲ ĐỐI SOÁT</th>
                                <th>KHOẢNG THỜI GIAN</th>
                                <th>TÀI KHOẢN NGÂN HÀNG</th>
                                <th>TRẠNG THÁI</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="fw-bold">DS-2026-W44</td>
                                <td className="small text-muted">27/10 - 02/11/2026</td>
                                <td className="small">{currentFacility.bankName || '—'} {currentFacility.bankAccountNo ? `••••${currentFacility.bankAccountNo.slice(-4)}` : ''}</td>
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
                  TAB 5: CÀI ĐẶT CƠ SỞ (SETTINGS - LIVE POSTGRESQL)
                  ========================================== */}
              {currentFacility && activeTab === 'settings' && (
                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-3 p-4 bg-white">
                      <h6 className="fw-bold text-dark mb-3">Hồ sơ Cụm Sân & Chủ Sân Đối Tác (Lưu vào PostgreSQL)</h6>

                      <form onSubmit={handleSaveFacilitySettings}>
                        <div className="row g-3 mb-3">
                          <div className="col-md-7">
                            <label className="form-label small fw-semibold">Tên Cụm Sân / Tổ Hợp Thể Thao (*)</label>
                            <input
                              type="text"
                              className="form-control"
                              required
                              value={settingsForm.name}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label small fw-semibold">Bộ Môn Chính</label>
                            <select
                              className="form-select"
                              value={settingsForm.sport_type_id}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, sport_type_id: e.target.value }))}
                            >
                              {sportTypes.map(st => (
                                <option key={st.sport_type_id} value={st.sport_type_id}>{st.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Người Đại Diện / Chủ Sân</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.owner_name}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, owner_name: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Số Điện Thoại Hotline</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.owner_phone}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, owner_phone: e.target.value }))}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Email Tài Khoản</label>
                            <input
                              type="email"
                              className="form-control bg-light"
                              value={settingsForm.ownerEmail}
                              readOnly
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Trạng Thái Vận Hành</label>
                            <select
                              className="form-select"
                              value={settingsForm.operational_status}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, operational_status: e.target.value }))}
                            >
                              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                              <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
                            </select>
                          </div>

                          <div className="col-12">
                            <label className="form-label small fw-semibold">Địa Chỉ Chi Tiết (*)</label>
                            <input
                              type="text"
                              className="form-control"
                              required
                              value={settingsForm.address}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                            />
                          </div>

                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Khu Vực / Thành Phố</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.area}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, area: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label small fw-semibold">Giá Tham Khảo / Slot (VNĐ)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              step="10000"
                              value={settingsForm.price_per_slot}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, price_per_slot: e.target.value }))}
                            />
                          </div>

                          <div className="col-12">
                            <label className="form-label small fw-semibold">Tiện Ích & Mô Tả Cơ Sở (cách nhau bằng dấu phẩy)</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.description}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Ví dụ: Bãi đỗ xe, Đèn LED ban đêm, Phòng tắm nóng lạnh"
                            />
                          </div>
                        </div>

                        <h6 className="fw-bold text-dark mt-4 mb-3 border-top pt-3">Hồ Sơ Doanh Nghiệp & Tài Khoản Ngân Hàng</h6>
                        <div className="row g-3 mb-4">
                          <div className="col-md-7">
                            <label className="form-label small fw-semibold">Tên Doanh Nghiệp / Hộ Kinh Doanh</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.business_name}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, business_name: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-5">
                            <label className="form-label small fw-semibold">Mã Số Thuế</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.tax_code}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, tax_code: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Ngân Hàng</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.bank_name}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, bank_name: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Số Tài Khoản</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.bank_account_no}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, bank_account_no: e.target.value }))}
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label small fw-semibold">Chủ Tài Khoản (In hoa)</label>
                            <input
                              type="text"
                              className="form-control"
                              value={settingsForm.bank_account_name}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, bank_account_name: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="text-end">
                          <button type="submit" disabled={settingsSaving} className="btn btn-brand px-4 rounded-3 shadow-sm">
                            {settingsSaving ? 'Đang lưu...' : 'Lưu Cấu Hình Cơ Sở'}
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
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`2|99|${settingsForm.bank_account_no}|${settingsForm.bank_name}|0|0|SPORTSBOOKING`)}`}
                          alt="VietQR"
                          className="img-fluid rounded"
                          style={{ maxWidth: '160px' }}
                        />
                      </div>
                      <div className="small fw-bold text-dark">{settingsForm.bank_account_name || 'CHỦ TÀI KHOẢN'}</div>
                      <div className="small text-muted">
                        {settingsForm.bank_name || 'Chưa có ngân hàng'} - {settingsForm.bank_account_no || 'Chưa có STK'}
                      </div>
                      <p className="text-muted small mt-2" style={{ fontSize: '0.75rem' }}>
                        Mã QR cập nhật trực tiếp theo thông tin tài khoản bạn nhập để khách quét chuyển khoản khi đặt sân.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}

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
                    <div className="col-md-7">
                      <label className="form-label small fw-semibold">Tên Sân Con (*)</label>
                      <input
                        type="text"
                        name="courtName"
                        className="form-control"
                        required
                        defaultValue={editingCourt ? editingCourt.name : `Sân Số ${currentSubCourts.length + 1}`}
                        placeholder="Ví dụ: Sân Padel 3 (Panoramic VIP)"
                      />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold">Bộ Môn Thể Thao (*)</label>
                      <select
                        name="sportTypeId"
                        className="form-select"
                        required
                        defaultValue={editingCourt ? editingCourt.sportTypeId : (currentFacility?.sportTypeId || sportTypes[0]?.sport_type_id || '')}
                      >
                        {sportTypes.map(st => (
                          <option key={st.sport_type_id} value={st.sport_type_id}>
                            {st.name}
                          </option>
                        ))}
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

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Tiện Ích Sân (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        name="amenitiesText"
                        className="form-control"
                        defaultValue={editingCourt ? (editingCourt.amenities || []).join(', ') : 'Đèn LED 400W, Nước uống, Bãi đỗ xe'}
                        placeholder="Ví dụ: Đèn LED 400W, Mái che 100%, Phòng thay đồ"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Giá Thuê Giờ Thường (VNĐ/giờ) (*)</label>
                      <input
                        type="number"
                        name="priceNormal"
                        className="form-control"
                        required
                        min="0"
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
                        min="0"
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

                    {editingCourt && (
                      <>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">Trạng Thái Sân</label>
                          <select name="status" className="form-select" defaultValue={editingCourt.status}>
                            <option value="ACTIVE">Đang đón khách (ACTIVE)</option>
                            <option value="MAINTENANCE">Đang bảo trì (MAINTENANCE)</option>
                            <option value="CLOSED">Đã đóng (CLOSED)</option>
                          </select>
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                          <div className="form-check mb-2">
                            <input
                              type="checkbox"
                              name="isVisible"
                              id="subCourtVisible"
                              className="form-check-input"
                              defaultChecked={editingCourt.isVisible}
                            />
                            <label htmlFor="subCourtVisible" className="form-check-label small fw-semibold">
                              Hiển thị sân cho khách đặt
                            </label>
                          </div>
                        </div>
                      </>
                    )}
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
      {showWalkInModal && currentFacility && (
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
                  facilityId: currentFacility.id,
                  subCourtId,
                  subCourtName: courtObj?.name || 'Sân thi đấu',
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
                showToast(`Đã nhận khách ${customerName} tại ${courtObj?.name || 'sân'} khung giờ ${timeSlot}!`);
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
                      <input type="text" name="customerName" className="form-control" required placeholder="Nguyễn Văn A" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Số Điện Thoại (*)</label>
                      <input type="tel" name="customerPhone" className="form-control" required placeholder="0901234567" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Ngày Chơi</label>
                      <input type="date" name="date" className="form-control" defaultValue={selectedScheduleDate} />
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
                        <option value="Thanh toán sau">Thanh toán sau</option>
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
                <h5 className="modal-title fw-bold">Chi Tiết Đơn Đặt Sân: {selectedBookingDetail.id}</h5>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBookingDetail(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: TẠO CỤM SÂN / CƠ SỞ MỚI
          ======================================================== */}
      {showFacilityModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-building-add me-2"></i>
                  Thêm Cụm Sân / Cơ Sở Kinh Doanh Mới
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowFacilityModal(false)}
                ></button>
              </div>

              <form onSubmit={handleCreateFacility}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label small fw-semibold">Tên Cụm Sân (*)</label>
                      <input
                        type="text"
                        name="facilityName"
                        className="form-control"
                        required
                        placeholder="Ví dụ: The Yard Quận 2 - Cơ sở 2"
                      />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold">Bộ Môn Thể Thao Chính (*)</label>
                      <select name="sportTypeId" className="form-select" required defaultValue={sportTypes[0]?.sport_type_id || 1}>
                        {sportTypes.map(st => (
                          <option key={st.sport_type_id} value={st.sport_type_id}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Địa Chỉ Chi Tiết (*)</label>
                      <input
                        type="text"
                        name="address"
                        className="form-control"
                        required
                        placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Thành Phố / Khu Vực</label>
                      <input
                        type="text"
                        name="area"
                        className="form-control"
                        defaultValue="TP. Hồ Chí Minh"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Giá Thuê Tham Khảo (VNĐ/slot) (*)</label>
                      <input
                        type="number"
                        name="pricePerSlot"
                        className="form-control"
                        required
                        min="0"
                        step="10000"
                        defaultValue="200000"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Tiện Ích & Mô Tả Cụm Sân</label>
                      <input
                        type="text"
                        name="description"
                        className="form-control"
                        defaultValue="Bãi đỗ xe, Đèn Led ban đêm, Phòng thay đồ"
                        placeholder="Ví dụ: Bãi đỗ ô tô, Phòng tắm nóng lạnh, Quầy nước"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowFacilityModal(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={facilitySaving} className="btn btn-brand px-4">
                    {facilitySaving ? 'Đang tạo...' : 'Tạo Cụm Sân'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
