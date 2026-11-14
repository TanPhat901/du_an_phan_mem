import { API_BASE } from '../utils/apiConfig';
import React, { useState, useEffect, useCallback } from 'react';
import AccountMenu from './AccountMenu';

const formatLocalYMD = (dateObj = new Date()) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatCompactMoney = (amount) => {
  const num = Number(amount || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}k`;
  return `${num}đ`;
};

const timeToMinutes = (hhmm) => {
  if (typeof hhmm !== 'string') return null;
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const addMinutesToHHMM = (hhmm, deltaMinutes) => {
  const base = timeToMinutes(hhmm);
  if (base === null) return '09:00';
  const target = Math.min(23 * 60 + 59, base + deltaMinutes);
  const h = Math.floor(target / 60);
  const m = target % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const estimateGeneratedSlotsCount = (openTime, closeTime, durationMinutes) => {
  const start = timeToMinutes(openTime);
  const end = timeToMinutes(closeTime);
  const step = Number(durationMinutes);
  if (start === null || end === null || !Number.isInteger(step) || step < 15 || end - start < step) {
    return 0;
  }
  return Math.min(48, Math.floor((end - start) / step));
};

export default function OwnerDashboard({
  currentUser,
  onBackToHome,
  onLogout,
  onOpenAuth,
  onOpenProfile,
  onOpenMyBookings
}) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'courts' | 'schedule' | 'finance' | 'settings'

  const isAuthorizedOwner = Boolean(currentUser && currentUser.role === 'OWNER');

  // State Cụm sân & Sân con từ PostgreSQL
  const [sportTypes, setSportTypes] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState('');

  const [subCourts, setSubCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [courtSaving, setCourtSaving] = useState(false);
  const [courtsError, setCourtsError] = useState('');

  // State Đặt sân, Ma trận khung giờ, Khóa sân & Doanh thu từ PostgreSQL
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  const [selectedScheduleDate, setSelectedScheduleDate] = useState(() => formatLocalYMD());
  const [scheduleData, setScheduleData] = useState({ timeSlots: [], bookings: [], blocks: [] });
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false);
  const [showTimeSlotsModal, setShowTimeSlotsModal] = useState(false);
  const [slotModalMode, setSlotModalMode] = useState('single'); // 'single' | 'batch'
  const [editingTimeSlot, setEditingTimeSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    startTime: '08:00',
    endTime: '09:00',
    isPeak: false,
    isActive: true
  });
  const [batchSlotForm, setBatchSlotForm] = useState({
    openTime: '06:00',
    closeTime: '22:00',
    durationMinutes: 60,
    applyPeak: true,
    peakStart: '17:00',
    peakEnd: '21:00',
    replaceExisting: false
  });
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotModalError, setSlotModalError] = useState('');

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Filter & Modals
  const [courtSportFilter, setCourtSportFilter] = useState('ALL');
  const [headerImgError, setHeaderImgError] = useState(false);
  const [failedCourtImages, setFailedCourtImages] = useState({});
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilitySaving, setFacilitySaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [editingCourt, setEditingCourt] = useState(null);

  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    subCourtId: '',
    slotId: '',
    date: formatLocalYMD(),
    customerName: '',
    customerPhone: '',
    price: 0,
    paymentMethod: 'Tiền mặt tại quầy',
    status: 'CONFIRMED',
    note: ''
  });
  const [walkInSaving, setWalkInSaving] = useState(false);
  const [walkInError, setWalkInError] = useState('');

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({
    subCourtId: '',
    slotId: '',
    date: formatLocalYMD(),
    reason: 'Bảo trì sân'
  });
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState('');

  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

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
    image_url: '',
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
    const response = await fetch(`${API_BASE}/api/owner${path}`, {
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
    const rawImage = f.image_url ? String(f.image_url).trim() : '';
    const subCover = f.sub_cover_image ? String(f.sub_cover_image).trim() : '';
    return {
      id: idNum,
      name: f.name,
      sportTypeId: Number(f.sport_type_id),
      category: f.sport_type_name || 'THỂ THAO',
      ownerName: f.owner_name || currentUser?.fullName || 'Chủ sân',
      ownerPhone: f.owner_phone || '',
      ownerEmail: f.owner_email || currentUser?.email || '',
      address: f.address || '',
      city: f.area || '',
      description: f.description || '',
      imageUrl: rawImage,
      coverImageUrl: rawImage || subCover || null,
      pricePerSlot: Number(f.price_per_slot || 0),
      operationalStatus: f.operational_status || 'ACTIVE',
      isVisible: Boolean(f.is_visible),
      businessName: f.business_name || '',
      taxCode: f.tax_code || '',
      bankName: f.bank_name || '',
      bankAccountNo: f.bank_account_no || '',
      bankAccountName: f.bank_account_name || '',
      openTime: f.open_time_range || 'Chưa thiết lập giờ',
      activeSlotCount: Number(f.active_slot_count || 0)
    };
  }, [currentUser?.email, currentUser?.fullName]);

  const mapCourt = (item) => ({
    id: Number(item.sub_court_id),
    facilityId: Number(item.court_id),
    name: item.name,
    sportTypeId: Number(item.sport_type_id),
    sportType: item.sport_name || '',
    courtType: item.description || '',
    surfaceType: item.surface_type || '',
    priceNormal: Number(item.normal_price),
    pricePeak: Number(item.peak_price),
    status: item.status,
    amenities: item.amenities || [],
    imageUrl: item.image_url ? String(item.image_url).trim() : '',
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

  const loadBookings = useCallback(async (facilityId) => {
    if (!facilityId) return;
    setBookingsLoading(true);
    setBookingsError('');
    try {
      const payload = await ownerRequest(`/bookings?courtId=${facilityId}`);
      setBookings(payload.data || []);
    } catch (error) {
      setBookingsError(error.message);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [ownerRequest]);

  const loadSchedule = useCallback(async (facilityId, dateStr) => {
    if (!facilityId || !dateStr) return;
    setScheduleLoading(true);
    try {
      const payload = await ownerRequest(`/schedule?courtId=${facilityId}&date=${dateStr}`);
      setScheduleData(payload.data || { timeSlots: [], bookings: [], blocks: [] });
    } catch {
      setScheduleData({ timeSlots: [], bookings: [], blocks: [] });
    } finally {
      setScheduleLoading(false);
    }
  }, [ownerRequest]);

  const loadTimeSlots = useCallback(async (facilityId) => {
    if (!facilityId) return;
    setTimeSlotsLoading(true);
    try {
      const payload = await ownerRequest(`/time-slots?courtId=${facilityId}`);
      setTimeSlots(payload.data || []);
    } catch {
      setTimeSlots([]);
    } finally {
      setTimeSlotsLoading(false);
    }
  }, [ownerRequest]);

  const loadAnalytics = useCallback(async (facilityId, dateStr) => {
    if (!facilityId) return;
    setAnalyticsLoading(true);
    try {
      const payload = await ownerRequest(`/analytics?courtId=${facilityId}&date=${dateStr || formatLocalYMD()}`);
      setAnalytics(payload.data || null);
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [ownerRequest]);

  const refreshOperationalData = useCallback(async (facilityId, scheduleDate) => {
    const fId = facilityId || selectedFacilityId;
    const dStr = scheduleDate || selectedScheduleDate;
    if (!fId) return;
    await Promise.all([
      loadBookings(fId),
      loadSchedule(fId, dStr),
      loadTimeSlots(fId),
      loadAnalytics(fId, dStr)
    ]);
  }, [selectedFacilityId, selectedScheduleDate, loadBookings, loadSchedule, loadTimeSlots, loadAnalytics]);

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

  const currentFacility = facilities.find(f => f.id === selectedFacilityId) || facilities[0] || null;

  // Tải Bookings, Ma trận lịch & Thống kê thật khi đổi cụm sân hoặc đổi ngày xem lịch
  useEffect(() => {
    if (!isAuthorizedOwner || !currentFacility?.id) return;
    refreshOperationalData(currentFacility.id, selectedScheduleDate);
  }, [isAuthorizedOwner, currentFacility?.id, selectedScheduleDate, refreshOperationalData]);

  // Đồng bộ form cài đặt khi đổi cụm sân hoặc tải lại dữ liệu từ PostgreSQL
  useEffect(() => {
    setHeaderImgError(false);
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
      image_url: currentFacility.imageUrl || '',
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
    currentFacility?.imageUrl,
    currentFacility?.coverImageUrl,
    currentFacility?.operationalStatus,
    currentFacility?.businessName,
    currentFacility?.taxCode,
    currentFacility?.bankName,
    currentFacility?.bankAccountNo,
    currentFacility?.bankAccountName
  ]);

  const currentSubCourts = currentFacility
    ? subCourts.filter(c => c.facilityId === currentFacility.id)
    : [];

  const facilitySports = currentFacility
    ? Array.from(new Set([
        ...currentSubCourts.map(c => c.sportType).filter(Boolean),
        currentFacility.category
      ].filter(Boolean)))
    : [];

  const filteredSubCourts = currentSubCourts.filter(c => {
    if (courtSportFilter === 'ALL') return true;
    return c.sportType.toLowerCase() === courtSportFilter.toLowerCase();
  });

  const todayYmd = formatLocalYMD();
  const todayBookings = bookings.filter(b => b.date === todayYmd);
  const pendingBookingsCount = bookings.filter(b => b.status === 'PENDING').length;
  const filteredBookingsList = bookings.filter(b => {
    if (bookingStatusFilter === 'ALL') return true;
    return b.status === bookingStatusFilter;
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleSelectFacility = (facId) => {
    const idNum = Number(facId);
    setSelectedFacilityId(idNum);
    setCourtSportFilter('ALL');
    setBookingStatusFilter('ALL');
    const found = facilities.find(f => f.id === idNum);
    if (found) showToast(`Đã chuyển sang quản lý cụm sân: ${found.name}`);
  };

  const handleCreateFacility = async (e) => {
    e.preventDefault();
    if (facilitySaving) return;
    const form = new FormData(e.currentTarget);
    const body = {
      name: String(form.get('facilityName') || '').trim(),
      sport_type_id: Number(form.get('sportTypeId')),
      address: String(form.get('address') || '').trim(),
      area: String(form.get('area') || '').trim() || null,
      description: String(form.get('description') || '').trim() || null,
      image_url: String(form.get('imageUrl') || '').trim() || null,
      price_per_slot: Number(form.get('pricePerSlot') || 0),
      open_time: String(form.get('openTime') || '06:00').trim(),
      close_time: String(form.get('closeTime') || '22:00').trim(),
      slot_duration: Number(form.get('slotDuration') || 60)
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

  const handleToggleCourtStatus = async (courtId) => {
    const court = subCourts.find(c => c.id === courtId);
    if (!court) return;
    const payload = court.status === 'ACTIVE'
      ? { status: 'MAINTENANCE' }
      : { status: 'ACTIVE', is_visible: true };
    try {
      await ownerRequest(`/courts/${courtId}`, { method: 'PUT', body: JSON.stringify(payload) });
      await loadCourts();
      await loadAnalytics(currentFacility?.id, selectedScheduleDate);
      showToast(`Đã cập nhật trạng thái sân thành ${payload.status}.`);
    } catch (error) {
      showToast(`Không thể cập nhật: ${error.message}`);
    }
  };

  const handleDeleteCourt = async (court) => {
    if (!court) return;
    if (!window.confirm(`Bạn có chắc muốn xóa sân "${court.name}"?`)) return;
    try {
      const payload = await ownerRequest(`/courts/${court.id}`, { method: 'DELETE' });
      await loadCourts();
      await loadAnalytics(currentFacility?.id, selectedScheduleDate);
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
      await loadAnalytics(currentFacility?.id, selectedScheduleDate);
      setShowAddCourtModal(false);
      showToast(editingCourt ? 'Đã lưu thay đổi sân.' : 'Đã thêm sân mới thành công.');
    } catch (error) {
      showToast(`Lưu thất bại: ${error.message}`);
    } finally {
      setCourtSaving(false);
    }
  };

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
          image_url: settingsForm.image_url.trim(),
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
      showToast(payload.message || 'Đã lưu cấu hình cụm sân.');
    } catch (error) {
      showToast(`Lưu cấu hình thất bại: ${error.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Mở modal Đặt tại quầy với giá tự tính theo sân & khung giờ
  const openWalkInModal = (preset = {}) => {
    const activeSubs = currentSubCourts.filter(c => c.status === 'ACTIVE');
    const chosenSub =
      activeSubs.find(c => Number(c.id) === Number(preset.subCourtId)) ||
      activeSubs[0] ||
      currentSubCourts[0];
    const slots = scheduleData.timeSlots || [];
    const chosenSlot =
      slots.find(s => Number(s.slotId) === Number(preset.slotId)) ||
      slots[0];

    const computedPrice = chosenSub
      ? (chosenSlot?.isPeak ? chosenSub.peakPrice : chosenSub.normalPrice)
      : (currentFacility?.pricePerSlot || 0);

    setWalkInForm({
      subCourtId: chosenSub ? String(chosenSub.id) : '',
      slotId: chosenSlot ? String(chosenSlot.slotId) : '',
      date: preset.date || selectedScheduleDate,
      customerName: '',
      customerPhone: '',
      price: preset.price !== undefined ? Number(preset.price) : computedPrice,
      paymentMethod: 'Tiền mặt tại quầy',
      status: 'CONFIRMED',
      note: ''
    });
    setWalkInError('');
    setShowWalkInModal(true);
  };

  const handleWalkInSubOrSlotChange = (nextSubCourtId, nextSlotId) => {
    const chosenSub = currentSubCourts.find(c => String(c.id) === String(nextSubCourtId));
    const chosenSlot = (scheduleData.timeSlots || []).find(s => String(s.slotId) === String(nextSlotId));
    const computedPrice = chosenSub
      ? (chosenSlot?.isPeak ? chosenSub.peakPrice : chosenSub.normalPrice)
      : walkInForm.price;
    setWalkInForm(prev => ({
      ...prev,
      subCourtId: nextSubCourtId,
      slotId: nextSlotId,
      price: computedPrice
    }));
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    if (!currentFacility || walkInSaving) return;
    setWalkInSaving(true);
    setWalkInError('');
    try {
      const payload = await ownerRequest('/bookings/walk-in', {
        method: 'POST',
        body: JSON.stringify({
          courtId: currentFacility.id,
          subCourtId: walkInForm.subCourtId ? Number(walkInForm.subCourtId) : null,
          slotId: walkInForm.slotId ? Number(walkInForm.slotId) : null,
          date: walkInForm.date,
          customerName: walkInForm.customerName.trim(),
          customerPhone: walkInForm.customerPhone.trim(),
          totalPrice: Number(walkInForm.price || 0),
          paymentMethod: walkInForm.paymentMethod,
          status: walkInForm.status,
          note: walkInForm.note.trim()
        })
      });
      await refreshOperationalData(currentFacility.id, selectedScheduleDate);
      setShowWalkInModal(false);
      showToast(payload.message || 'Tạo đơn đặt tại quầy thành công!');
    } catch (error) {
      setWalkInError(error.message);
    } finally {
      setWalkInSaving(false);
    }
  };

  // Cập nhật trạng thái đơn (PENDING -> CONFIRMED -> COMPLETED / CANCELLED) vào PostgreSQL
  const handleUpdateBookingStatus = async (bookingId, newStatus, currentStatus = '') => {
    let reason = '';
    if (newStatus === 'CANCELLED') {
      const isRejecting = currentStatus === 'PENDING';
      const promptReason = window.prompt(
        isRejecting
          ? `Từ chối yêu cầu đặt sân [${bookingId}]?\nNhập lý do từ chối (tùy chọn):`
          : `Xác nhận hủy đơn [${bookingId}]?\nNhập lý do hủy (tùy chọn):`,
        isRejecting ? 'Chủ sân từ chối / không xác nhận đơn' : 'Chủ sân hủy theo yêu cầu'
      );
      if (promptReason === null) return;
      reason = promptReason.trim();
    }

    try {
      const payload = await ownerRequest(`/bookings/${encodeURIComponent(bookingId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason })
      });
      await refreshOperationalData(currentFacility?.id, selectedScheduleDate);
      showToast(payload.message || `Đã cập nhật đơn [${bookingId}].`);
      if (selectedBookingDetail?.id === bookingId) {
        setSelectedBookingDetail(null);
      }
    } catch (error) {
      showToast(`Cập nhật thất bại: ${error.message}`);
    }
  };

  // Khóa / Mở khóa khung giờ trong bảng court_blocks
  const openBlockModal = (preset = {}) => {
    const slots = scheduleData.timeSlots || [];
    const defaultSlot =
      slots.find(s => Number(s.slotId) === Number(preset.slotId)) ||
      slots[0];
    setBlockForm({
      subCourtId: preset.subCourtId ? String(preset.subCourtId) : '',
      slotId: defaultSlot ? String(defaultSlot.slotId) : '',
      date: preset.date || selectedScheduleDate,
      reason: 'Bảo trì sân'
    });
    setBlockError('');
    setShowBlockModal(true);
  };

  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!currentFacility || blockSaving) return;
    setBlockSaving(true);
    setBlockError('');
    try {
      const payload = await ownerRequest('/blocks', {
        method: 'POST',
        body: JSON.stringify({
          courtId: currentFacility.id,
          subCourtId: blockForm.subCourtId ? Number(blockForm.subCourtId) : null,
          slotId: Number(blockForm.slotId),
          date: blockForm.date,
          reason: blockForm.reason.trim()
        })
      });
      await loadSchedule(currentFacility.id, selectedScheduleDate);
      setShowBlockModal(false);
      showToast(payload.message || 'Đã khóa khung giờ thành công!');
    } catch (error) {
      setBlockError(error.message);
    } finally {
      setBlockSaving(false);
    }
  };

  const handleDeleteBlock = async (block) => {
    if (!block) return;
    if (!window.confirm(`Mở khóa khung giờ (${block.reason})?`)) return;
    try {
      const payload = await ownerRequest(`/blocks/${block.blockId}`, { method: 'DELETE' });
      await loadSchedule(currentFacility?.id, selectedScheduleDate);
      showToast(payload.message || 'Đã mở khóa khung giờ!');
    } catch (error) {
      showToast(`Mở khóa thất bại: ${error.message}`);
    }
  };

  // Quản lý & tự thiết lập khung giờ cho cụm sân
  const syncAfterSlotChange = async () => {
    if (!currentFacility?.id) return;
    await Promise.all([
      loadFacilities(currentFacility.id),
      refreshOperationalData(currentFacility.id, selectedScheduleDate)
    ]);
  };

  const openTimeSlotsModal = (mode = 'single') => {
    if (!currentFacility) return;
    setSlotModalError('');
    setEditingTimeSlot(null);
    setSlotForm({
      startTime: '08:00',
      endTime: '09:00',
      isPeak: false,
      isActive: true
    });
    setSlotModalMode(mode);
    setShowTimeSlotsModal(true);
    loadTimeSlots(currentFacility.id);
  };

  const handleSelectSlotToEdit = (slot) => {
    setSlotModalError('');
    setSlotModalMode('single');
    setEditingTimeSlot(slot);
    setSlotForm({
      startTime: slot.startTime,
      endTime: slot.endTime,
      isPeak: Boolean(slot.isPeak),
      isActive: Boolean(slot.isActive)
    });
  };

  const handleResetSlotForm = () => {
    setSlotModalError('');
    setEditingTimeSlot(null);
    setSlotForm({
      startTime: '08:00',
      endTime: '09:00',
      isPeak: false,
      isActive: true
    });
  };

  const handleSaveSingleSlot = async (e) => {
    e.preventDefault();
    if (!currentFacility || slotSaving) return;
    const startMins = timeToMinutes(slotForm.startTime);
    const endMins = timeToMinutes(slotForm.endTime);
    if (startMins === null || endMins === null || endMins - startMins < 15) {
      setSlotModalError('Giờ kết thúc phải sau giờ bắt đầu ít nhất 15 phút.');
      return;
    }

    setSlotSaving(true);
    setSlotModalError('');
    try {
      const endpoint = editingTimeSlot
        ? `/time-slots/${editingTimeSlot.slotId}`
        : '/time-slots';
      const payload = await ownerRequest(endpoint, {
        method: editingTimeSlot ? 'PUT' : 'POST',
        body: JSON.stringify({
          courtId: currentFacility.id,
          startTime: slotForm.startTime,
          endTime: slotForm.endTime,
          isPeak: Boolean(slotForm.isPeak),
          isActive: Boolean(slotForm.isActive)
        })
      });
      await syncAfterSlotChange();
      setEditingTimeSlot(null);
      setSlotForm({
        startTime: addMinutesToHHMM(slotForm.endTime, 0),
        endTime: addMinutesToHHMM(slotForm.endTime, endMins - startMins),
        isPeak: timeToMinutes(slotForm.endTime) >= 17 * 60 && timeToMinutes(slotForm.endTime) < 21 * 60,
        isActive: true
      });
      showToast(payload.message || 'Đã lưu khung giờ thành công!');
    } catch (error) {
      setSlotModalError(error.message);
    } finally {
      setSlotSaving(false);
    }
  };

  const handleToggleSlotField = async (slot, field) => {
    if (!slot || slotSaving) return;
    setSlotSaving(true);
    setSlotModalError('');
    try {
      const nextVal = field === 'isPeak' ? !slot.isPeak : !slot.isActive;
      const payload = await ownerRequest(`/time-slots/${slot.slotId}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: nextVal })
      });
      await syncAfterSlotChange();
      showToast(payload.message || 'Đã cập nhật khung giờ!');
    } catch (error) {
      setSlotModalError(error.message);
    } finally {
      setSlotSaving(false);
    }
  };

  const handleDeleteTimeSlot = async (slot) => {
    if (!slot || slotSaving) return;
    const confirmMsg = slot.bookingCount > 0
      ? `Khung giờ "${slot.label}" đã có ${slot.bookingCount} đơn đặt trước đó nên hệ thống sẽ chuyển sang Tạm ẩn (ngưng nhận đơn mới). Tiếp tục?`
      : `Bạn có chắc muốn xóa hẳn khung giờ "${slot.label}"?`;
    if (!window.confirm(confirmMsg)) return;

    setSlotSaving(true);
    setSlotModalError('');
    try {
      const payload = await ownerRequest(`/time-slots/${slot.slotId}`, {
        method: 'DELETE'
      });
      if (editingTimeSlot?.slotId === slot.slotId) {
        setEditingTimeSlot(null);
      }
      await syncAfterSlotChange();
      showToast(payload.message || 'Đã xóa khung giờ!');
    } catch (error) {
      setSlotModalError(error.message);
    } finally {
      setSlotSaving(false);
    }
  };

  const handleGenerateBatchSlots = async (e) => {
    e.preventDefault();
    if (!currentFacility || slotSaving) return;
    if (
      batchSlotForm.replaceExisting &&
      !window.confirm('Thay thế toàn bộ khung giờ hiện tại bằng dải khung giờ mới? (Các khung giờ cũ có lịch sử sẽ được tự động ẩn đi).')
    ) {
      return;
    }

    setSlotSaving(true);
    setSlotModalError('');
    try {
      const payload = await ownerRequest('/time-slots/generate', {
        method: 'POST',
        body: JSON.stringify({
          courtId: currentFacility.id,
          openTime: batchSlotForm.openTime,
          closeTime: batchSlotForm.closeTime,
          durationMinutes: Number(batchSlotForm.durationMinutes),
          applyPeak: Boolean(batchSlotForm.applyPeak),
          peakStart: batchSlotForm.peakStart,
          peakEnd: batchSlotForm.peakEnd,
          replaceExisting: Boolean(batchSlotForm.replaceExisting)
        })
      });
      await syncAfterSlotChange();
      showToast(payload.message || 'Đã tạo nhanh danh sách khung giờ!');
    } catch (error) {
      setSlotModalError(error.message);
    } finally {
      setSlotSaving(false);
    }
  };

  // Xuất file CSV sao kê doanh thu thật
  const handleExportFinanceCsv = () => {
    const validRows = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED');
    if (validRows.length === 0) {
      showToast('Chưa có giao dịch hợp lệ đã xác nhận để xuất báo cáo.');
      return;
    }
    const headers = ['Ma don', 'Ngay choi', 'Khung gio', 'San con', 'Khach hang', 'SDT', 'Thanh toan', 'Trang thai', 'So tien (VND)'];
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escapeCsv).join(','),
      ...validRows.map(b =>
        [
          b.id,
          b.date,
          b.timeSlot,
          b.subCourtName,
          b.customerName,
          b.customerPhone,
          b.paymentMethod,
          b.status === 'COMPLETED' ? 'Hoan thanh / Check-in' : 'Da xac nhan',
          b.totalPrice
        ].map(escapeCsv).join(',')
      )
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doanh-thu-cum-san-${currentFacility?.id || 'owner'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${validRows.length} giao dịch ra file CSV.`);
  };

  const activeCourtsCount = currentSubCourts.filter(c => c.status === 'ACTIVE').length;
  const activeTimeSlots = scheduleData.timeSlots || [];
  const last7Days = analytics?.last7Days || [];
  const max7DayRevenue = last7Days.reduce((m, d) => Math.max(m, d.revenue), 0);
  const avg7DayRevenue = last7Days.length > 0
    ? Math.round(last7Days.reduce((s, d) => s + d.revenue, 0) / last7Days.length)
    : 0;

  const getBookingBadge = (status) => {
    if (status === 'PENDING') return { cls: 'bg-warning text-dark', label: 'Chờ xác nhận' };
    if (status === 'COMPLETED') return { cls: 'bg-success', label: 'Đã Check-in' };
    if (status === 'CANCELLED') return { cls: 'bg-danger', label: 'Đã hủy' };
    return { cls: 'bg-primary', label: 'Đã xác nhận' };
  };

  // Màn hình yêu cầu đăng nhập tài khoản OWNER nếu người dùng chưa đăng nhập đúng vai trò
  if (!isAuthorizedOwner) {
    return (
      <div className="auth-page-wrapper justify-content-center align-items-center p-4">
        <div className="auth-form-card text-center w-100" style={{ maxWidth: '480px' }}>
          <div className="d-flex justify-content-center mb-3">
            <span className="brand-mark-box" style={{ width: '48px', height: '48px', fontSize: '1.3rem', borderRadius: '12px' }}>
              <i className="bi bi-buildings"></i>
            </span>
          </div>
          <div className="hero-eyebrow justify-content-center mb-2">
            <span className="hero-eyebrow-dot"></span>
            <span>DÀNH CHO ĐỐI TÁC</span>
          </div>
          <h4 className="fw-bold text-dark mb-2">Kênh Quản Lý Chủ Sân</h4>
          <p className="text-muted small mb-4">
            {currentUser
              ? `Tài khoản hiện tại (${currentUser.email}) đang ở vai trò ${currentUser.role}. Vui lòng đăng nhập bằng tài khoản OWNER để quản lý cụm sân, sân con và lịch đặt.`
              : 'Vui lòng đăng nhập bằng tài khoản Chủ sân (OWNER) để truy cập bảng điều khiển quản lý cơ sở.'}
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
                className="btn btn-brand-outline py-2 fw-semibold rounded-3"
                onClick={() => onOpenAuth('register-owner')}
              >
                <i className="bi bi-building-add me-2"></i>Đăng ký trở thành Đối tác Chủ sân
              </button>
            )}
            <button
              type="button"
              className="btn btn-light border py-2 text-secondary rounded-3"
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
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 2000, maxWidth: '400px' }}>
          <div className="bg-white border shadow-sm rounded-3 py-2 px-3 d-flex align-items-center gap-2 small text-dark">
            <i className="bi bi-check-circle-fill text-success flex-shrink-0"></i>
            <div className="flex-grow-1">{toastMessage}</div>
            <button type="button" className="btn-close ms-2" style={{ fontSize: '0.68rem' }} aria-label="Đóng" onClick={() => setToastMessage('')}></button>
          </div>
        </div>
      )}

      {/* ========================================================
          1. OWNER TOPBAR HEADER
          ======================================================== */}
      <header className="bg-white border-bottom sticky-top py-2" style={{ zIndex: 1020 }}>
        <div className="container-fluid px-3 px-lg-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">

            {/* Logo & Portal Subtitle */}
            <div className="d-flex align-items-center gap-2">
              <a
                href="#home"
                onClick={(e) => { e.preventDefault(); onBackToHome(); }}
                className="text-decoration-none d-flex align-items-center gap-2"
              >
                <span className="brand-mark-box">
                  <i className="bi bi-trophy-fill"></i>
                </span>
                <span className="fw-bold fs-5 text-brand-dark">SportsBooking</span>
              </a>

              <span className="text-muted d-none d-sm-inline">|</span>
              <span className="text-muted small fw-semibold d-none d-sm-inline">Kênh Chủ Sân</span>
            </div>

            {/* Facility Selector Dropdown */}
            <div className="d-flex align-items-center gap-2 flex-grow-1 flex-md-grow-0 justify-content-center">
              <div className="input-group input-group-sm" style={{ maxWidth: '400px' }}>
                <span className="input-group-text bg-light text-secondary fw-medium">
                  <i className="bi bi-geo-alt me-1"></i>Cụm sân
                </span>
                <select
                  className="form-select fw-semibold bg-white"
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
                  title="Thêm cụm sân mới"
                  onClick={() => setShowFacilityModal(true)}
                >
                  <i className="bi bi-plus-lg"></i>
                </button>
              </div>
            </div>

            {/* Account Icon Options */}
            <div className="d-flex align-items-center gap-2 ms-auto">
              <AccountMenu
                currentUser={currentUser}
                activeView="owner-dashboard"
                facilityName={currentFacility?.name || ''}
                onGoHome={() => onBackToHome?.()}
                onOpenOwnerDashboard={() => setActiveTab('overview')}
                onOpenProfile={onOpenProfile}
                onOpenMyBookings={onOpenMyBookings}
                onLogout={onLogout}
              />
            </div>

          </div>
        </div>
      </header>

      {/* Nếu chủ sân chưa có cụm sân nào */}
      {!facilitiesLoading && !facilitiesError && !currentFacility ? (
        <main className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div className="editorial-panel-card p-5 text-center bg-white" style={{ maxWidth: '480px' }}>
            <i className="bi bi-building-add text-brand fs-1 mb-3"></i>
            <h5 className="fw-bold text-dark">Bạn chưa có cụm sân nào</h5>
            <p className="text-muted small mb-4">
              Hãy tạo cụm sân thể thao đầu tiên của bạn để bắt đầu cấu hình sân con và nhận lịch đặt từ khách hàng.
            </p>
            <button
              type="button"
              className="btn btn-brand rounded-3 px-4"
              onClick={() => setShowFacilityModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>Tạo cụm sân ngay
            </button>
          </div>
        </main>
      ) : (
        <>
          {/* ========================================================
              2. FACILITY HEADER & SUB-NAV TABS
              ======================================================== */}
          {currentFacility && (
            <section className="owner-hero-band pt-3 pb-0">
              <div className="container-fluid px-3 px-lg-4">
                <div className="row align-items-center mb-3 g-3">
                  <div className="col-lg-8">
                    <div className="d-flex align-items-start gap-3">
                      {currentFacility.coverImageUrl && !headerImgError ? (
                        <img
                          src={currentFacility.coverImageUrl}
                          alt={currentFacility.name}
                          className="rounded-3 border object-fit-cover d-none d-sm-block flex-shrink-0"
                          style={{ width: '78px', height: '78px' }}
                          onError={() => setHeaderImgError(true)}
                        />
                      ) : (
                        <div
                          className="court-placeholder-box rounded-3 border d-none d-sm-flex flex-shrink-0 p-1"
                          style={{ width: '78px', height: '78px' }}
                        >
                          <i className="bi bi-building fs-4"></i>
                        </div>
                      )}
                      <div>
                        <div className="hero-eyebrow mb-1">
                          <span className="hero-eyebrow-dot"></span>
                          <span>CỤM SÂN ĐANG VẬN HÀNH</span>
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <h4 className="fw-bold text-dark mb-0" style={{ letterSpacing: '-0.02em' }}>
                            {currentFacility.name}
                          </h4>
                          <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle">
                            {currentFacility.category}
                          </span>
                          <span className={`badge rounded-pill ${currentFacility.operationalStatus === 'ACTIVE' ? 'bg-primary-subtle text-primary' : 'bg-secondary-subtle text-secondary'} border`}>
                            {currentFacility.operationalStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm ngưng'}
                          </span>
                          {!currentFacility.isVisible && (
                            <span className="badge rounded-pill bg-warning-subtle text-dark border border-warning-subtle">
                              <i className="bi bi-hourglass-split me-1"></i>Chờ Admin duyệt hiển thị
                            </span>
                          )}
                        </div>
                        <p className="text-muted small mb-1 d-flex align-items-center gap-1">
                          <i className="bi bi-geo-alt text-brand"></i>
                          <span>{currentFacility.address || 'Chưa cập nhật địa chỉ'}</span>
                        </p>
                        <div className="d-flex align-items-center gap-3 small text-muted flex-wrap">
                          <span>
                            <i className="bi bi-clock me-1 text-secondary"></i>
                            Giờ mở cửa: <strong className="text-dark">{currentFacility.openTime}</strong> ({activeTimeSlots.length} khung giờ)
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 ms-2 text-brand fw-semibold text-decoration-none"
                              onClick={() => openTimeSlotsModal('single')}
                            >
                              Thiết lập giờ
                            </button>
                          </span>
                          <span><i className="bi bi-telephone me-1 text-secondary"></i> Hotline: {currentFacility.ownerPhone || 'Chưa cập nhật'}</span>
                          <span><i className="bi bi-diagram-3 me-1 text-secondary"></i> Môn: {facilitySports.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-4 text-lg-end">
                    <div className="d-flex align-items-center justify-content-lg-end gap-2 flex-wrap">
                      <button
                        className="btn btn-brand-outline btn-sm rounded-3 fw-semibold"
                        onClick={() => openWalkInModal()}
                        disabled={activeTimeSlots.length === 0}
                      >
                        <i className="bi bi-person-plus-fill me-1"></i> Đặt tại quầy
                      </button>
                      <button
                        className="btn btn-brand btn-sm rounded-3"
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
                <div className="d-flex gap-3 gap-md-4 overflow-x-auto">
                  <button
                    type="button"
                    className={`owner-nav-tab text-nowrap ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    <i className="bi bi-grid-1x2-fill"></i>
                    <span>Tổng quan</span>
                  </button>
                  <button
                    type="button"
                    className={`owner-nav-tab text-nowrap ${activeTab === 'courts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('courts')}
                  >
                    <i className="bi bi-dribbble"></i>
                    <span>Quản lý Sân ({currentSubCourts.length})</span>
                  </button>
                  <button
                    type="button"
                    className={`owner-nav-tab text-nowrap ${activeTab === 'schedule' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schedule')}
                  >
                    <i className="bi bi-calendar3"></i>
                    <span>Lịch Đặt & Khung Giờ</span>
                    {pendingBookingsCount > 0 ? (
                      <span className="badge rounded-pill bg-warning text-dark fw-bold" style={{ fontSize: '0.68rem' }}>
                        {pendingBookingsCount} chờ duyệt
                      </span>
                    ) : (analytics?.todayBookingsCount || todayBookings.length) > 0 && (
                      <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                        {analytics?.todayBookingsCount ?? todayBookings.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`owner-nav-tab text-nowrap ${activeTab === 'finance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('finance')}
                  >
                    <i className="bi bi-cash-stack"></i>
                    <span>Doanh thu & Đối soát</span>
                  </button>
                  <button
                    type="button"
                    className={`owner-nav-tab text-nowrap ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                  >
                    <i className="bi bi-gear-fill"></i>
                    <span>Cài đặt Cơ sở</span>
                  </button>
                </div>
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

              {/* ==========================================
                  TAB 1: TỔNG QUAN (REAL POSTGRESQL ANALYTICS)
                  ========================================== */}
              {currentFacility && activeTab === 'overview' && (
                <div>
                  {pendingBookingsCount > 0 && (
                    <div className="alert alert-warning border border-warning-subtle d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4 rounded-3">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-bell-fill fs-5 text-warning-emphasis"></i>
                        <div>
                          <strong>Có {pendingBookingsCount} yêu cầu đặt sân mới đang chờ xác nhận</strong>
                          <div className="small text-muted">
                            Kiểm tra và bấm Xác nhận để chốt lịch chơi cho khách hàng.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm fw-semibold rounded-3 px-3"
                        onClick={() => {
                          setBookingStatusFilter('PENDING');
                          setActiveTab('schedule');
                        }}
                      >
                        Xem & Duyệt ngay ({pendingBookingsCount})
                      </button>
                    </div>
                  )}

                  {/* 4 KPI Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-xl-3 col-sm-6">
                      <div className="owner-kpi-card h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted small fw-semibold">Doanh thu tháng</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-currency-dollar"></i>
                          </span>
                        </div>
                        <h3 className="fw-bold text-brand-dark mb-1">
                          {analyticsLoading ? '...' : `${Number(analytics?.monthlyRevenue || 0).toLocaleString('vi-VN')}đ`}
                        </h3>
                        <div className="small text-success">
                          <strong>{analytics?.monthlyBookings || 0}</strong> đơn hợp lệ trong tháng
                        </div>
                      </div>
                    </div>

                    <div className="col-xl-3 col-sm-6">
                      <div className="owner-kpi-card h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted small fw-semibold">Tổng lượt đặt sân</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-calendar2-check"></i>
                          </span>
                        </div>
                        <h3 className="fw-bold text-dark mb-1">
                          {analytics?.totalBookings ?? bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length} lượt
                        </h3>
                        <div className="small text-muted d-flex align-items-center gap-1">
                          <span className="text-success fw-semibold">+{analytics?.todayBookingsCount ?? todayBookings.length} hôm nay</span> • {analytics?.checkedInCount ?? 0} đã check-in
                        </div>
                      </div>
                    </div>

                    <div className="col-xl-3 col-sm-6">
                      <div className="owner-kpi-card h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted small fw-semibold">Công suất ngày chọn</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-speedometer2"></i>
                          </span>
                        </div>
                        <h3 className="fw-bold text-dark mb-1">
                          {analytics?.occupancyRate ?? 0}%
                        </h3>
                        <div className="small text-muted">
                          Đã đặt <strong>{analytics?.bookedTodaySlots ?? 0}</strong> / {analytics?.totalDailyCapacity ?? 0} slot ({selectedScheduleDate})
                        </div>
                      </div>
                    </div>

                    <div className="col-xl-3 col-sm-6">
                      <div className="owner-kpi-card h-100 p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <span className="text-muted small fw-semibold">Sân hoạt động</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-check2-circle"></i>
                          </span>
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

                  {/* Chart & Quick Actions */}
                  <div className="row g-4 mb-4">
                    <div className="col-lg-7">
                      <div className="editorial-panel-card p-4 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div>
                            <h6 className="fw-bold text-dark mb-0">Doanh thu 7 ngày gần nhất</h6>
                            <span className="text-muted small">Tính đến ngày: {selectedScheduleDate}</span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-3"
                            onClick={() => refreshOperationalData(currentFacility.id, selectedScheduleDate)}
                          >
                            <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
                          </button>
                        </div>

                        <div className="d-flex align-items-end justify-content-between pt-4 px-2" style={{ height: '220px' }}>
                          {last7Days.length === 0 ? (
                            <div className="text-muted small w-100 text-center my-auto">Đang tải dữ liệu doanh thu...</div>
                          ) : last7Days.map((bar) => {
                            const heightPct = max7DayRevenue > 0
                              ? Math.max(8, Math.round((bar.revenue / max7DayRevenue) * 100))
                              : 8;
                            const isPeak = max7DayRevenue > 0 && bar.revenue === max7DayRevenue;
                            return (
                              <div key={bar.date} className="d-flex flex-column align-items-center flex-grow-1" title={`${bar.date}: ${bar.revenue.toLocaleString('vi-VN')}đ (${bar.bookingsCount} đơn)`}>
                                <span className="small fw-semibold text-muted mb-2" style={{ fontSize: '0.72rem' }}>
                                  {formatCompactMoney(bar.revenue)}
                                </span>
                                <div
                                  className="w-50 rounded-top transition-all"
                                  style={{
                                    height: `${heightPct}%`,
                                    backgroundColor: isPeak ? '#0b4d3c' : (bar.revenue > 0 ? '#10b981' : '#e5e7eb')
                                  }}
                                ></div>
                                <span className={`small mt-2 ${isPeak ? 'fw-bold text-brand' : 'text-muted'}`}>{bar.label}</span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="border-top mt-3 pt-3 d-flex align-items-center justify-content-between small text-muted flex-wrap gap-2">
                          <div><i className="bi bi-circle-fill text-brand me-1"></i>Doanh thu hôm nay: <strong>{Number(analytics?.todayRevenue || 0).toLocaleString('vi-VN')}đ</strong></div>
                          <div>Trung bình 7 ngày: <strong>{avg7DayRevenue.toLocaleString('vi-VN')}đ / ngày</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-5">
                      <div className="editorial-panel-card p-4 h-100 d-flex flex-column">
                        <h6 className="fw-bold text-dark mb-3">
                          {analytics?.bySport?.length > 0 ? 'Phân bổ doanh thu theo bộ môn' : 'Phân bổ sân theo bộ môn'}
                        </h6>

                        <div className="mb-4">
                          {analytics?.bySport?.length > 0 ? (
                            analytics.bySport.map((item, idx) => (
                              <div key={idx} className="mb-3">
                                <div className="d-flex justify-content-between small fw-semibold mb-1">
                                  <span>{item.sportName} ({item.bookingsCount} đơn)</span>
                                  <span className="text-brand">{item.revenue.toLocaleString('vi-VN')}đ ({item.ratio}%)</span>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                  <div className="progress-bar" role="progressbar" style={{ width: `${item.ratio}%`, backgroundColor: '#0b4d3c' }}></div>
                                </div>
                              </div>
                            ))
                          ) : (
                            facilitySports.map((sport, idx) => {
                              const count = currentSubCourts.filter(sc => sc.sportType === sport).length;
                              const ratio = currentSubCourts.length > 0 ? Math.round((count / currentSubCourts.length) * 100) : 100;
                              return (
                                <div key={idx} className="mb-3">
                                  <div className="d-flex justify-content-between small fw-semibold mb-1">
                                    <span>{sport}</span>
                                    <span className="text-brand">{count} sân ({ratio}%)</span>
                                  </div>
                                  <div className="progress" style={{ height: '8px' }}>
                                    <div className="progress-bar" role="progressbar" style={{ width: `${ratio}%`, backgroundColor: '#0b4d3c' }}></div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="mt-auto border-top pt-3">
                          <h6 className="fw-bold text-dark mb-2">Thao tác nhanh cho chủ sân</h6>
                          <div className="d-grid gap-2">
                            <button
                              className="btn btn-outline-success text-start d-flex align-items-center justify-content-between py-2 px-3 rounded-3"
                              onClick={() => openWalkInModal()}
                              disabled={activeTimeSlots.length === 0}
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
                              <span><i className="bi bi-calendar-event me-2"></i> Xem ma trận lịch & khóa khung giờ</span>
                              <i className="bi bi-chevron-right small"></i>
                            </button>
                            <button
                              className="btn btn-outline-primary text-start d-flex align-items-center justify-content-between py-2 px-3 rounded-3"
                              onClick={() => openTimeSlotsModal('single')}
                            >
                              <span><i className="bi bi-clock-history me-2"></i> Thiết lập khung giờ mở cửa</span>
                              <i className="bi bi-chevron-right small"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bookings Today Table */}
                  <div className="editorial-panel-card p-4">
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <div>
                        <h6 className="fw-bold text-dark mb-0">Lượt đặt sân hôm nay ({todayYmd})</h6>
                        <span className="text-muted small">Đồng bộ trực tiếp đơn online từ khách hàng & đơn đặt tại quầy</span>
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
                            <th>SÂN CON</th>
                            <th>KHUNG GIỜ</th>
                            <th>SỐ TIỀN</th>
                            <th>THANH TOÁN</th>
                            <th>TRẠNG THÁI</th>
                            <th className="text-end">THAO TÁC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookingsLoading ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">Đang tải danh sách đặt sân...</td>
                            </tr>
                          ) : todayBookings.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">
                                Hôm nay chưa có lịch đặt nào tại cơ sở này. Hãy bấm "Đặt tại quầy" nếu có khách gọi điện!
                              </td>
                            </tr>
                          ) : (
                            todayBookings.map((b) => {
                              const badge = getBookingBadge(b.status);
                              return (
                                <tr key={b.id}>
                                  <td><span className="fw-bold text-brand-dark">{b.id}</span></td>
                                  <td>
                                    <div className="fw-semibold text-dark">{b.customerName}</div>
                                    <span className="text-muted small">{b.customerPhone}</span>
                                  </td>
                                  <td><span className="badge bg-light text-dark border me-1">{b.subCourtName}</span></td>
                                  <td><span className="bg-brand-light text-brand-dark fw-semibold px-2 py-1 rounded-2 small">{b.timeSlot}</span></td>
                                  <td><strong className="text-brand-dark">{b.totalPrice?.toLocaleString('vi-VN')}đ</strong></td>
                                  <td><span className="small text-muted">{b.paymentMethod}</span></td>
                                  <td><span className={`badge rounded-pill ${badge.cls}`}>{badge.label}</span></td>
                                  <td className="text-end">
                                    <div className="btn-group btn-group-sm">
                                      {b.status === 'PENDING' && (
                                        <button
                                          className="btn btn-warning text-dark fw-semibold"
                                          title="Xác nhận đơn đặt sân"
                                          onClick={() => handleUpdateBookingStatus(b.id, 'CONFIRMED', b.status)}
                                        >
                                          <i className="bi bi-check-circle me-1"></i> Xác nhận
                                        </button>
                                      )}
                                      {b.status === 'CONFIRMED' && (
                                        <button
                                          className="btn btn-outline-success"
                                          title="Check-in khi khách tới sân"
                                          onClick={() => handleUpdateBookingStatus(b.id, 'COMPLETED', b.status)}
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
                                      {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                                        <button
                                          className="btn btn-outline-danger"
                                          title={b.status === 'PENDING' ? 'Từ chối yêu cầu đặt' : 'Hủy đơn đặt'}
                                          onClick={() => handleUpdateBookingStatus(b.id, 'CANCELLED', b.status)}
                                        >
                                          <i className="bi bi-x-lg"></i>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
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
                      <h5 className="fw-bold text-dark mb-1">
                        Danh sách sân con ({currentFacility.name})
                      </h5>
                      <p className="text-muted small mb-0">
                        Quản lý từng sân thi đấu cụ thể, mặt sân, bảng giá giờ thường / cao điểm và trạng thái đón khách
                      </p>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-wrap">
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
                        type="button"
                        className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 rounded-3"
                        onClick={() => openTimeSlotsModal('single')}
                      >
                        <i className="bi bi-clock-history"></i>
                        <span>Thiết lập khung giờ ({activeTimeSlots.length})</span>
                      </button>

                      <button
                        className="btn btn-brand btn-sm d-flex align-items-center gap-1 rounded-3"
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

                  {courtsLoading && <div className="alert alert-info py-2 small">Đang tải danh sách sân...</div>}
                  {courtsError && (
                    <div className="alert alert-danger d-flex align-items-center justify-content-between">
                      <span>{courtsError}</span>
                      <button className="btn btn-sm btn-outline-danger" onClick={loadCourts}>Thử lại</button>
                    </div>
                  )}

                  <div className="row g-4">
                    {!courtsLoading && filteredSubCourts.length === 0 ? (
                      <div className="col-12 text-center py-5">
                        <div className="editorial-panel-card p-5">
                          <i className="bi bi-dribbble text-muted fs-1 mb-2 d-block"></i>
                          <h6>Chưa có sân con nào thuộc cụm sân hoặc phù hợp bộ lọc.</h6>
                          <button
                            className="btn btn-outline-success btn-sm rounded-3 mt-2"
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
                          <div className="court-card h-100 d-flex flex-column">
                            <div className="court-card-img-wrapper" style={{ height: '175px' }}>
                              {court.imageUrl && !failedCourtImages[court.id] ? (
                                <img
                                  src={court.imageUrl}
                                  alt={court.name}
                                  className="court-card-img"
                                  onError={() => setFailedCourtImages(prev => ({ ...prev, [court.id]: true }))}
                                />
                              ) : (
                                <div className="court-placeholder-box">
                                  <i className="bi bi-image fs-2 opacity-75 mb-1"></i>
                                  <span className="small opacity-75">Chưa có ảnh sân con</span>
                                </div>
                              )}
                              <div className="position-absolute top-0 start-0 m-2">
                                <span className="court-category-pill">
                                  {court.sportType || 'Thể thao'}
                                </span>
                              </div>
                              <div className="position-absolute top-0 end-0 m-2 d-flex gap-1">
                                {!court.isVisible && (
                                  <span className="badge rounded-pill bg-secondary">Ẩn</span>
                                )}
                                <span className={`badge rounded-pill ${
                                  court.status === 'ACTIVE' ? 'bg-success' :
                                  court.status === 'CLOSED' ? 'bg-danger' : 'bg-warning text-dark'
                                }`}>
                                  {court.status === 'ACTIVE' ? 'Đang mở' :
                                   court.status === 'CLOSED' ? 'Đã đóng' : 'Bảo trì'}
                                </span>
                              </div>
                            </div>

                            <div className="card-body p-3 d-flex flex-column">
                              <h6 className="fw-bold text-dark mb-1">{court.name}</h6>
                              <div className="small text-muted mb-2">
                                <i className="bi bi-layers me-1 text-secondary"></i> {court.courtType || 'Tiêu chuẩn'}
                              </div>
                              <div className="small text-muted mb-3">
                                <i className="bi bi-shield-check me-1 text-success"></i> {court.surfaceType || 'Mặt sân chuẩn thi đấu'}
                              </div>

                              <div className="price-highlight-box p-2 mb-3">
                                <div className="d-flex justify-content-between small">
                                  <span className="text-muted">Giờ thường:</span>
                                  <strong className="text-dark">{court.priceNormal.toLocaleString('vi-VN')}đ /h</strong>
                                </div>
                                <div className="d-flex justify-content-between small">
                                  <span className="text-muted">Giờ vàng (17h-21h):</span>
                                  <strong className="text-brand-dark">{court.pricePeak.toLocaleString('vi-VN')}đ /h</strong>
                                </div>
                              </div>

                              <div className="d-flex flex-wrap gap-1 mb-3">
                                {court.amenities && court.amenities.map((a, i) => (
                                  <span key={i} className="amenity-chip" style={{ fontSize: '0.7rem' }}>
                                    {a}
                                  </span>
                                ))}
                              </div>

                              <div className="mt-auto pt-2 border-top d-flex align-items-center justify-content-between">
                                <button
                                  type="button"
                                  className={`btn btn-sm ${court.status === 'ACTIVE' ? 'btn-outline-warning' : 'btn-outline-success'} rounded-3`}
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
                  TAB 3: LỊCH ĐẶT & BẢNG KHUNG GIỜ
                  ========================================== */}
              {currentFacility && activeTab === 'schedule' && (
                <div>
                  <div className="editorial-panel-card p-3 p-md-4 mb-4">
                    <div className="row align-items-center g-3">
                      <div className="col-md-4">
                        <label className="form-label small text-muted fw-semibold mb-1">
                          <i className="bi bi-calendar-date me-1 text-brand"></i> Chọn ngày xem lịch:
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
                            className="btn btn-outline-secondary btn-sm text-nowrap rounded-3"
                            onClick={() => setSelectedScheduleDate(formatLocalYMD())}
                          >
                            Hôm nay
                          </button>
                        </div>
                      </div>

                      <div className="col-md-4">
                        <div className="small text-muted mb-1">Chú thích trạng thái:</div>
                        <div className="d-flex align-items-center gap-3 small flex-wrap">
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded bg-success-subtle border border-success" style={{ width: '14px', height: '14px' }}></span>
                            <span>Trống</span>
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded bg-warning" style={{ width: '14px', height: '14px' }}></span>
                            <span>Chờ xác nhận</span>
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded bg-primary text-white" style={{ width: '14px', height: '14px' }}></span>
                            <span>Đã xác nhận</span>
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded bg-danger-subtle border border-danger" style={{ width: '14px', height: '14px' }}></span>
                            <span>Đã khóa</span>
                          </span>
                          <span className="d-flex align-items-center gap-1">
                            <span className="d-inline-block rounded bg-secondary-subtle border" style={{ width: '14px', height: '14px' }}></span>
                            <span>Bảo trì</span>
                          </span>
                        </div>
                      </div>

                      <div className="col-md-4 text-md-end d-flex justify-content-md-end gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm rounded-3"
                          onClick={() => openTimeSlotsModal('single')}
                        >
                          <i className="bi bi-clock-history me-1 text-brand"></i> Khung giờ ({activeTimeSlots.length})
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm rounded-3"
                          onClick={() => openBlockModal()}
                          disabled={activeTimeSlots.length === 0}
                        >
                          <i className="bi bi-lock-fill me-1"></i> Khóa khung giờ
                        </button>
                        <button
                          className="btn btn-brand btn-sm rounded-3"
                          onClick={() => openWalkInModal()}
                          disabled={activeTimeSlots.length === 0}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Đặt tại quầy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Time-Slot Grid Matrix */}
                  <div className="editorial-panel-card mb-4 overflow-hidden">
                    <div className="bg-white px-4 py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <span className="hero-eyebrow mb-1">
                          <span className="hero-eyebrow-dot"></span>
                          MA TRẬN KHUNG GIỜ
                        </span>
                        <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                          <i className="bi bi-grid-3x3-gap-fill text-brand"></i>
                          <span>{currentFacility.name} · Ngày {selectedScheduleDate}</span>
                        </h6>
                        <span className="text-muted small">Bấm "+ Đặt" để nhận khách tại quầy hoặc bấm biểu tượng ổ khóa để khóa/mở khung giờ</span>
                      </div>
                      {scheduleLoading && <span className="badge bg-info-subtle text-info rounded-pill px-3 py-2">Đang đồng bộ lịch...</span>}
                    </div>

                    <div className="table-responsive p-3 p-md-4">
                      <table className="table table-bordered text-center align-middle mb-0" style={{ minWidth: '720px' }}>
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '145px' }} className="text-secondary small">KHUNG GIỜ</th>
                            {currentSubCourts.map(court => (
                              <th key={court.id} className="small">
                                <div className="fw-bold text-dark text-truncate" style={{ maxWidth: '170px' }}>{court.name}</div>
                                <span className="badge bg-light text-secondary border fw-normal" style={{ fontSize: '0.65rem' }}>
                                  {court.sportType}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {currentSubCourts.length === 0 || activeTimeSlots.length === 0 ? (
                            <tr>
                              <td colSpan={Math.max(2, currentSubCourts.length + 1)} className="text-muted py-4">
                                {currentSubCourts.length === 0 ? (
                                  'Chưa có sân con nào trong cụm sân này. Hãy thêm sân con ở tab Quản lý Sân.'
                                ) : (
                                  <div className="d-flex flex-column align-items-center gap-2">
                                    <span>Cụm sân chưa có khung giờ hoạt động nào.</span>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-brand rounded-3 px-3"
                                      onClick={() => openTimeSlotsModal('batch')}
                                    >
                                      <i className="bi bi-clock-history me-1"></i> Thiết lập khung giờ ngay
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ) : activeTimeSlots.map((slot) => {
                            const slotStartStr = `${selectedScheduleDate} ${slot.startFull}`;
                            const slotEndStr = `${selectedScheduleDate} ${slot.endFull}`;

                            return (
                              <tr key={slot.slotId}>
                                <td className="fw-semibold text-secondary small bg-light text-nowrap">
                                  <i className="bi bi-clock me-1 text-muted"></i>{slot.label}
                                  {slot.isPeak && (
                                    <i className="bi bi-star-fill text-warning ms-1" style={{ fontSize: '0.68rem' }} title="Giờ vàng"></i>
                                  )}
                                </td>
                                {currentSubCourts.map(court => {
                                  if (court.status !== 'ACTIVE') {
                                    return (
                                      <td key={court.id} className="bg-secondary-subtle text-muted small p-2" title="Sân không hoạt động">
                                        <span className="small text-secondary">{court.status === 'CLOSED' ? 'Đã đóng' : 'Bảo trì'}</span>
                                      </td>
                                    );
                                  }

                                  const bookingMatch = (scheduleData.bookings || []).find(b =>
                                    Number(b.slotId) === Number(slot.slotId) &&
                                    (b.subCourtId === null || Number(b.subCourtId) === Number(court.id))
                                  );

                                  if (bookingMatch) {
                                    const isDone = bookingMatch.status === 'COMPLETED';
                                    const isPending = bookingMatch.status === 'PENDING';
                                    return (
                                      <td
                                        key={court.id}
                                        className="p-1"
                                        onClick={() => setSelectedBookingDetail(bookingMatch)}
                                        title={`Bấm để xem chi tiết đơn: ${bookingMatch.customerName}`}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div className={`p-2 rounded text-start ${
                                          isDone
                                            ? 'bg-success text-white'
                                            : isPending
                                              ? 'bg-warning text-dark'
                                              : 'bg-primary text-white'
                                        }`}>
                                          <div className="fw-bold small text-truncate">{bookingMatch.customerName}</div>
                                          <div style={{ fontSize: '0.68rem', opacity: 0.92 }}>
                                            {isDone ? 'Đã Check-in' : isPending ? 'Chờ xác nhận' : 'Đã xác nhận'}
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }

                                  const blockMatch = (scheduleData.blocks || []).find(bl =>
                                    (bl.subCourtId === null || Number(bl.subCourtId) === Number(court.id)) &&
                                    bl.startAt < slotEndStr &&
                                    bl.endAt > slotStartStr
                                  );

                                  if (blockMatch) {
                                    return (
                                      <td key={court.id} className="p-1 bg-danger-subtle">
                                        <div className="d-flex align-items-center justify-content-between gap-1 px-2 py-1 rounded border border-danger-subtle bg-white">
                                          <span className="text-danger fw-semibold text-truncate" style={{ fontSize: '0.72rem', maxWidth: '110px' }} title={blockMatch.reason}>
                                            <i className="bi bi-lock-fill me-1"></i>{blockMatch.reason}
                                          </span>
                                          <button
                                            type="button"
                                            className="btn btn-link p-0 text-danger small text-decoration-none"
                                            style={{ fontSize: '0.72rem' }}
                                            onClick={() => handleDeleteBlock(blockMatch)}
                                            title="Mở khóa khung giờ này"
                                          >
                                            Mở
                                          </button>
                                        </div>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={court.id} className="p-1">
                                      <div className="d-flex gap-1">
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-success flex-grow-1 py-1 small"
                                          onClick={() => openWalkInModal({
                                            subCourtId: court.id,
                                            slotId: slot.slotId,
                                            date: selectedScheduleDate,
                                            price: slot.isPeak ? court.pricePeak : court.priceNormal
                                          })}
                                          title="Đặt tại quầy cho khung giờ này"
                                        >
                                          + Đặt
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-secondary py-1 px-2"
                                          onClick={() => openBlockModal({
                                            subCourtId: court.id,
                                            slotId: slot.slotId,
                                            date: selectedScheduleDate
                                          })}
                                          title="Khóa khung giờ này"
                                        >
                                          <i className="bi bi-lock"></i>
                                        </button>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Full Bookings List Table */}
                  <div className="editorial-panel-card p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
                      <div>
                        <span className="hero-eyebrow mb-1">
                          <span className="hero-eyebrow-dot"></span>
                          DANH SÁCH ĐƠN ĐẶT
                        </span>
                        <h6 className="fw-bold text-dark mb-0">
                          Toàn bộ đơn đặt sân tại {currentFacility.name} ({filteredBookingsList.length})
                        </h6>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          { key: 'ALL', label: 'Tất cả' },
                          { key: 'PENDING', label: `Chờ xác nhận (${pendingBookingsCount})` },
                          { key: 'CONFIRMED', label: 'Đã xác nhận' },
                          { key: 'COMPLETED', label: 'Đã Check-in' },
                          { key: 'CANCELLED', label: 'Đã hủy' }
                        ].map(tab => (
                          <button
                            key={tab.key}
                            type="button"
                            className={`sport-filter-pill ${bookingStatusFilter === tab.key ? 'active' : ''}`}
                            onClick={() => setBookingStatusFilter(tab.key)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {bookingsError && <div className="alert alert-danger py-2 small rounded-3">{bookingsError}</div>}

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
                          {filteredBookingsList.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="text-center py-4 text-muted">
                                Chưa có đơn đặt sân nào phù hợp bộ lọc.
                              </td>
                            </tr>
                          ) : filteredBookingsList.map(b => {
                            const badge = getBookingBadge(b.status);
                            return (
                              <tr key={b.id}>
                                <td className="fw-bold text-dark">{b.id}</td>
                                <td className="small text-muted">{b.date}</td>
                                <td>
                                  <div className="fw-semibold text-dark">{b.customerName}</div>
                                  <span className="small text-muted">{b.customerPhone}</span>
                                </td>
                                <td className="small">{b.subCourtName}</td>
                                <td>
                                  <span className="bg-brand-light text-brand-dark px-2 py-1 rounded-2 fw-semibold small text-nowrap">
                                    {b.timeSlot}
                                  </span>
                                </td>
                                <td><strong className="text-brand-dark">{b.totalPrice?.toLocaleString('vi-VN')}đ</strong></td>
                                <td className="small text-muted">{b.paymentMethod}</td>
                                <td><span className={`badge rounded-pill ${badge.cls}`}>{badge.label}</span></td>
                                <td className="text-end">
                                  <div className="btn-group btn-group-sm">
                                    {b.status === 'PENDING' && (
                                      <button
                                        className="btn btn-warning text-dark fw-semibold"
                                        onClick={() => handleUpdateBookingStatus(b.id, 'CONFIRMED', b.status)}
                                        title="Xác nhận đơn đặt sân"
                                      >
                                        <i className="bi bi-check-circle me-1"></i>Xác nhận
                                      </button>
                                    )}
                                    {b.status === 'CONFIRMED' && (
                                      <button
                                        className="btn btn-outline-success"
                                        onClick={() => handleUpdateBookingStatus(b.id, 'COMPLETED', b.status)}
                                        title="Check-in khách vào sân"
                                      >
                                        <i className="bi bi-check2 me-1"></i>Check-in
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-outline-secondary"
                                      onClick={() => setSelectedBookingDetail(b)}
                                      title="Xem chi tiết"
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                    {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                                      <button
                                        className="btn btn-outline-danger"
                                        onClick={() => handleUpdateBookingStatus(b.id, 'CANCELLED', b.status)}
                                        title={b.status === 'PENDING' ? 'Từ chối yêu cầu đặt' : 'Hủy đơn đặt'}
                                      >
                                        <i className="bi bi-x-lg"></i>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 4: DOANH THU & ĐỐI SOÁT
                  ========================================== */}
              {currentFacility && activeTab === 'finance' && (
                <div>
                  <div className="row g-4 mb-4">
                    <div className="col-lg-4">
                      <div
                        className="rounded-4 p-4 h-100 d-flex flex-column text-white shadow-sm"
                        style={{ backgroundColor: '#0b4d3c' }}
                      >
                        <span className="hero-eyebrow mb-2" style={{ color: '#86efac' }}>
                          <span className="hero-eyebrow-dot" style={{ backgroundColor: '#86efac' }}></span>
                          DOANH THU THÁNG HIỆN TẠI
                        </span>
                        <h2 className="fw-bold mt-1 mb-1" style={{ color: '#86efac', fontSize: '2rem', letterSpacing: '-0.02em' }}>
                          {Number(analytics?.monthlyRevenue || 0).toLocaleString('vi-VN')}đ
                        </h2>
                        <p className="small mb-4" style={{ color: 'rgba(255, 255, 255, 0.72)' }}>
                          Ghi nhận từ {analytics?.monthlyBookings || 0} lượt đặt sân hợp lệ
                        </p>

                        <div className="pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.14)' }}>
                          <div className="d-flex justify-content-between mb-2 small">
                            <span style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Thanh toán Online / VietQR:</span>
                            <strong style={{ color: '#86efac' }}>
                              {Number(analytics?.monthlyOnlineRevenue || 0).toLocaleString('vi-VN')}đ
                            </strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2 small">
                            <span style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Tiền mặt thu tại quầy:</span>
                            <strong className="text-white">
                              {Number(analytics?.monthlyCounterRevenue || 0).toLocaleString('vi-VN')}đ
                            </strong>
                          </div>
                          <div className="d-flex justify-content-between pt-2 small" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.14)' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.78)' }}>Phí nền tảng dự kiến (5% đơn online):</span>
                            <span style={{ color: '#fca5a5' }} className="fw-semibold">
                              -{Number(analytics?.platformFeeEstimate || 0).toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto pt-3 small" style={{ color: 'rgba(255, 255, 255, 0.76)' }}>
                          <i className="bi bi-bank me-1" style={{ color: '#86efac' }}></i>
                          Tài khoản đối soát: <strong className="text-white">{currentFacility.bankName || 'Chưa cấu hình'}</strong>{' '}
                          {currentFacility.bankAccountNo ? `(${currentFacility.bankAccountNo})` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-8">
                      <div className="editorial-panel-card p-4 h-100">
                        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                          <div>
                            <span className="hero-eyebrow mb-1">
                              <span className="hero-eyebrow-dot"></span>
                              SỔ GIAO DỊCH
                            </span>
                            <h6 className="fw-bold text-dark mb-0">Chi tiết giao dịch phát sinh tại cơ sở</h6>
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-success btn-sm rounded-3 fw-semibold"
                            onClick={handleExportFinanceCsv}
                          >
                            <i className="bi bi-file-earmark-spreadsheet me-1"></i> Xuất báo cáo CSV
                          </button>
                        </div>

                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light small text-muted">
                              <tr>
                                <th>MÃ ĐƠN</th>
                                <th>NGÀY CHƠI</th>
                                <th>SÂN CON & GIỜ</th>
                                <th>HÌNH THỨC</th>
                                <th>TRẠNG THÁI</th>
                                <th className="text-end">SỐ TIỀN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="text-center py-4 text-muted">
                                    Chưa có giao dịch đặt sân đã xác nhận nào.
                                  </td>
                                </tr>
                              ) : (
                                bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').slice(0, 15).map(b => (
                                  <tr key={b.id}>
                                    <td className="fw-bold">{b.id}</td>
                                    <td className="small text-muted">{b.date}</td>
                                    <td className="small">
                                      <div>{b.subCourtName}</div>
                                      <span className="text-muted">{b.timeSlot}</span>
                                    </td>
                                    <td className="small">{b.paymentMethod}</td>
                                    <td>
                                      <span className={`badge rounded-pill ${b.status === 'COMPLETED' ? 'bg-success' : 'bg-primary'}`}>
                                        {b.status === 'COMPLETED' ? 'Đã Check-in' : 'Đã xác nhận'}
                                      </span>
                                    </td>
                                    <td className="text-end fw-bold text-brand-dark">
                                      {Number(b.totalPrice || 0).toLocaleString('vi-VN')}đ
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 5: CÀI ĐẶT CƠ SỞ
                  ========================================== */}
              {currentFacility && activeTab === 'settings' && (
                <div className="row g-4">
                  <div className="col-lg-8">
                    <div className="editorial-panel-card p-4">
                      <span className="hero-eyebrow mb-1">
                        <span className="hero-eyebrow-dot"></span>
                        HỒ SƠ CƠ SỞ
                      </span>
                      <h6 className="fw-bold text-dark mb-3">Hồ sơ Cụm Sân & Chủ Sân Đối Tác</h6>

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
                            <input type="email" className="form-control bg-light" value={settingsForm.ownerEmail} readOnly />
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

                          <div className="col-12">
                            <label className="form-label small fw-semibold">Ảnh Đại Diện Cụm Sân (URL - tùy chọn)</label>
                            <input
                              type="url"
                              className="form-control"
                              value={settingsForm.image_url}
                              onChange={(e) => setSettingsForm(prev => ({ ...prev, image_url: e.target.value }))}
                              placeholder="https://... (nếu để trống sẽ tự ưu tiên ảnh từ sân con hoặc khung giữ chỗ)"
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

                  <div className="col-lg-4 d-flex flex-column gap-4">
                    <div className="editorial-panel-card p-4 text-center">
                      <span className="hero-eyebrow justify-content-center mb-1">
                        <span className="hero-eyebrow-dot"></span>
                        THANH TOÁN VIETQR
                      </span>
                      <h6 className="fw-bold text-dark mb-3">Mã VietQR Thanh Toán Của Cơ Sở</h6>
                      <div className="p-3 rounded-4 mb-3 d-inline-block border border-success-subtle" style={{ backgroundColor: '#f4f9f6' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`2|99|${settingsForm.bank_account_no}|${settingsForm.bank_name}|0|0|SPORTSBOOKING`)}`}
                          alt="VietQR"
                          className="img-fluid rounded-3"
                          style={{ maxWidth: '160px' }}
                        />
                      </div>
                      <div className="small fw-bold text-dark">{settingsForm.bank_account_name || 'CHỦ TÀI KHOẢN'}</div>
                      <div className="small text-muted">
                        {settingsForm.bank_name || 'Chưa có ngân hàng'} - {settingsForm.bank_account_no || 'Chưa có STK'}
                      </div>
                      <p className="text-muted small mt-2 mb-0" style={{ fontSize: '0.75rem' }}>
                        Mã QR cập nhật trực tiếp theo thông tin tài khoản bạn nhập để khách quét chuyển khoản khi đặt sân.
                      </p>
                    </div>

                    <div className="editorial-panel-card p-4">
                      <span className="hero-eyebrow mb-1">
                        <span className="hero-eyebrow-dot"></span>
                        KHUNG GIỜ MỞ CỬA
                      </span>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-dark mb-0">
                          <i className="bi bi-clock-history text-brand me-2"></i>
                          Khung Giờ Hoạt Động
                        </h6>
                        <span className="badge bg-brand-light text-brand-dark border border-success-subtle rounded-pill">
                          {activeTimeSlots.length} đang mở
                        </span>
                      </div>
                      <div className="small text-muted mb-3">
                        Giờ mở cửa hiện tại: <strong className="text-dark">{currentFacility.openTime}</strong>
                      </div>
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {activeTimeSlots.slice(0, 8).map((s) => (
                          <span key={s.slotId} className="badge bg-light text-dark border fw-normal rounded-2">
                            {s.label}
                            {s.isPeak && (
                              <i className="bi bi-star-fill text-warning ms-1" style={{ fontSize: '0.62rem' }} title="Giờ vàng"></i>
                            )}
                          </span>
                        ))}
                        {activeTimeSlots.length > 8 && (
                          <span className="badge bg-secondary-subtle text-secondary fw-normal rounded-2">
                            +{activeTimeSlots.length - 8} ca khác
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm w-100 rounded-3 fw-semibold"
                        onClick={() => openTimeSlotsModal('single')}
                      >
                        <i className="bi bi-sliders me-1"></i> Tùy chỉnh khung giờ đặt sân
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}

      {/* ========================================================
          MODAL 1: THÊM / SỬA SÂN CON
          ======================================================== */}
      {showAddCourtModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold">
                  {editingCourt ? 'Chỉnh Sửa Thông Tin Sân' : 'Thêm Sân Con Mới Vào Cụm Sân'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAddCourtModal(false)}></button>
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
                        defaultValue={editingCourt ? editingCourt.name : ''}
                        placeholder={`Ví dụ: Sân Số ${currentSubCourts.length + 1}`}
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
                          <option key={st.sport_type_id} value={st.sport_type_id}>{st.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Loại Sân</label>
                      <input
                        type="text"
                        name="courtType"
                        className="form-control"
                        defaultValue={editingCourt ? editingCourt.courtType : ''}
                        placeholder="Ví dụ: Ngoài trời có mái che"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Mặt Sân Thi Đấu</label>
                      <input
                        type="text"
                        name="surfaceType"
                        className="form-control"
                        defaultValue={editingCourt ? editingCourt.surfaceType : ''}
                        placeholder="Ví dụ: Cỏ nhân tạo chuẩn quốc tế"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Tiện Ích Sân (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        name="amenitiesText"
                        className="form-control"
                        defaultValue={editingCourt ? (editingCourt.amenities || []).join(', ') : ''}
                        placeholder="Ví dụ: Đèn LED 400W, Nước uống, Bãi đỗ xe"
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
                        defaultValue={editingCourt ? editingCourt.priceNormal : ''}
                        placeholder="Ví dụ: 200000"
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
                        defaultValue={editingCourt ? editingCourt.pricePeak : ''}
                        placeholder="Ví dụ: 300000"
                        step="10000"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Đường Dẫn Hình Ảnh Thực Tế Của Sân (tùy chọn)</label>
                      <input
                        type="url"
                        name="imageUrl"
                        className="form-control"
                        defaultValue={editingCourt ? editingCourt.imageUrl : ''}
                        placeholder="https://... (để trống nếu chưa có ảnh)"
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
                            <input type="checkbox" name="isVisible" id="subCourtVisible" className="form-check-input" defaultChecked={editingCourt.isVisible} />
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
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddCourtModal(false)}>Hủy</button>
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
          MODAL 2: ĐẶT SÂN TẠI QUẦY (WALK-IN -> POSTGRESQL)
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
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowWalkInModal(false)}></button>
              </div>

              <form onSubmit={handleCreateWalkIn}>
                <div className="modal-body p-4">
                  {walkInError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {walkInError}
                    </div>
                  )}
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Chọn Sân Con (*)</label>
                      <select
                        className="form-select"
                        value={walkInForm.subCourtId}
                        onChange={(e) => handleWalkInSubOrSlotChange(e.target.value, walkInForm.slotId)}
                      >
                        {currentSubCourts.length === 0 && <option value="">Sân tiêu chuẩn</option>}
                        {currentSubCourts.map(c => (
                          <option key={c.id} value={c.id} disabled={c.status !== 'ACTIVE'}>
                            {c.name} ({c.sportType}){c.status !== 'ACTIVE' ? ` - [${c.status}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Tên Khách Hàng (*)</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="Nguyễn Văn A"
                        value={walkInForm.customerName}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, customerName: e.target.value }))}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Số Điện Thoại (*)</label>
                      <input
                        type="tel"
                        className="form-control"
                        required
                        placeholder="0901234567"
                        value={walkInForm.customerPhone}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Ngày Chơi</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={walkInForm.date}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Khung Giờ Chơi (*)</label>
                      <select
                        className="form-select"
                        required
                        value={walkInForm.slotId}
                        onChange={(e) => handleWalkInSubOrSlotChange(walkInForm.subCourtId, e.target.value)}
                      >
                        {activeTimeSlots.map(s => (
                          <option key={s.slotId} value={s.slotId}>
                            {s.label} {s.isPeak ? '(Giờ vàng)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Tiền Thu (VNĐ)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="10000"
                        value={walkInForm.price}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Hình Thức Thanh Toán</label>
                      <select
                        className="form-select"
                        value={walkInForm.paymentMethod}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      >
                        <option value="Tiền mặt tại quầy">Tiền mặt tại quầy</option>
                        <option value="Chuyển khoản VietQR">Chuyển khoản VietQR</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Trạng Thái Nhận Khách</label>
                      <select
                        className="form-select"
                        value={walkInForm.status}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="CONFIRMED">Đặt trước / Giữ chỗ (CONFIRMED)</option>
                        <option value="COMPLETED">Khách đang vào sân (Check-in ngay)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Ghi Chú</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: Thuê 2 vợt, đặt qua Zalo..."
                        value={walkInForm.note}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, note: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowWalkInModal(false)}>Hủy</button>
                  <button type="submit" disabled={walkInSaving} className="btn btn-success px-4">
                    {walkInSaving ? 'Đang lưu...' : 'Xác Nhận Nhận Khách'}
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
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBookingDetail(null)}></button>
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
                  <div className="list-group-item d-flex justify-content-between align-items-center px-0">
                    <span className="text-muted">Trạng thái đơn:</span>
                    <span className={`badge rounded-pill ${getBookingBadge(selectedBookingDetail.status).cls}`}>
                      {getBookingBadge(selectedBookingDetail.status).label}
                    </span>
                  </div>
                  {selectedBookingDetail.note && (
                    <div className="list-group-item px-0">
                      <span className="text-muted d-block mb-1">Ghi chú:</span>
                      <div className="p-2 bg-light rounded text-dark">{selectedBookingDetail.note}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer bg-light d-flex justify-content-between">
                <div>
                  {(selectedBookingDetail.status === 'PENDING' || selectedBookingDetail.status === 'CONFIRMED') && (
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleUpdateBookingStatus(selectedBookingDetail.id, 'CANCELLED', selectedBookingDetail.status)}
                    >
                      {selectedBookingDetail.status === 'PENDING' ? 'Từ chối / Hủy đơn' : 'Hủy Đơn Đặt'}
                    </button>
                  )}
                </div>
                <div className="d-flex gap-2">
                  {selectedBookingDetail.status === 'PENDING' && (
                    <button
                      className="btn btn-warning text-dark fw-semibold btn-sm"
                      onClick={() => handleUpdateBookingStatus(selectedBookingDetail.id, 'CONFIRMED', selectedBookingDetail.status)}
                    >
                      <i className="bi bi-check-circle me-1"></i>Xác Nhận Đơn Đặt
                    </button>
                  )}
                  {selectedBookingDetail.status === 'CONFIRMED' && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleUpdateBookingStatus(selectedBookingDetail.id, 'COMPLETED', selectedBookingDetail.status)}
                    >
                      Xác Nhận Check-in
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedBookingDetail(null)}>Đóng</button>
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
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowFacilityModal(false)}></button>
              </div>

              <form onSubmit={handleCreateFacility}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label small fw-semibold">Tên Cụm Sân (*)</label>
                      <input type="text" name="facilityName" className="form-control" required placeholder="Ví dụ: The Yard Quận 2 - Cơ sở 2" />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold">Bộ Môn Thể Thao Chính (*)</label>
                      <select name="sportTypeId" className="form-select" required defaultValue={sportTypes[0]?.sport_type_id || ''}>
                        {sportTypes.map(st => (
                          <option key={st.sport_type_id} value={st.sport_type_id}>{st.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Địa Chỉ Chi Tiết (*)</label>
                      <input type="text" name="address" className="form-control" required placeholder="Số nhà, Tên đường, Phường/Xã, Quận/Huyện" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Thành Phố / Khu Vực</label>
                      <input type="text" name="area" className="form-control" placeholder="Ví dụ: TP. Hồ Chí Minh" />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Giá Thuê Tham Khảo (VNĐ/slot) (*)</label>
                      <input type="number" name="pricePerSlot" className="form-control" required min="0" step="10000" placeholder="Ví dụ: 200000" />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Tiện Ích & Mô Tả Cụm Sân</label>
                      <input type="text" name="description" className="form-control" placeholder="Ví dụ: Bãi đỗ xe, Đèn LED ban đêm, Phòng thay đồ" />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Ảnh Đại Diện Cụm Sân (URL - tùy chọn)</label>
                      <input type="url" name="imageUrl" className="form-control" placeholder="https://... (để trống nếu chưa có ảnh)" />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Giờ mở cửa mặc định</label>
                      <input type="time" name="openTime" className="form-control" defaultValue="06:00" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Giờ đóng cửa mặc định</label>
                      <input type="time" name="closeTime" className="form-control" defaultValue="22:00" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Thời lượng mỗi ca</label>
                      <select name="slotDuration" className="form-select" defaultValue="60">
                        <option value="30">30 phút / ca</option>
                        <option value="45">45 phút / ca</option>
                        <option value="60">60 phút (1 giờ)</option>
                        <option value="90">90 phút (1.5 giờ)</option>
                        <option value="120">120 phút (2 giờ)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowFacilityModal(false)}>Hủy</button>
                  <button type="submit" disabled={facilitySaving} className="btn btn-brand px-4">
                    {facilitySaving ? 'Đang tạo...' : 'Tạo Cụm Sân'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: KHÓA KHUNG GIỜ (COURT BLOCKS -> POSTGRESQL)
          ======================================================== */}
      {showBlockModal && currentFacility && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-lock-fill me-2"></i>
                  Khóa Khung Giờ Sân
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowBlockModal(false)}></button>
              </div>

              <form onSubmit={handleCreateBlock}>
                <div className="modal-body p-4">
                  {blockError && (
                    <div className="alert alert-danger py-2 small mb-3">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>
                      {blockError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Áp dụng cho sân</label>
                    <select
                      className="form-select"
                      value={blockForm.subCourtId}
                      onChange={(e) => setBlockForm(prev => ({ ...prev, subCourtId: e.target.value }))}
                    >
                      <option value="">Toàn bộ cụm sân ({currentFacility.name})</option>
                      {currentSubCourts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Ngày khóa</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={blockForm.date}
                        onChange={(e) => setBlockForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Khung giờ (*)</label>
                      <select
                        className="form-select"
                        required
                        value={blockForm.slotId}
                        onChange={(e) => setBlockForm(prev => ({ ...prev, slotId: e.target.value }))}
                      >
                        {activeTimeSlots.map(s => (
                          <option key={s.slotId} value={s.slotId}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Lý do khóa (*)</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Ví dụ: Bảo trì đèn, Giải đấu nội bộ..."
                      value={blockForm.reason}
                      onChange={(e) => setBlockForm(prev => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBlockModal(false)}>Hủy</button>
                  <button type="submit" disabled={blockSaving} className="btn btn-danger px-4">
                    {blockSaving ? 'Đang khóa...' : 'Xác Nhận Khóa Giờ'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: THIẾT LẬP & QUẢN LÝ KHUNG GIỜ (TIME SLOTS -> POSTGRESQL)
          ======================================================== */}
      {showTimeSlotsModal && currentFacility && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border shadow rounded-3">
              <div className="modal-header bg-brand-dark text-white">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    <i className="bi bi-clock-history me-2"></i>
                    Thiết Lập Khung Giờ Hoạt Động: {currentFacility.name}
                  </h5>
                  <div className="small text-white-50">
                    Tự tạo khung giờ theo mô hình sân, đánh dấu Giờ vàng và bật/tắt nhận đặt trực tuyến
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowTimeSlotsModal(false)}
                ></button>
              </div>

              <div className="modal-body p-4 bg-light">
                {slotModalError && (
                  <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center justify-content-between">
                    <span>
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {slotModalError}
                    </span>
                    <button type="button" className="btn-close btn-sm" onClick={() => setSlotModalError('')}></button>
                  </div>
                )}

                <div className="row g-4">
                  {/* Left: Single Slot Form OR Batch Generator */}
                  <div className="col-lg-5">
                    <div className="card border rounded-3 bg-white p-3 h-100">
                      <div className="btn-group w-100 mb-3" role="group">
                        <button
                          type="button"
                          className={`btn btn-sm fw-semibold ${slotModalMode === 'single' ? 'btn-brand' : 'btn-outline-secondary'}`}
                          onClick={() => { setSlotModalError(''); setSlotModalMode('single'); }}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          {editingTimeSlot ? 'Đang sửa khung giờ' : 'Thêm từng khung giờ'}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm fw-semibold ${slotModalMode === 'batch' ? 'btn-brand' : 'btn-outline-secondary'}`}
                          onClick={() => { setSlotModalError(''); setEditingTimeSlot(null); setSlotModalMode('batch'); }}
                        >
                          <i className="bi bi-lightning-charge me-1"></i>
                          Tạo nhanh hàng loạt
                        </button>
                      </div>

                      {slotModalMode === 'single' ? (
                        <form onSubmit={handleSaveSingleSlot}>
                          {editingTimeSlot?.bookingCount > 0 && (
                            <div className="alert alert-info py-2 px-3 small mb-3">
                              Khung giờ <strong>{editingTimeSlot.label}</strong> đã có {editingTimeSlot.bookingCount} đơn đặt nên mốc giờ được giữ nguyên; bạn vẫn có thể đổi <strong>Giờ vàng</strong> hoặc <strong>Tạm ẩn</strong>.
                            </div>
                          )}

                          <div className="row g-2 mb-3">
                            <div className="col-6">
                              <label className="form-label small fw-semibold">Giờ bắt đầu (*)</label>
                              <input
                                type="time"
                                className="form-control"
                                required
                                disabled={Boolean(editingTimeSlot?.bookingCount > 0)}
                                value={slotForm.startTime}
                                onChange={(e) => {
                                  const nextStart = e.target.value;
                                  const mins = timeToMinutes(nextStart);
                                  setSlotForm((prev) => ({
                                    ...prev,
                                    startTime: nextStart,
                                    isPeak: mins !== null ? (mins >= 17 * 60 && mins < 21 * 60) : prev.isPeak
                                  }));
                                }}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label small fw-semibold">Giờ kết thúc (*)</label>
                              <input
                                type="time"
                                className="form-control"
                                required
                                disabled={Boolean(editingTimeSlot?.bookingCount > 0)}
                                value={slotForm.endTime}
                                onChange={(e) => setSlotForm((prev) => ({ ...prev, endTime: e.target.value }))}
                              />
                            </div>
                          </div>

                          {!(editingTimeSlot?.bookingCount > 0) && (
                            <div className="mb-3">
                              <div className="small text-muted mb-1">Chọn nhanh thời lượng từ giờ bắt đầu:</div>
                              <div className="d-flex flex-wrap gap-1">
                                {[30, 60, 90, 120].map((mins) => (
                                  <button
                                    key={mins}
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm py-0 px-2"
                                    style={{ fontSize: '0.78rem' }}
                                    onClick={() =>
                                      setSlotForm((prev) => ({
                                        ...prev,
                                        endTime: addMinutesToHHMM(prev.startTime, mins)
                                      }))
                                    }
                                  >
                                    +{mins} phút
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-light rounded-3 p-3 mb-3 d-flex flex-column gap-2">
                            <div className="form-check form-switch mb-0">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                id="slotIsPeakSwitch"
                                checked={slotForm.isPeak}
                                onChange={(e) => setSlotForm((prev) => ({ ...prev, isPeak: e.target.checked }))}
                              />
                              <label className="form-check-label small fw-semibold" htmlFor="slotIsPeakSwitch">
                                <i className="bi bi-star-fill text-warning me-1"></i>
                                Áp dụng giá Giờ vàng
                              </label>
                            </div>
                            <div className="form-check form-switch mb-0">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                id="slotIsActiveSwitch"
                                checked={slotForm.isActive}
                                onChange={(e) => setSlotForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                              />
                              <label className="form-check-label small fw-semibold" htmlFor="slotIsActiveSwitch">
                                Mở hiển thị cho khách đặt ngay
                              </label>
                            </div>
                          </div>

                          <div className="d-flex gap-2">
                            {editingTimeSlot && (
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={handleResetSlotForm}
                              >
                                Hủy sửa
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={slotSaving}
                              className="btn btn-brand flex-grow-1 fw-semibold"
                            >
                              {slotSaving
                                ? 'Đang lưu...'
                                : editingTimeSlot
                                  ? 'Lưu Thay Đổi'
                                  : 'Thêm Khung Giờ'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <form onSubmit={handleGenerateBatchSlots}>
                          <div className="row g-2 mb-3">
                            <div className="col-6">
                              <label className="form-label small fw-semibold">Từ giờ (*)</label>
                              <input
                                type="time"
                                className="form-control"
                                required
                                value={batchSlotForm.openTime}
                                onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, openTime: e.target.value }))}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label small fw-semibold">Đến giờ (*)</label>
                              <input
                                type="time"
                                className="form-control"
                                required
                                value={batchSlotForm.closeTime}
                                onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, closeTime: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="form-label small fw-semibold">Thời lượng mỗi khung giờ</label>
                            <select
                              className="form-select"
                              value={batchSlotForm.durationMinutes}
                              onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                            >
                              <option value={30}>30 phút / ca</option>
                              <option value={45}>45 phút / ca</option>
                              <option value={60}>60 phút (1 giờ / ca)</option>
                              <option value={90}>90 phút (1.5 giờ / ca)</option>
                              <option value={120}>120 phút (2 giờ / ca)</option>
                            </select>
                          </div>

                          <div className="bg-light rounded-3 p-3 mb-3">
                            <div className="form-check form-switch mb-2">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                id="batchPeakToggle"
                                checked={batchSlotForm.applyPeak}
                                onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, applyPeak: e.target.checked }))}
                              />
                              <label className="form-check-label small fw-semibold" htmlFor="batchPeakToggle">
                                <i className="bi bi-star-fill text-warning me-1"></i>
                                Tự động đánh dấu Giờ vàng trong khoảng:
                              </label>
                            </div>
                            {batchSlotForm.applyPeak && (
                              <div className="row g-2">
                                <div className="col-6">
                                  <input
                                    type="time"
                                    className="form-control form-control-sm"
                                    value={batchSlotForm.peakStart}
                                    onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, peakStart: e.target.value }))}
                                  />
                                </div>
                                <div className="col-6">
                                  <input
                                    type="time"
                                    className="form-control form-control-sm"
                                    value={batchSlotForm.peakEnd}
                                    onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, peakEnd: e.target.value }))}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="form-check mb-3">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="batchReplaceToggle"
                              checked={batchSlotForm.replaceExisting}
                              onChange={(e) => setBatchSlotForm((prev) => ({ ...prev, replaceExisting: e.target.checked }))}
                            />
                            <label className="form-check-label small" htmlFor="batchReplaceToggle">
                              Thay thế toàn bộ khung giờ hiện tại (nếu bỏ chọn sẽ chỉ thêm các ca chưa trùng)
                            </label>
                          </div>

                          <div className="alert alert-success py-2 px-3 small mb-3">
                            <i className="bi bi-calendar2-range me-1"></i>
                            Dự kiến tạo{' '}
                            <strong>
                              {estimateGeneratedSlotsCount(
                                batchSlotForm.openTime,
                                batchSlotForm.closeTime,
                                batchSlotForm.durationMinutes
                              )}
                            </strong>{' '}
                            khung giờ ({batchSlotForm.openTime} - {batchSlotForm.closeTime}, mỗi ca {batchSlotForm.durationMinutes}p).
                          </div>

                          <button
                            type="submit"
                            disabled={
                              slotSaving ||
                              estimateGeneratedSlotsCount(
                                batchSlotForm.openTime,
                                batchSlotForm.closeTime,
                                batchSlotForm.durationMinutes
                              ) === 0
                            }
                            className="btn btn-brand w-100 fw-semibold"
                          >
                            {slotSaving ? 'Đang xử lý...' : 'Tạo Nhanh Hàng Loạt'}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>

                  {/* Right: Current Time Slots Table */}
                  <div className="col-lg-7">
                    <div className="card border rounded-3 bg-white p-3 h-100">
                      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div>
                          <h6 className="fw-bold text-dark mb-0">
                            Danh sách khung giờ ({timeSlots.length})
                          </h6>
                          <span className="small text-muted">
                            {timeSlots.filter(s => s.isActive).length} đang mở đặt •{' '}
                            {timeSlots.filter(s => !s.isActive).length} tạm ẩn
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => loadTimeSlots(currentFacility.id)}
                          disabled={timeSlotsLoading}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>Làm mới
                        </button>
                      </div>

                      {timeSlotsLoading ? (
                        <div className="text-center py-5 text-muted small">
                          <div className="spinner-border spinner-border-sm text-success me-2"></div>
                          Đang tải khung giờ...
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center py-5 text-muted small">
                          <i className="bi bi-clock fs-2 d-block mb-2"></i>
                          Chưa có khung giờ nào. Hãy thêm khung giờ lẻ hoặc bấm <strong>Tạo nhanh hàng loạt</strong> bên trái!
                        </div>
                      ) : (
                        <div className="table-responsive" style={{ maxHeight: '430px', overflowY: 'auto' }}>
                          <table className="table table-hover align-middle mb-0 small">
                            <thead className="table-light sticky-top">
                              <tr>
                                <th>KHUNG GIỜ</th>
                                <th>THỜI LƯỢNG</th>
                                <th>LOẠI GIÁ</th>
                                <th>TRẠNG THÁI</th>
                                <th className="text-center">ĐÃ ĐẶT</th>
                                <th className="text-end">THAO TÁC</th>
                              </tr>
                            </thead>
                            <tbody>
                              {timeSlots.map((slot) => (
                                <tr
                                  key={slot.slotId}
                                  className={!slot.isActive ? 'table-light text-muted' : undefined}
                                >
                                  <td className="fw-bold text-nowrap">
                                    <i className="bi bi-clock me-1 text-secondary"></i>
                                    {slot.label}
                                  </td>
                                  <td>{slot.durationMinutes} phút</td>
                                  <td>
                                    <button
                                      type="button"
                                      disabled={slotSaving}
                                      className={`btn btn-sm py-0 px-2 rounded-pill fw-semibold ${
                                        slot.isPeak
                                          ? 'btn-warning text-dark'
                                          : 'btn-outline-secondary'
                                      }`}
                                      style={{ fontSize: '0.72rem' }}
                                      title="Bấm để chuyển đổi Giờ vàng / Giờ thường"
                                      onClick={() => handleToggleSlotField(slot, 'isPeak')}
                                    >
                                      {slot.isPeak ? (
                                        <>
                                          <i className="bi bi-star-fill me-1"></i>Giờ vàng
                                        </>
                                      ) : (
                                        'Giờ thường'
                                      )}
                                    </button>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      disabled={slotSaving}
                                      className={`btn btn-sm py-0 px-2 rounded-pill fw-semibold border ${
                                        slot.isActive
                                          ? 'bg-success-subtle text-success border-success-subtle'
                                          : 'bg-secondary-subtle text-secondary border-secondary-subtle'
                                      }`}
                                      style={{ fontSize: '0.72rem' }}
                                      title="Bấm để bật / tạm ẩn khung giờ"
                                      onClick={() => handleToggleSlotField(slot, 'isActive')}
                                    >
                                      {slot.isActive ? 'Đang mở' : 'Tạm ẩn'}
                                    </button>
                                  </td>
                                  <td className="text-center">
                                    {slot.bookingCount > 0 ? (
                                      <span className="badge bg-primary-subtle text-primary" title={`${slot.activeBookingCount} đơn đang hoạt động`}>
                                        {slot.bookingCount} đơn
                                      </span>
                                    ) : (
                                      <span className="text-muted">0</span>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        title="Sửa khung giờ"
                                        onClick={() => handleSelectSlotToEdit(slot)}
                                      >
                                        <i className="bi bi-pencil"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        disabled={slotSaving}
                                        title={slot.bookingCount > 0 ? 'Tạm ẩn khung giờ (đã có đơn đặt)' : 'Xóa khung giờ'}
                                        onClick={() => handleDeleteTimeSlot(slot)}
                                      >
                                        <i className={`bi ${slot.bookingCount > 0 ? 'bi-eye-slash' : 'bi-trash'}`}></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer bg-white">
                <button
                  type="button"
                  className="btn btn-secondary px-4"
                  onClick={() => setShowTimeSlotsModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
