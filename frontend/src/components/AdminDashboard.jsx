import React, { useState, useEffect, useCallback } from 'react';
import AccountMenu from './AccountMenu';
import { formatDisplayDate, getStoredToken } from '../utils/vietqr';

const API_BASE = 'http://localhost:5000/api/admin';

const formatCompactMoney = (amount) => {
  const num = Number(amount || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}k`;
  return `${num}đ`;
};

const formatDateTime = (isoVal) => {
  if (!isoVal) return '—';
  const d = new Date(isoVal);
  if (Number.isNaN(d.getTime())) return String(isoVal);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getBookingBadge = (status) => {
  switch (status) {
    case 'PENDING':
      return { cls: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle', label: 'Chờ xác nhận' };
    case 'CONFIRMED':
      return { cls: 'bg-primary-subtle text-primary border border-primary-subtle', label: 'Đã xác nhận' };
    case 'COMPLETED':
      return { cls: 'bg-success-subtle text-success border border-success-subtle', label: 'Đã Check-in' };
    case 'CANCELLED':
      return { cls: 'bg-danger-subtle text-danger border border-danger-subtle', label: 'Đã hủy' };
    default:
      return { cls: 'bg-secondary-subtle text-secondary', label: status || 'Khác' };
  }
};

const getCourtStatusBadge = (operationalStatus, isVisible) => {
  if (operationalStatus === 'ACTIVE' && isVisible) {
    return { cls: 'bg-success-subtle text-success border border-success-subtle', label: 'Đang hiển thị' };
  }
  if (operationalStatus === 'INACTIVE' && !isVisible) {
    return { cls: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle', label: 'Chờ duyệt / Tạm ngưng' };
  }
  return { cls: 'bg-secondary-subtle text-secondary border', label: 'Đang ẩn' };
};

export default function AdminDashboard({
  currentUser,
  onBackToHome,
  onLogout,
  onOpenAuth,
  onOpenProfile,
  onOpenMyBookings,
  onOpenCourt
}) {
  const isAuthorizedAdmin = Boolean(currentUser && currentUser.role === 'ADMIN');

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'courts' | 'users' | 'bookings' | 'catalog'
  const [toastMessage, setToastMessage] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  // Overview
  const [overviewDays, setOverviewDays] = useState(7);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Courts (Facilities & Moderation)
  const [courts, setCourts] = useState([]);
  const [courtsLoading, setCourtsLoading] = useState(false);
  const [courtStatusFilter, setCourtStatusFilter] = useState('ALL');
  const [courtSportFilter, setCourtSportFilter] = useState('ALL');
  const [courtKeyword, setCourtKeyword] = useState('');
  const [selectedCourtModal, setSelectedCourtModal] = useState(null);

  // Users
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userKeyword, setUserKeyword] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'USER',
    businessName: ''
  });
  const [createUserSaving, setCreateUserSaving] = useState(false);
  const [createUserError, setCreateUserError] = useState('');

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingCourtFilter, setBookingCourtFilter] = useState('ALL');
  const [bookingDateFilter, setBookingDateFilter] = useState('');
  const [bookingKeyword, setBookingKeyword] = useState('');
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);

  // Catalog: Sport Types & Reviews
  const [sportTypes, setSportTypes] = useState([]);
  const [sportTypesLoading, setSportTypesLoading] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const [editingSport, setEditingSport] = useState(null);
  const [sportForm, setSportForm] = useState({ name: '', description: '', status: 'ACTIVE' });
  const [sportSaving, setSportSaving] = useState(false);
  const [sportModalError, setSportModalError] = useState('');

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState('ALL');
  const [reviewKeyword, setReviewKeyword] = useState('');

  // Reusable Action Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [actionBusyKey, setActionBusyKey] = useState('');

  const notify = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4200);
  }, []);

  const authFetch = useCallback(async (path, options = {}) => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Không thể kết nối máy chủ quản trị.');
    }
    return json;
  }, []);

  const loadOverview = useCallback(
    async (daysVal = overviewDays) => {
      if (!isAuthorizedAdmin) return;
      setOverviewLoading(true);
      setErrorBanner('');
      try {
        const json = await authFetch(`/overview?days=${daysVal}`);
        setOverview(json.data || null);
      } catch (err) {
        setErrorBanner(err.message);
      } finally {
        setOverviewLoading(false);
      }
    },
    [authFetch, isAuthorizedAdmin, overviewDays]
  );

  const loadCourts = useCallback(async () => {
    if (!isAuthorizedAdmin) return;
    setCourtsLoading(true);
    try {
      const json = await authFetch('/courts');
      setCourts(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setCourtsLoading(false);
    }
  }, [authFetch, isAuthorizedAdmin]);

  const loadUsers = useCallback(async () => {
    if (!isAuthorizedAdmin) return;
    setUsersLoading(true);
    try {
      const json = await authFetch('/users');
      setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [authFetch, isAuthorizedAdmin]);

  const loadBookings = useCallback(async () => {
    if (!isAuthorizedAdmin) return;
    setBookingsLoading(true);
    try {
      const json = await authFetch('/bookings?limit=200');
      setBookings(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setBookingsLoading(false);
    }
  }, [authFetch, isAuthorizedAdmin]);

  const loadSportTypes = useCallback(async () => {
    if (!isAuthorizedAdmin) return;
    setSportTypesLoading(true);
    try {
      const json = await authFetch('/sport-types');
      setSportTypes(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setSportTypesLoading(false);
    }
  }, [authFetch, isAuthorizedAdmin]);

  const loadReviews = useCallback(async () => {
    if (!isAuthorizedAdmin) return;
    setReviewsLoading(true);
    try {
      const json = await authFetch('/reviews');
      setReviews(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setReviewsLoading(false);
    }
  }, [authFetch, isAuthorizedAdmin]);

  const refreshAll = useCallback(() => {
    loadOverview(overviewDays);
    loadCourts();
    loadUsers();
    loadBookings();
    loadSportTypes();
    loadReviews();
  }, [loadOverview, loadCourts, loadUsers, loadBookings, loadSportTypes, loadReviews, overviewDays]);

  useEffect(() => {
    if (isAuthorizedAdmin) {
      refreshAll();
    }
  }, [isAuthorizedAdmin, refreshAll]);

  // ==========================================
  // MUTATION HANDLERS
  // ==========================================
  const executeCourtStatus = async (court, action) => {
    const busyKey = `court-${court.courtId}`;
    setActionBusyKey(busyKey);
    try {
      const json = await authFetch(`/courts/${court.courtId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ action })
      });
      notify(json.message);
      await Promise.all([loadCourts(), loadOverview(overviewDays)]);
      if (selectedCourtModal?.courtId === court.courtId) {
        setSelectedCourtModal((prev) =>
          prev
            ? {
                ...prev,
                operationalStatus: json.data.operationalStatus,
                isVisible: json.data.isVisible
              }
            : null
        );
      }
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setActionBusyKey('');
    }
  };

  const requestCourtStatusChange = (court, action) => {
    if (action === 'APPROVE') {
      executeCourtStatus(court, 'APPROVE');
      return;
    }
    setConfirmReason('');
    setConfirmDialog({
      title: 'Tạm ngưng & Ẩn cụm sân',
      message: `Cụm sân "${court.name}" sẽ tạm ngưng nhận đặt mới và ẩn khỏi danh sách tìm kiếm công khai cho đến khi được kích hoạt lại.`,
      confirmLabel: 'Xác nhận tạm ngưng',
      confirmVariant: 'btn-danger',
      requireReason: false,
      onConfirm: async () => {
        await executeCourtStatus(court, 'SUSPEND');
      }
    });
  };

  const handleToggleUserStatus = (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setConfirmReason('');
    setConfirmDialog({
      title: nextStatus === 'LOCKED' ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản',
      message:
        nextStatus === 'LOCKED'
          ? `Tài khoản "${user.fullName}" (${user.email}) sẽ không thể đăng nhập hoặc đặt sân cho tới khi được mở khóa.`
          : `Khôi phục quyền truy cập cho tài khoản "${user.fullName}" (${user.email}).`,
      confirmLabel: nextStatus === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa ngay',
      confirmVariant: nextStatus === 'LOCKED' ? 'btn-danger' : 'btn-brand',
      requireReason: false,
      onConfirm: async () => {
        const json = await authFetch(`/users/${user.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus })
        });
        notify(json.message);
        await Promise.all([loadUsers(), loadOverview(overviewDays)]);
      }
    });
  };

  const handleChangeUserRole = (user, nextRole) => {
    if (user.role === nextRole) return;
    setConfirmReason('');
    setConfirmDialog({
      title: 'Thay đổi vai trò tài khoản',
      message: `Chuyển vai trò tài khoản "${user.fullName}" (${user.email}) từ ${user.role} sang ${nextRole}?`,
      confirmLabel: 'Cập nhật vai trò',
      confirmVariant: 'btn-brand',
      requireReason: false,
      onConfirm: async () => {
        const json = await authFetch(`/users/${user.id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: nextRole })
        });
        notify(json.message);
        await Promise.all([loadUsers(), loadOverview(overviewDays)]);
      }
    });
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSaving(true);
    try {
      const json = await authFetch('/users', {
        method: 'POST',
        body: JSON.stringify(createUserForm)
      });
      notify(json.message);
      setShowCreateUserModal(false);
      setCreateUserForm({ fullName: '', email: '', phone: '', password: '', role: 'USER', businessName: '' });
      await Promise.all([loadUsers(), loadOverview(overviewDays)]);
    } catch (err) {
      setCreateUserError(err.message);
    } finally {
      setCreateUserSaving(false);
    }
  };

  const executeBookingStatus = async (booking, nextStatus, reason = '') => {
    const busyKey = `booking-${booking.id}`;
    setActionBusyKey(busyKey);
    try {
      const json = await authFetch(`/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, reason })
      });
      notify(json.message);
      await Promise.all([loadBookings(), loadOverview(overviewDays)]);
      if (selectedBookingDetail?.id === booking.id) {
        setSelectedBookingDetail((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                cancelReason: nextStatus === 'CANCELLED' ? reason || prev.cancelReason : prev.cancelReason
              }
            : null
        );
      }
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setActionBusyKey('');
    }
  };

  const requestCancelBooking = (booking) => {
    setConfirmReason('Quản trị viên hủy đơn đặt sân theo yêu cầu hỗ trợ');
    setConfirmDialog({
      title: `Hủy đơn ${booking.id}`,
      message: `Hủy đơn tại "${booking.courtName}" (${booking.date} · ${booking.timeSlot}) sẽ giải phóng lại khung giờ trống cho người chơi khác.`,
      confirmLabel: 'Xác nhận hủy đơn',
      confirmVariant: 'btn-danger',
      requireReason: true,
      reasonLabel: 'Lý do hủy đơn',
      onConfirm: async (reasonText) => {
        await executeBookingStatus(booking, 'CANCELLED', reasonText);
      }
    });
  };

  const openAddSportModal = () => {
    setEditingSport(null);
    setSportForm({ name: '', description: '', status: 'ACTIVE' });
    setSportModalError('');
    setShowSportModal(true);
  };

  const openEditSportModal = (sport) => {
    setEditingSport(sport);
    setSportForm({ name: sport.name, description: sport.description || '', status: sport.status || 'ACTIVE' });
    setSportModalError('');
    setShowSportModal(true);
  };

  const handleSaveSportSubmit = async (e) => {
    e.preventDefault();
    setSportModalError('');
    setSportSaving(true);
    try {
      const json = editingSport
        ? await authFetch(`/sport-types/${editingSport.sportTypeId}`, {
            method: 'PUT',
            body: JSON.stringify(sportForm)
          })
        : await authFetch('/sport-types', {
            method: 'POST',
            body: JSON.stringify(sportForm)
          });
      notify(json.message);
      setShowSportModal(false);
      await Promise.all([loadSportTypes(), loadOverview(overviewDays)]);
    } catch (err) {
      setSportModalError(err.message);
    } finally {
      setSportSaving(false);
    }
  };

  const handleToggleSportStatus = async (sport) => {
    const nextStatus = sport.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const json = await authFetch(`/sport-types/${sport.sportTypeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: sport.name,
          description: sport.description,
          status: nextStatus
        })
      });
      notify(json.message);
      await Promise.all([loadSportTypes(), loadOverview(overviewDays)]);
    } catch (err) {
      setErrorBanner(err.message);
    }
  };

  const requestDeleteSport = (sport) => {
    setConfirmReason('');
    setConfirmDialog({
      title: `Xóa bộ môn "${sport.name}"`,
      message: 'Bộ môn chỉ có thể xóa vĩnh viễn khi chưa được gán cho cụm sân hoặc sân con nào.',
      confirmLabel: 'Xóa bộ môn',
      confirmVariant: 'btn-danger',
      requireReason: false,
      onConfirm: async () => {
        const json = await authFetch(`/sport-types/${sport.sportTypeId}`, { method: 'DELETE' });
        notify(json.message);
        await Promise.all([loadSportTypes(), loadOverview(overviewDays)]);
      }
    });
  };

  const requestDeleteReview = (review) => {
    setConfirmReason('');
    setConfirmDialog({
      title: 'Gỡ đánh giá khỏi cụm sân',
      message: `Xóa đánh giá ${review.rating}★ của "${review.reviewerName}" tại cụm sân "${review.courtName}"? Điểm trung bình của sân sẽ tự động tính lại.`,
      confirmLabel: 'Xác nhận gỡ',
      confirmVariant: 'btn-danger',
      requireReason: false,
      onConfirm: async () => {
        const json = await authFetch(`/reviews/${review.reviewId}`, { method: 'DELETE' });
        notify(json.message);
        await Promise.all([loadReviews(), loadOverview(overviewDays), loadCourts()]);
      }
    });
  };

  const handleConfirmDialogSubmit = async (e) => {
    e.preventDefault();
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm(confirmReason.trim());
      setConfirmDialog(null);
      setConfirmReason('');
    } catch (err) {
      setErrorBanner(err.message);
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  };

  const handleExportBookingsCsv = () => {
    if (filteredBookings.length === 0) {
      notify('Không có đơn đặt nào để xuất CSV.');
      return;
    }
    const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['Mã đơn', 'Ngày chơi', 'Khung giờ', 'Cụm sân', 'Sân con', 'Chủ sân', 'Khách hàng', 'SĐT', 'Hình thức', 'Tổng tiền (VNĐ)', 'Trạng thái'];
    const rows = filteredBookings.map((b) => [
      b.id,
      b.date,
      b.timeSlot,
      b.courtName,
      b.subCourtName,
      b.ownerName,
      b.customerName,
      b.customerPhone,
      b.paymentMethod,
      b.totalPrice,
      getBookingBadge(b.status).label
    ]);
    const csvContent = `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sportsbooking-admin-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify('Đã xuất báo cáo đơn đặt sân toàn hệ thống (CSV).');
  };

  // ==========================================
  // ACCESS GATE FOR NON-ADMIN
  // ==========================================
  if (!isAuthorizedAdmin) {
    return (
      <div className="auth-page-wrapper">
        <header className="py-3 bg-white border-bottom">
          <div className="container d-flex justify-content-between align-items-center">
            <a
              href="#home"
              className="text-decoration-none d-flex align-items-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                onBackToHome?.();
              }}
            >
              <span className="brand-mark-box">
                <i className="bi bi-trophy-fill"></i>
              </span>
              <span className="fw-bold fs-5 text-brand-dark">SportsBooking</span>
            </a>
            <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={onBackToHome}>
              <i className="bi bi-arrow-left me-1"></i>Về trang chủ
            </button>
          </div>
        </header>

        <main className="flex-grow-1 d-flex align-items-center justify-content-center p-4">
          <div className="auth-form-card text-center" style={{ maxWidth: '460px', width: '100%' }}>
            <div className="brand-mark-box mx-auto mb-3" style={{ width: '56px', height: '56px', borderRadius: '14px', fontSize: '1.5rem' }}>
              <i className="bi bi-shield-lock-fill"></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Khu vực Quản trị Hệ thống</h4>
            <p className="text-muted small mb-4">
              {currentUser
                ? `Tài khoản "${currentUser.fullName}" (${currentUser.role}) không có quyền Quản trị viên để truy cập cổng điều hành.`
                : 'Vui lòng đăng nhập bằng tài khoản Quản trị viên (ADMIN) để điều hành nền tảng.'}
            </p>
            <div className="d-grid gap-2">
              {!currentUser && (
                <button type="button" className="btn btn-brand py-2 rounded-3" onClick={() => onOpenAuth?.('login')}>
                  Đăng nhập tài khoản Quản trị
                </button>
              )}
              <button type="button" className="btn btn-outline-secondary py-2 rounded-3" onClick={onBackToHome}>
                Quay về trang chủ
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // DERIVED FILTERED LISTS
  // ==========================================
  const pendingCourtsCount = courts.filter((c) => c.operationalStatus === 'INACTIVE' && !c.isVisible).length;

  const filteredCourts = courts.filter((c) => {
    if (courtStatusFilter === 'PENDING_APPROVAL' && !(c.operationalStatus === 'INACTIVE' && !c.isVisible)) return false;
    if (courtStatusFilter === 'ACTIVE' && !(c.operationalStatus === 'ACTIVE' && c.isVisible)) return false;
    if (courtStatusFilter === 'HIDDEN' && c.operationalStatus === 'ACTIVE' && c.isVisible) return false;
    if (courtSportFilter !== 'ALL' && Number(c.sportTypeId) !== Number(courtSportFilter)) return false;
    if (courtKeyword.trim()) {
      const q = courtKeyword.trim().toLowerCase();
      const hay = `${c.name} ${c.address} ${c.area} ${c.ownerName} ${c.ownerEmail} ${c.businessName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false;
    if (userStatusFilter !== 'ALL' && u.status !== userStatusFilter) return false;
    if (userKeyword.trim()) {
      const q = userKeyword.trim().toLowerCase();
      const hay = `${u.fullName} ${u.email} ${u.phone} ${u.businessName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter !== 'ALL' && b.status !== bookingStatusFilter) return false;
    if (bookingCourtFilter !== 'ALL' && Number(b.courtId) !== Number(bookingCourtFilter)) return false;
    if (bookingDateFilter && b.date !== bookingDateFilter) return false;
    if (bookingKeyword.trim()) {
      const q = bookingKeyword.trim().toLowerCase();
      const hay = `${b.id} ${b.customerName} ${b.customerPhone} ${b.courtName} ${b.subCourtName} ${b.ownerName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredReviews = reviews.filter((r) => {
    if (reviewRatingFilter !== 'ALL' && Number(r.rating) !== Number(reviewRatingFilter)) return false;
    if (reviewKeyword.trim()) {
      const q = reviewKeyword.trim().toLowerCase();
      const hay = `${r.comment} ${r.courtName} ${r.reviewerName} ${r.reviewerEmail}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const trendSeries = overview?.trend || [];
  const maxTrendRev = Math.max(100000, ...trendSeries.map((d) => Number(d.revenue || 0)));

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1120, maxWidth: '400px' }}>
          <div className="bg-white border shadow-sm rounded-3 py-2 px-3 d-flex align-items-center gap-2 small text-dark">
            <i className="bi bi-check-circle-fill text-success flex-shrink-0"></i>
            <div className="flex-grow-1">{toastMessage}</div>
            <button type="button" className="btn-close ms-2" style={{ fontSize: '0.68rem' }} onClick={() => setToastMessage('')}></button>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="bg-white border-bottom sticky-top py-3" style={{ zIndex: 1030 }}>
        <div className="container d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <a
              href="#home"
              className="text-decoration-none d-flex align-items-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                onBackToHome?.();
              }}
            >
              <span className="brand-mark-box">
                <i className="bi bi-trophy-fill"></i>
              </span>
              <span className="fw-bold fs-5 text-brand-dark">SportsBooking</span>
            </a>
            <span className="badge rounded-pill bg-brand-light text-brand-dark border border-success-subtle px-2 py-1" style={{ fontSize: '0.72rem' }}>
              Quản Trị Hệ Thống
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {pendingCourtsCount > 0 && (
              <button
                type="button"
                className="btn btn-warning btn-sm rounded-3 fw-semibold text-dark"
                onClick={() => {
                  setCourtStatusFilter('PENDING_APPROVAL');
                  setActiveTab('courts');
                }}
              >
                <i className="bi bi-hourglass-split me-1"></i>
                {pendingCourtsCount} sân chờ duyệt
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-3"
              onClick={refreshAll}
              disabled={overviewLoading}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              Làm mới
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={onBackToHome}>
              <i className="bi bi-house-door me-1"></i> Trang chủ
            </button>
            <AccountMenu
              currentUser={currentUser}
              activeView="admin-dashboard"
              onGoHome={onBackToHome}
              onOpenAdminDashboard={() => setActiveTab('overview')}
              onOpenProfile={onOpenProfile}
              onOpenMyBookings={onOpenMyBookings}
              onLogout={onLogout}
            />
          </div>
        </div>
      </header>

      {/* Architectural Sub-Header & Tabs */}
      <div className="owner-hero-band pt-4 pb-0">
        <div className="container">
          <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3">
            <div>
              <div className="hero-eyebrow mb-2">
                <span className="hero-eyebrow-dot"></span>
                <span>TRUNG TÂM ĐIỀU HÀNH NỀN TẢNG</span>
              </div>
              <h1 className="h3 fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em' }}>
                Quản trị & Kiểm duyệt SportsBooking
              </h1>
              <p className="text-muted small mb-0">
                Theo dõi tăng trưởng toàn sàn, phê duyệt cụm sân đối tác, điều phối tài khoản và giám sát đặt sân.
              </p>
            </div>
            {overview && (
              <div className="d-flex flex-wrap gap-2 small">
                <span className="badge bg-white text-dark border px-3 py-2 rounded-3 fw-semibold">
                  {overview.facilities.active} / {overview.facilities.total} cụm sân mở
                </span>
                <span className="badge bg-white text-dark border px-3 py-2 rounded-3 fw-semibold">
                  {overview.users.total} tài khoản
                </span>
              </div>
            )}
          </div>

          <div className="d-flex gap-4 overflow-auto text-nowrap">
            {[
              { id: 'overview', label: 'Tổng quan', icon: 'bi-speedometer2' },
              {
                id: 'courts',
                label: 'Cụm sân & Duyệt',
                icon: 'bi-buildings',
                badge: pendingCourtsCount > 0 ? pendingCourtsCount : null
              },
              { id: 'users', label: 'Người dùng', icon: 'bi-people' },
              { id: 'bookings', label: 'Đơn đặt sân', icon: 'bi-calendar2-check' },
              { id: 'catalog', label: 'Bộ môn & Đánh giá', icon: 'bi-sliders2' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`owner-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}`}></i>
                <span>{tab.label}</span>
                {tab.badge ? (
                  <span className="badge rounded-pill bg-warning text-dark ms-1" style={{ fontSize: '0.68rem' }}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow-1 py-4">
        <div className="container">
          {errorBanner && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center rounded-3 small mb-4">
              <span>
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {errorBanner}
              </span>
              <button type="button" className="btn-close" onClick={() => setErrorBanner('')}></button>
            </div>
          )}

          {/* ==========================================
              TAB 1: TỔNG QUAN NỀN TẢNG
              ========================================== */}
          {activeTab === 'overview' && (
            <div>
              {overviewLoading && !overview ? (
                <div className="text-center py-5 text-muted small">Đang tổng hợp số liệu hệ thống...</div>
              ) : overview ? (
                <>
                  {/* 4 KPI Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-sm-6 col-xl-3">
                      <div className="owner-kpi-card p-3 p-md-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small fw-semibold text-muted">Doanh thu toàn sàn (Tháng)</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-cash-coin"></i>
                          </span>
                        </div>
                        <div className="h4 fw-bold text-brand-dark mb-1">
                          {Number(overview.bookings.monthlyGmv || 0).toLocaleString('vi-VN')}đ
                        </div>
                        <div className="small text-muted">
                          Hoa hồng 5% online: <strong className="text-brand">{Number(overview.bookings.platformCommissionEstimate || 0).toLocaleString('vi-VN')}đ</strong>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="owner-kpi-card p-3 p-md-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small fw-semibold text-muted">Đơn đặt sân hợp lệ</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-calendar2-check"></i>
                          </span>
                        </div>
                        <div className="h4 fw-bold text-dark mb-1">
                          {Number(overview.bookings.confirmed + overview.bookings.completed).toLocaleString('vi-VN')}
                        </div>
                        <div className="small text-muted">
                          Hôm nay: <strong className="text-dark">{overview.bookings.todayBookings}</strong> đơn · Chờ duyệt: <strong>{overview.bookings.pending}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="owner-kpi-card p-3 p-md-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small fw-semibold text-muted">Cụm sân & Sân con</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-buildings"></i>
                          </span>
                        </div>
                        <div className="h4 fw-bold text-dark mb-1">
                          {overview.facilities.active} <span className="fs-6 fw-normal text-muted">/ {overview.facilities.total} cụm mở</span>
                        </div>
                        <div className="small text-muted">
                          {overview.facilities.pendingApproval > 0 ? (
                            <span className="text-warning-emphasis fw-semibold">
                              {overview.facilities.pendingApproval} cụm sân mới chờ kiểm duyệt
                            </span>
                          ) : (
                            <span>{overview.facilities.activeSubCourts} sân con đang hoạt động</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-sm-6 col-xl-3">
                      <div className="owner-kpi-card p-3 p-md-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="small fw-semibold text-muted">Tài khoản & Đánh giá</span>
                          <span className="owner-kpi-icon">
                            <i className="bi bi-people"></i>
                          </span>
                        </div>
                        <div className="h4 fw-bold text-dark mb-1">
                          {overview.users.total} <span className="fs-6 fw-normal text-muted">tài khoản</span>
                        </div>
                        <div className="small text-muted">
                          {overview.users.players} người chơi · {overview.users.owners} chủ sân · {overview.reviews.total} đánh giá
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 1: Trend Chart + Breakdown */}
                  <div className="row g-4 mb-4">
                    <div className="col-lg-8">
                      <div className="editorial-panel-card p-4 h-100 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                          <div>
                            <span className="hero-eyebrow mb-1">
                              <span className="hero-eyebrow-dot"></span>
                              BIỂU ĐỒ TĂNG TRƯỞNG
                            </span>
                            <h6 className="fw-bold text-dark mb-0">Doanh thu & Lượt đặt theo ngày</h6>
                          </div>
                          <div className="d-flex gap-1">
                            {[7, 14, 30].map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={`sport-filter-pill py-1 px-3 ${overviewDays === d ? 'active' : ''}`}
                                style={{ fontSize: '0.76rem' }}
                                onClick={() => {
                                  setOverviewDays(d);
                                  loadOverview(d);
                                }}
                              >
                                {d} ngày
                              </button>
                            ))}
                          </div>
                        </div>

                        <div
                          className="d-flex align-items-end justify-content-between gap-2 pt-3 pb-2 px-1 flex-grow-1"
                          style={{ minHeight: '205px' }}
                        >
                          {trendSeries.map((day) => {
                            const heightPct = day.revenue > 0 ? Math.max(8, Math.round((day.revenue / maxTrendRev) * 145)) : 4;
                            return (
                              <div
                                key={day.date}
                                className="d-flex flex-column align-items-center flex-grow-1"
                                title={`${day.date}: ${day.revenue.toLocaleString('vi-VN')}đ (${day.bookingsCount} đơn, ${day.newUsersCount} người dùng mới)`}
                              >
                                {trendSeries.length <= 14 && (
                                  <span className="text-muted mb-1" style={{ fontSize: '0.68rem' }}>
                                    {day.revenue > 0 ? formatCompactMoney(day.revenue) : ''}
                                  </span>
                                )}
                                <div
                                  className="w-100 rounded-top-2"
                                  style={{
                                    maxWidth: trendSeries.length > 14 ? '14px' : '32px',
                                    height: `${heightPct}px`,
                                    backgroundColor: day.revenue > 0 ? '#0b4d3c' : '#e5e7eb',
                                    transition: 'height 0.25s ease'
                                  }}
                                ></div>
                                <span className="text-dark fw-semibold mt-2" style={{ fontSize: '0.7rem' }}>
                                  {trendSeries.length > 14 ? day.date.slice(8) : day.label}
                                </span>
                                {trendSeries.length <= 7 && (
                                  <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                                    {day.bookingsCount} đơn
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="border-top pt-3 mt-2 d-flex flex-wrap justify-content-between gap-2 small text-muted">
                          <span>
                            Hôm nay: <strong className="text-dark">{Number(overview.bookings.todayGmv || 0).toLocaleString('vi-VN')}đ</strong>
                          </span>
                          <span>
                            Lũy kế toàn thời gian: <strong className="text-brand-dark">{Number(overview.bookings.totalAllTimeGmv || 0).toLocaleString('vi-VN')}đ</strong>
                          </span>
                          <span>
                            Người dùng mới 7 ngày qua: <strong className="text-dark">+{overview.users.newLast7Days}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-lg-4 d-flex flex-column gap-4">
                      {/* Dark Forest Payment Channel Highlight */}
                      <div className="rounded-4 p-4 text-white shadow-sm" style={{ backgroundColor: '#0b4d3c' }}>
                        <span className="hero-eyebrow mb-1" style={{ color: '#86efac' }}>
                          <span className="hero-eyebrow-dot" style={{ backgroundColor: '#86efac' }}></span>
                          CƠ CẤU THANH TOÁN THÁNG
                        </span>
                        <div className="d-flex justify-content-between align-items-baseline mt-2 mb-3">
                          <span className="small" style={{ color: 'rgba(255,255,255,0.78)' }}>Tổng GMV tháng</span>
                          <strong className="fs-5" style={{ color: '#86efac' }}>
                            {Number(overview.bookings.monthlyGmv || 0).toLocaleString('vi-VN')}đ
                          </strong>
                        </div>
                        <div className="pt-2 small d-flex flex-column gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.16)' }}>
                          <div className="d-flex justify-content-between">
                            <span style={{ color: 'rgba(255,255,255,0.78)' }}>Online / VietQR:</span>
                            <strong style={{ color: '#86efac' }}>
                              {Number(overview.bookings.monthlyOnlineGmv || 0).toLocaleString('vi-VN')}đ
                            </strong>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span style={{ color: 'rgba(255,255,255,0.78)' }}>Thu tại quầy:</span>
                            <strong className="text-white">
                              {Number(overview.bookings.monthlyCounterGmv || 0).toLocaleString('vi-VN')}đ
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Sport Breakdown */}
                      <div className="editorial-panel-card p-4 flex-grow-1">
                        <span className="hero-eyebrow mb-1">
                          <span className="hero-eyebrow-dot"></span>
                          THEO BỘ MÔN
                        </span>
                        <h6 className="fw-bold text-dark mb-3">Doanh thu theo loại sân</h6>
                        {overview.bySport.length === 0 ? (
                          <div className="small text-muted">Chưa có dữ liệu bộ môn.</div>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {overview.bySport.map((sp) => (
                              <div key={sp.sportTypeId}>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: '175px' }}>
                                    {sp.sportName}
                                  </span>
                                  <span className="text-muted">
                                    {sp.facilityCount} sân · <strong className="text-brand-dark">{sp.ratio}%</strong>
                                  </span>
                                </div>
                                <div className="progress" style={{ height: '7px', backgroundColor: '#eef6f1' }}>
                                  <div
                                    className="progress-bar"
                                    style={{ width: `${Math.max(sp.ratio, sp.revenue > 0 ? 6 : 0)}%`, backgroundColor: '#0b4d3c' }}
                                  ></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Pending Approval Queue & Top Facilities */}
                  <div className="row g-4">
                    <div className="col-lg-6">
                      <div className="editorial-panel-card p-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <span className="hero-eyebrow mb-1">
                              <span className="hero-eyebrow-dot"></span>
                              HÀNG ĐỢI KIỂM DUYỆT
                            </span>
                            <h6 className="fw-bold text-dark mb-0">
                              Cụm sân chờ phê duyệt ({overview.pendingFacilities.length})
                            </h6>
                          </div>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-brand-dark text-decoration-none fw-semibold p-0"
                            onClick={() => {
                              setCourtStatusFilter('PENDING_APPROVAL');
                              setActiveTab('courts');
                            }}
                          >
                            Xem tất cả →
                          </button>
                        </div>

                        {overview.pendingFacilities.length === 0 ? (
                          <div className="text-center py-4 bg-brand-light rounded-4 border border-success-subtle">
                            <i className="bi bi-check2-circle text-brand fs-3 d-block mb-1"></i>
                            <div className="small fw-semibold text-brand-dark">Tất cả cụm sân mới đã được xử lý</div>
                            <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                              Khi đối tác mới đăng ký cụm sân, hồ sơ sẽ xuất hiện tại đây để bạn duyệt hiển thị.
                            </div>
                          </div>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {overview.pendingFacilities.map((pf) => (
                              <div key={pf.courtId} className="p-3 rounded-3 border bg-light-subtle d-flex justify-content-between align-items-start gap-3">
                                <div className="min-w-0">
                                  <div className="fw-bold text-dark text-truncate">{pf.name}</div>
                                  <div className="small text-muted">
                                    {pf.ownerName} {pf.ownerPhone ? `· ${pf.ownerPhone}` : ''}
                                  </div>
                                  <div className="text-muted text-truncate" style={{ fontSize: '0.76rem' }}>
                                    <i className="bi bi-tag me-1 text-brand"></i>
                                    {pf.sportName} {pf.area ? `· ${pf.area}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-brand btn-sm rounded-3 text-nowrap flex-shrink-0"
                                  disabled={actionBusyKey === `court-${pf.courtId}`}
                                  onClick={() => executeCourtStatus(pf, 'APPROVE')}
                                >
                                  <i className="bi bi-check-lg me-1"></i> Duyệt mở
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-lg-6">
                      <div className="editorial-panel-card p-4 h-100">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <span className="hero-eyebrow mb-1">
                              <span className="hero-eyebrow-dot"></span>
                              HIỆU SUẤT NỔI BẬT
                            </span>
                            <h6 className="fw-bold text-dark mb-0">Top 5 cụm sân doanh thu cao</h6>
                          </div>
                          <button
                            type="button"
                            className="btn btn-link btn-sm text-brand-dark text-decoration-none fw-semibold p-0"
                            onClick={() => {
                              setCourtStatusFilter('ALL');
                              setActiveTab('courts');
                            }}
                          >
                            Quản lý sân →
                          </button>
                        </div>

                        {overview.topFacilities.length === 0 ? (
                          <div className="text-muted small py-4 text-center">Chưa có cụm sân nào trên hệ thống.</div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {overview.topFacilities.map((tf, idx) => (
                              <div
                                key={tf.courtId}
                                className="d-flex align-items-center justify-content-between gap-3 p-2 px-3 rounded-3 border bg-white"
                              >
                                <div className="d-flex align-items-center gap-3 min-w-0">
                                  <span className="step-index-pill">0{idx + 1}</span>
                                  <div className="min-w-0">
                                    <div className="fw-semibold text-dark small text-truncate">{tf.name}</div>
                                    <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                                      {tf.ownerName} · {tf.validBookings} đơn · {tf.reviewCount > 0 ? `${tf.avgRating} ★ (${tf.reviewCount})` : 'Chưa có đánh giá'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-end flex-shrink-0">
                                  <div className="fw-bold text-brand-dark small">
                                    {Number(tf.totalRevenue || 0).toLocaleString('vi-VN')}đ
                                  </div>
                                  {onOpenCourt && tf.isVisible && tf.operationalStatus === 'ACTIVE' && (
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 text-brand text-decoration-none"
                                      style={{ fontSize: '0.72rem' }}
                                      onClick={() => onOpenCourt(tf.courtId)}
                                    >
                                      Xem trên web
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ==========================================
              TAB 2: QUẢN LÝ & KIỂM DUYỆT CỤM SÂN
              ========================================== */}
          {activeTab === 'courts' && (
            <div>
              <div className="editorial-panel-card p-3 p-md-4 mb-4">
                <div className="row g-3 align-items-center">
                  <div className="col-lg-6">
                    <div className="d-flex flex-wrap gap-2">
                      {[
                        { key: 'ALL', label: `Tất cả (${courts.length})` },
                        { key: 'PENDING_APPROVAL', label: `Chờ duyệt / Ngưng (${pendingCourtsCount})` },
                        {
                          key: 'ACTIVE',
                          label: `Đang hiển thị (${courts.filter((c) => c.operationalStatus === 'ACTIVE' && c.isVisible).length})`
                        },
                        {
                          key: 'HIDDEN',
                          label: `Đang ẩn (${courts.filter((c) => !(c.operationalStatus === 'ACTIVE' && c.isVisible)).length})`
                        }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={`sport-filter-pill ${courtStatusFilter === tab.key ? 'active' : ''}`}
                          onClick={() => setCourtStatusFilter(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-lg-3 col-sm-6">
                    <select
                      className="form-select form-select-sm"
                      value={courtSportFilter}
                      onChange={(e) => setCourtSportFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả bộ môn</option>
                      {sportTypes.map((st) => (
                        <option key={st.sportTypeId} value={st.sportTypeId}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-sm-6">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Tìm tên sân, chủ sân, địa chỉ..."
                      value={courtKeyword}
                      onChange={(e) => setCourtKeyword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="editorial-panel-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <span className="hero-eyebrow mb-1">
                      <span className="hero-eyebrow-dot"></span>
                      DANH SÁCH CƠ SỞ ĐỐI TÁC
                    </span>
                    <h6 className="fw-bold text-dark mb-0">Kiểm duyệt & Vận hành Cụm sân ({filteredCourts.length})</h6>
                  </div>
                </div>

                {courtsLoading ? (
                  <div className="text-center py-4 text-muted small">Đang tải danh sách cụm sân...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small text-muted">
                        <tr>
                          <th>CỤM SÂN & ĐỊA CHỈ</th>
                          <th>CHỦ SỞ HỮU</th>
                          <th>BỘ MÔN & QUY MÔ</th>
                          <th>DOANH THU & ĐÁNH GIÁ</th>
                          <th>TRẠNG THÁI</th>
                          <th className="text-end">HÀNH ĐỘNG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourts.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-4 text-muted">
                              Không có cụm sân nào phù hợp bộ lọc.
                            </td>
                          </tr>
                        ) : (
                          filteredCourts.map((c) => {
                            const badge = getCourtStatusBadge(c.operationalStatus, c.isVisible);
                            const isPublished = c.operationalStatus === 'ACTIVE' && c.isVisible;
                            const isBusy = actionBusyKey === `court-${c.courtId}`;

                            return (
                              <tr key={c.courtId}>
                                <td style={{ maxWidth: '280px' }}>
                                  <div className="fw-bold text-dark">{c.name}</div>
                                  <div className="small text-muted text-truncate" title={c.address}>
                                    <i className="bi bi-geo-alt me-1 text-brand"></i>
                                    {c.address || 'Chưa cập nhật địa chỉ'}
                                  </div>
                                  {c.area && <span className="badge bg-light text-secondary border mt-1 fw-normal">{c.area}</span>}
                                </td>
                                <td>
                                  <div className="fw-semibold text-dark small">{c.ownerName}</div>
                                  <div className="small text-muted">{c.ownerEmail}</div>
                                  {c.ownerPhone && <div className="small text-muted">{c.ownerPhone}</div>}
                                  {c.ownerStatus === 'LOCKED' && (
                                    <span className="badge bg-danger-subtle text-danger mt-1">Chủ sân đang bị khóa</span>
                                  )}
                                </td>
                                <td className="small">
                                  <span className="badge bg-brand-light text-brand-dark border border-success-subtle mb-1">
                                    {c.sportName}
                                  </span>
                                  <div className="text-muted">
                                    {c.activeSubCourtCount}/{c.subCourtCount} sân con · {c.timeSlotCount} khung giờ
                                  </div>
                                </td>
                                <td className="small">
                                  <div className="fw-bold text-brand-dark">
                                    {Number(c.totalRevenue || 0).toLocaleString('vi-VN')}đ
                                  </div>
                                  <div className="text-muted">
                                    {c.validBookings} đơn ·{' '}
                                    {c.reviewCount > 0 ? (
                                      <span className="text-dark fw-semibold">{c.avgRating} ★ ({c.reviewCount})</span>
                                    ) : (
                                      'Chưa đánh giá'
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className={`badge rounded-pill ${badge.cls}`}>{badge.label}</span>
                                </td>
                                <td className="text-end">
                                  <div className="d-inline-flex gap-1 align-items-center">
                                    {!isPublished ? (
                                      <button
                                        type="button"
                                        className="btn btn-brand btn-sm rounded-3"
                                        disabled={isBusy}
                                        onClick={() => requestCourtStatusChange(c, 'APPROVE')}
                                      >
                                        <i className="bi bi-check-lg me-1"></i> Duyệt mở
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm rounded-3"
                                        disabled={isBusy}
                                        onClick={() => requestCourtStatusChange(c, 'SUSPEND')}
                                      >
                                        <i className="bi bi-pause-circle me-1"></i> Tạm ngưng
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary btn-sm rounded-3"
                                      title="Xem chi tiết hồ sơ"
                                      onClick={() => setSelectedCourtModal(c)}
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 3: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN
              ========================================== */}
          {activeTab === 'users' && (
            <div>
              <div className="editorial-panel-card p-3 p-md-4 mb-4">
                <div className="row g-3 align-items-center">
                  <div className="col-lg-5">
                    <div className="d-flex flex-wrap gap-2">
                      {[
                        { key: 'ALL', label: `Tất cả (${users.length})` },
                        { key: 'USER', label: 'Người chơi' },
                        { key: 'OWNER', label: 'Chủ sân' },
                        { key: 'ADMIN', label: 'Quản trị' }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={`sport-filter-pill ${userRoleFilter === tab.key ? 'active' : ''}`}
                          onClick={() => setUserRoleFilter(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="col-lg-2 col-sm-4">
                    <select
                      className="form-select form-select-sm"
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                    >
                      <option value="ALL">Mọi trạng thái</option>
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="LOCKED">Đã khóa</option>
                    </select>
                  </div>

                  <div className="col-lg-3 col-sm-5">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Tìm tên, email, SĐT..."
                      value={userKeyword}
                      onChange={(e) => setUserKeyword(e.target.value)}
                    />
                  </div>

                  <div className="col-lg-2 col-sm-3 text-sm-end">
                    <button
                      type="button"
                      className="btn btn-brand btn-sm rounded-3 w-100"
                      onClick={() => {
                        setCreateUserError('');
                        setShowCreateUserModal(true);
                      }}
                    >
                      <i className="bi bi-person-plus-fill me-1"></i> Tạo tài khoản
                    </button>
                  </div>
                </div>
              </div>

              <div className="editorial-panel-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <span className="hero-eyebrow mb-1">
                      <span className="hero-eyebrow-dot"></span>
                      QUẢN TRỊ TÀI KHOẢN
                    </span>
                    <h6 className="fw-bold text-dark mb-0">Danh sách Tài khoản ({filteredUsers.length})</h6>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="text-center py-4 text-muted small">Đang tải danh sách tài khoản...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small text-muted">
                        <tr>
                          <th>THÀNH VIÊN</th>
                          <th>VAI TRÒ</th>
                          <th>HOẠT ĐỘNG HỆ THỐNG</th>
                          <th>NGÀY TẠO</th>
                          <th>TRẠNG THÁI</th>
                          <th className="text-end">THAO TÁC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-4 text-muted">
                              Không tìm thấy tài khoản phù hợp.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isSelf = Number(u.id) === Number(currentUser?.id);
                            return (
                              <tr key={u.id}>
                                <td>
                                  <div className="d-flex align-items-center gap-2">
                                    <span
                                      className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                                      style={{
                                        width: '36px',
                                        height: '36px',
                                        fontSize: '0.88rem',
                                        backgroundColor:
                                          u.role === 'ADMIN' ? '#dc2626' : u.role === 'OWNER' ? '#0b4d3c' : '#10b981'
                                      }}
                                    >
                                      {(u.fullName || 'U').charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="fw-bold text-dark small">
                                        {u.fullName}{' '}
                                        {isSelf && <span className="badge bg-brand-light text-brand-dark ms-1">Bạn</span>}
                                      </div>
                                      <div className="small text-muted">{u.email}</div>
                                      {u.phone && <div className="text-muted" style={{ fontSize: '0.74rem' }}>{u.phone}</div>}
                                      {u.businessName && (
                                        <div className="text-brand fw-semibold" style={{ fontSize: '0.73rem' }}>
                                          <i className="bi bi-building me-1"></i>
                                          {u.businessName}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <select
                                    className="form-select form-select-sm"
                                    style={{ width: '132px' }}
                                    value={u.role}
                                    disabled={isSelf}
                                    title={isSelf ? 'Không thể tự hạ quyền tài khoản đang đăng nhập' : 'Chuyển vai trò'}
                                    onChange={(e) => handleChangeUserRole(u, e.target.value)}
                                  >
                                    <option value="USER">Người chơi (USER)</option>
                                    <option value="OWNER">Chủ sân (OWNER)</option>
                                    <option value="ADMIN">Quản trị (ADMIN)</option>
                                  </select>
                                </td>
                                <td className="small">
                                  {u.role === 'OWNER' && (
                                    <div className="fw-semibold text-brand-dark">{u.courtsCount} cụm sân sở hữu</div>
                                  )}
                                  <div className="text-muted">
                                    {u.bookingsCount} đơn đặt · {Number(u.totalSpent || 0).toLocaleString('vi-VN')}đ
                                  </div>
                                  {u.reviewsCount > 0 && <div className="text-muted">{u.reviewsCount} đánh giá</div>}
                                </td>
                                <td className="small text-muted">{formatDateTime(u.createdAt)}</td>
                                <td>
                                  <span
                                    className={`badge rounded-pill ${
                                      u.status === 'ACTIVE'
                                        ? 'bg-success-subtle text-success border border-success-subtle'
                                        : 'bg-danger-subtle text-danger border border-danger-subtle'
                                    }`}
                                  >
                                    {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <button
                                    type="button"
                                    disabled={isSelf}
                                    className={`btn btn-sm rounded-3 ${
                                      u.status === 'ACTIVE' ? 'btn-outline-danger' : 'btn-outline-success'
                                    }`}
                                    title={isSelf ? 'Không thể tự khóa tài khoản hiện tại' : ''}
                                    onClick={() => handleToggleUserStatus(u)}
                                  >
                                    <i className={`bi ${u.status === 'ACTIVE' ? 'bi-lock' : 'bi-unlock'} me-1`}></i>
                                    {u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 4: GIÁM SÁT ĐƠN ĐẶT SÂN TOÀN HỆ THỐNG
              ========================================== */}
          {activeTab === 'bookings' && (
            <div>
              <div className="editorial-panel-card p-3 p-md-4 mb-4">
                <div className="row g-3 align-items-center">
                  <div className="col-12">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div className="d-flex flex-wrap gap-2">
                        {[
                          { key: 'ALL', label: `Tất cả (${bookings.length})` },
                          { key: 'PENDING', label: `Chờ xác nhận (${bookings.filter((b) => b.status === 'PENDING').length})` },
                          { key: 'CONFIRMED', label: 'Đã xác nhận' },
                          { key: 'COMPLETED', label: 'Đã Check-in' },
                          { key: 'CANCELLED', label: 'Đã hủy' }
                        ].map((tab) => (
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
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm rounded-3 fw-semibold"
                        onClick={handleExportBookingsCsv}
                      >
                        <i className="bi bi-file-earmark-spreadsheet me-1"></i> Xuất CSV
                      </button>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <select
                      className="form-select form-select-sm"
                      value={bookingCourtFilter}
                      onChange={(e) => setBookingCourtFilter(e.target.value)}
                    >
                      <option value="ALL">Tất cả cụm sân</option>
                      {courts.map((c) => (
                        <option key={c.courtId} value={c.courtId}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4 d-flex gap-2">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={bookingDateFilter}
                      onChange={(e) => setBookingDateFilter(e.target.value)}
                    />
                    {bookingDateFilter && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-3 text-nowrap"
                        onClick={() => setBookingDateFilter('')}
                      >
                        Tất cả ngày
                      </button>
                    )}
                  </div>

                  <div className="col-md-4">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Tìm mã BK-, khách hàng, SĐT, sân..."
                      value={bookingKeyword}
                      onChange={(e) => setBookingKeyword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="editorial-panel-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <span className="hero-eyebrow mb-1">
                      <span className="hero-eyebrow-dot"></span>
                      GIÁM SÁT ĐƠN HÀNG
                    </span>
                    <h6 className="fw-bold text-dark mb-0">Đơn đặt sân toàn nền tảng ({filteredBookings.length})</h6>
                  </div>
                </div>

                {bookingsLoading ? (
                  <div className="text-center py-4 text-muted small">Đang tải danh sách đơn đặt sân...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light small text-muted">
                        <tr>
                          <th>MÃ ĐƠN</th>
                          <th>NGÀY & KHUNG GIỜ</th>
                          <th>CỤM SÂN & SÂN CON</th>
                          <th>KHÁCH HÀNG</th>
                          <th>THANH TOÁN</th>
                          <th>TRẠNG THÁI</th>
                          <th className="text-end">CAN THIỆP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-4 text-muted">
                              Chưa có đơn đặt sân nào khớp điều kiện lọc.
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => {
                            const badge = getBookingBadge(b.status);
                            const isBusy = actionBusyKey === `booking-${b.id}`;
                            return (
                              <tr key={b.id}>
                                <td className="fw-bold text-dark">{b.id}</td>
                                <td>
                                  <div className="small text-dark fw-semibold">{formatDisplayDate(b.date)}</div>
                                  <span className="bg-brand-light text-brand-dark px-2 py-1 rounded-2 fw-semibold small text-nowrap d-inline-block mt-1">
                                    {b.timeSlot}
                                  </span>
                                </td>
                                <td style={{ maxWidth: '230px' }}>
                                  <div className="fw-semibold text-dark small text-truncate">{b.courtName}</div>
                                  <div className="text-muted small text-truncate">{b.subCourtName}</div>
                                </td>
                                <td>
                                  <div className="fw-semibold text-dark small">{b.customerName}</div>
                                  <div className="small text-muted">{b.customerPhone || b.customerEmail}</div>
                                </td>
                                <td className="small">
                                  <div className="fw-bold text-brand-dark">
                                    {Number(b.totalPrice || 0).toLocaleString('vi-VN')}đ
                                  </div>
                                  <div className="text-muted">{b.paymentMethod}</div>
                                </td>
                                <td>
                                  <span className={`badge rounded-pill ${badge.cls}`}>{badge.label}</span>
                                </td>
                                <td className="text-end">
                                  <div className="btn-group btn-group-sm">
                                    {b.status === 'PENDING' && (
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        disabled={isBusy}
                                        title="Xác nhận đơn"
                                        onClick={() => executeBookingStatus(b, 'CONFIRMED')}
                                      >
                                        <i className="bi bi-check-circle me-1"></i>Xác nhận
                                      </button>
                                    )}
                                    {b.status === 'CONFIRMED' && (
                                      <button
                                        type="button"
                                        className="btn btn-outline-success"
                                        disabled={isBusy}
                                        title="Đánh dấu Check-in"
                                        onClick={() => executeBookingStatus(b, 'COMPLETED')}
                                      >
                                        <i className="bi bi-check2 me-1"></i>Check-in
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      title="Chi tiết đơn"
                                      onClick={() => setSelectedBookingDetail(b)}
                                    >
                                      <i className="bi bi-eye"></i>
                                    </button>
                                    {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
                                      <button
                                        type="button"
                                        className="btn btn-outline-danger"
                                        disabled={isBusy}
                                        title="Hủy đơn"
                                        onClick={() => requestCancelBooking(b)}
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
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 5: DANH MỤC BỘ MÔN & KIỂM DUYỆT ĐÁNH GIÁ
              ========================================== */}
          {activeTab === 'catalog' && (
            <div className="row g-4">
              {/* Sport Types */}
              <div className="col-lg-5">
                <div className="editorial-panel-card p-4 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
                    <div>
                      <span className="hero-eyebrow mb-1">
                        <span className="hero-eyebrow-dot"></span>
                        DANH MỤC BỘ MÔN
                      </span>
                      <h6 className="fw-bold text-dark mb-0">Bộ môn Thể thao ({sportTypes.length})</h6>
                    </div>
                    <button type="button" className="btn btn-brand btn-sm rounded-3" onClick={openAddSportModal}>
                      <i className="bi bi-plus-lg me-1"></i> Thêm môn
                    </button>
                  </div>

                  {sportTypesLoading ? (
                    <div className="text-muted small py-3 text-center">Đang tải danh mục bộ môn...</div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {sportTypes.map((st) => (
                        <div key={st.sportTypeId} className="p-3 rounded-3 border bg-white">
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <div>
                              <span className="fw-bold text-dark small">{st.name}</span>
                              <span
                                className={`badge rounded-pill ms-2 ${
                                  st.status === 'ACTIVE'
                                    ? 'bg-success-subtle text-success border border-success-subtle'
                                    : 'bg-secondary-subtle text-secondary'
                                }`}
                                style={{ fontSize: '0.68rem' }}
                              >
                                {st.status === 'ACTIVE' ? 'Đang mở' : 'Tạm ẩn'}
                              </span>
                            </div>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                title="Chỉnh sửa"
                                onClick={() => openEditSportModal(st)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm py-0 px-2"
                                title={st.status === 'ACTIVE' ? 'Tạm ẩn bộ môn' : 'Mở lại bộ môn'}
                                onClick={() => handleToggleSportStatus(st)}
                              >
                                <i className={`bi ${st.status === 'ACTIVE' ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm py-0 px-2"
                                title="Xóa bộ môn"
                                onClick={() => requestDeleteSport(st)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                          {st.description && <div className="small text-muted mb-1">{st.description}</div>}
                          <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                            Đang gắn với <strong>{st.facilityCount}</strong> cụm sân và <strong>{st.subCourtCount}</strong> sân con
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Moderation */}
              <div className="col-lg-7">
                <div className="editorial-panel-card p-4 h-100">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                      <span className="hero-eyebrow mb-1">
                        <span className="hero-eyebrow-dot"></span>
                        KIỂM DUYỆT NỘI DUNG
                      </span>
                      <h6 className="fw-bold text-dark mb-0">Đánh giá người chơi ({filteredReviews.length})</h6>
                    </div>
                    <div className="d-flex gap-2">
                      <select
                        className="form-select form-select-sm"
                        style={{ width: '130px' }}
                        value={reviewRatingFilter}
                        onChange={(e) => setReviewRatingFilter(e.target.value)}
                      >
                        <option value="ALL">Mọi số sao</option>
                        {[5, 4, 3, 2, 1].map((s) => (
                          <option key={s} value={s}>{s} sao</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Lọc nội dung, sân..."
                        value={reviewKeyword}
                        onChange={(e) => setReviewKeyword(e.target.value)}
                      />
                    </div>
                  </div>

                  {reviewsLoading ? (
                    <div className="text-muted small py-4 text-center">Đang tải đánh giá...</div>
                  ) : filteredReviews.length === 0 ? (
                    <div className="text-muted small py-4 text-center">Chưa có đánh giá nào khớp bộ lọc.</div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {filteredReviews.map((rv) => (
                        <div key={rv.reviewId} className="p-3 rounded-3 border bg-white">
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <div>
                              <div className="fw-bold text-dark small">
                                {rv.reviewerName}{' '}
                                <span className="fw-normal text-muted">({rv.reviewerEmail})</span>
                              </div>
                              <div className="text-muted" style={{ fontSize: '0.76rem' }}>
                                Tại <strong className="text-brand-dark">{rv.courtName}</strong> · {formatDateTime(rv.createdAt)}
                                {rv.bookingCode ? ` · ${rv.bookingCode}` : ''}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                                {rv.rating} ★
                              </span>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm rounded-3 py-0 px-2"
                                title="Gỡ đánh giá"
                                onClick={() => requestDeleteReview(rv)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                          <p className="small text-dark mb-0" style={{ lineHeight: 1.55 }}>
                            {rv.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          MODAL: CHI TIẾT CỤM SÂN
          ======================================================== */}
      {selectedCourtModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold mb-0">Hồ sơ Cụm sân #{selectedCourtModal.courtId}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedCourtModal(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-start gap-3 mb-3 pb-3 border-bottom">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">{selectedCourtModal.name}</h5>
                    <div className="small text-muted">
                      <i className="bi bi-geo-alt me-1 text-brand"></i>
                      {selectedCourtModal.address} {selectedCourtModal.area ? `(${selectedCourtModal.area})` : ''}
                    </div>
                  </div>
                  <span className={`badge rounded-pill ${getCourtStatusBadge(selectedCourtModal.operationalStatus, selectedCourtModal.isVisible).cls}`}>
                    {getCourtStatusBadge(selectedCourtModal.operationalStatus, selectedCourtModal.isVisible).label}
                  </span>
                </div>

                <div className="row g-3 small mb-3">
                  <div className="col-md-6">
                    <div className="p-3 rounded-3 bg-light border h-100">
                      <div className="fw-bold text-dark mb-2">Chủ sở hữu & Pháp nhân</div>
                      <div>Chủ sân: <strong>{selectedCourtModal.ownerName}</strong></div>
                      <div>Email: {selectedCourtModal.ownerEmail}</div>
                      <div>Hotline: {selectedCourtModal.ownerPhone || 'Chưa cập nhật'}</div>
                      <div>Doanh nghiệp: {selectedCourtModal.businessName || 'Chưa cập nhật'}</div>
                      <div>MST: {selectedCourtModal.taxCode || 'Chưa cập nhật'}</div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 rounded-3 bg-light border h-100">
                      <div className="fw-bold text-dark mb-2">Vận hành & Thanh toán</div>
                      <div>Bộ môn: <strong>{selectedCourtModal.sportName}</strong></div>
                      <div>Số sân con: <strong>{selectedCourtModal.activeSubCourtCount}/{selectedCourtModal.subCourtCount}</strong></div>
                      <div>Khung giờ mở: <strong>{selectedCourtModal.timeSlotCount} ca</strong></div>
                      <div>Tổng doanh thu: <strong className="text-brand-dark">{Number(selectedCourtModal.totalRevenue || 0).toLocaleString('vi-VN')}đ</strong> ({selectedCourtModal.validBookings} đơn)</div>
                      <div>Ngân hàng: {selectedCourtModal.bankName || 'Chưa cấu hình'} {selectedCourtModal.bankAccountNo ? `- ${selectedCourtModal.bankAccountNo}` : ''}</div>
                    </div>
                  </div>
                </div>

                {selectedCourtModal.description && (
                  <div className="small text-muted bg-brand-light border border-success-subtle rounded-3 p-3">
                    <strong className="text-brand-dark d-block mb-1">Mô tả / Tiện ích:</strong>
                    {selectedCourtModal.description}
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light d-flex justify-content-between">
                <div>
                  {onOpenCourt && selectedCourtModal.operationalStatus === 'ACTIVE' && selectedCourtModal.isVisible && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm rounded-3"
                      onClick={() => {
                        const targetId = selectedCourtModal.courtId;
                        setSelectedCourtModal(null);
                        onOpenCourt(targetId);
                      }}
                    >
                      <i className="bi bi-box-arrow-up-right me-1"></i> Xem trang công khai
                    </button>
                  )}
                </div>
                <div className="d-flex gap-2">
                  {selectedCourtModal.operationalStatus === 'ACTIVE' && selectedCourtModal.isVisible ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm rounded-3"
                      onClick={() => requestCourtStatusChange(selectedCourtModal, 'SUSPEND')}
                    >
                      Tạm ngưng & Ẩn sân
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-brand btn-sm rounded-3"
                      onClick={() => requestCourtStatusChange(selectedCourtModal, 'APPROVE')}
                    >
                      Phê duyệt & Hiển thị
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm rounded-3" onClick={() => setSelectedCourtModal(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TẠO TÀI KHOẢN MỚI
          ======================================================== */}
      {showCreateUserModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold mb-0">Tạo tài khoản mới</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateUserModal(false)}></button>
              </div>
              <form onSubmit={handleCreateUserSubmit}>
                <div className="modal-body p-4 d-flex flex-column gap-3">
                  {createUserError && <div className="alert alert-danger py-2 small mb-0">{createUserError}</div>}
                  <div>
                    <label className="form-label small fw-semibold">Họ và tên (*)</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={createUserForm.fullName}
                      onChange={(e) => setCreateUserForm((p) => ({ ...p, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-sm-7">
                      <label className="form-label small fw-semibold">Email (*)</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                    <div className="col-sm-5">
                      <label className="form-label small fw-semibold">Số điện thoại</label>
                      <input
                        type="text"
                        className="form-control"
                        value={createUserForm.phone}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Mật khẩu (*)</label>
                      <input
                        type="password"
                        className="form-control"
                        minLength={6}
                        required
                        value={createUserForm.password}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label small fw-semibold">Vai trò (*)</label>
                      <select
                        className="form-select"
                        value={createUserForm.role}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        <option value="USER">Người chơi (USER)</option>
                        <option value="OWNER">Chủ sân (OWNER)</option>
                        <option value="ADMIN">Quản trị viên (ADMIN)</option>
                      </select>
                    </div>
                  </div>
                  {createUserForm.role === 'OWNER' && (
                    <div>
                      <label className="form-label small fw-semibold">Tên cơ sở / doanh nghiệp (tùy chọn)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ví dụ: The Yard Sport Arena"
                        value={createUserForm.businessName}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, businessName: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => setShowCreateUserModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" disabled={createUserSaving} className="btn btn-brand btn-sm rounded-3 px-3">
                    {createUserSaving ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CHI TIẾT ĐƠN ĐẶT SÂN
          ======================================================== */}
      {selectedBookingDetail && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold mb-0">Chi tiết đơn {selectedBookingDetail.id}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedBookingDetail(null)}></button>
              </div>
              <div className="modal-body p-4 small d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="text-muted">Trạng thái:</span>
                  <span className={`badge rounded-pill ${getBookingBadge(selectedBookingDetail.status).cls}`}>
                    {getBookingBadge(selectedBookingDetail.status).label}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Cụm sân:</span>
                  <strong className="text-end">{selectedBookingDetail.courtName}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Sân con:</span>
                  <strong>{selectedBookingDetail.subCourtName}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Ngày & Khung giờ:</span>
                  <strong className="text-brand-dark">
                    {formatDisplayDate(selectedBookingDetail.date)} · {selectedBookingDetail.timeSlot}
                  </strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Khách hàng:</span>
                  <strong>{selectedBookingDetail.customerName} ({selectedBookingDetail.customerPhone || '—'})</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Chủ sân liên hệ:</span>
                  <span>{selectedBookingDetail.ownerName} {selectedBookingDetail.ownerPhone ? `(${selectedBookingDetail.ownerPhone})` : ''}</span>
                </div>
                <div className="d-flex justify-content-between pt-2 border-top">
                  <span className="text-muted">Thanh toán ({selectedBookingDetail.paymentMethod}):</span>
                  <strong className="fs-6 text-brand-dark">
                    {Number(selectedBookingDetail.totalPrice || 0).toLocaleString('vi-VN')}đ
                  </strong>
                </div>
                {selectedBookingDetail.note && (
                  <div className="p-2 rounded-3 bg-light border mt-1">
                    <strong>Ghi chú:</strong> {selectedBookingDetail.note}
                  </div>
                )}
                {selectedBookingDetail.cancelReason && (
                  <div className="p-2 rounded-3 bg-danger-subtle text-danger border border-danger-subtle mt-1">
                    <strong>Lý do hủy:</strong> {selectedBookingDetail.cancelReason}
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm rounded-3" onClick={() => setSelectedBookingDetail(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: THÊM / SỬA BỘ MÔN THỂ THAO
          ======================================================== */}
      {showSportModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-brand-dark text-white">
                <h5 className="modal-title fw-bold mb-0">
                  {editingSport ? 'Cập nhật bộ môn thể thao' : 'Thêm bộ môn thể thao mới'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowSportModal(false)}></button>
              </div>
              <form onSubmit={handleSaveSportSubmit}>
                <div className="modal-body p-4 d-flex flex-column gap-3">
                  {sportModalError && <div className="alert alert-danger py-2 small mb-0">{sportModalError}</div>}
                  <div>
                    <label className="form-label small fw-semibold">Tên bộ môn (*)</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="Ví dụ: BÓNG RỔ, PICKLEBALL..."
                      value={sportForm.name}
                      onChange={(e) => setSportForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label small fw-semibold">Mô tả ngắn</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Mô tả đặc điểm sân, chuẩn thi đấu..."
                      value={sportForm.description}
                      onChange={(e) => setSportForm((p) => ({ ...p, description: e.target.value }))}
                    ></textarea>
                  </div>
                  <div>
                    <label className="form-label small fw-semibold">Trạng thái hiển thị</label>
                    <select
                      className="form-select"
                      value={sportForm.status}
                      onChange={(e) => setSportForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="ACTIVE">Đang mở (ACTIVE)</option>
                      <option value="INACTIVE">Tạm ẩn (INACTIVE)</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-outline-secondary btn-sm rounded-3" onClick={() => setShowSportModal(false)}>
                    Hủy
                  </button>
                  <button type="submit" disabled={sportSaving} className="btn btn-brand btn-sm rounded-3 px-3">
                    {sportSaving ? 'Đang lưu...' : editingSport ? 'Lưu thay đổi' : 'Thêm bộ môn'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: XÁC NHẬN THAO TÁC QUẢN TRỊ
          ======================================================== */}
      {confirmDialog && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1080 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header border-bottom">
                <h6 className="modal-title fw-bold text-dark mb-0">{confirmDialog.title}</h6>
                <button
                  type="button"
                  className="btn-close"
                  disabled={confirmBusy}
                  onClick={() => setConfirmDialog(null)}
                ></button>
              </div>
              <form onSubmit={handleConfirmDialogSubmit}>
                <div className="modal-body p-4">
                  <p className="small text-muted mb-3">{confirmDialog.message}</p>
                  {confirmDialog.requireReason && (
                    <div>
                      <label className="form-label small fw-semibold">{confirmDialog.reasonLabel || 'Lý do'}</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        value={confirmReason}
                        onChange={(e) => setConfirmReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    disabled={confirmBusy}
                    className="btn btn-outline-secondary btn-sm rounded-3"
                    onClick={() => setConfirmDialog(null)}
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={confirmBusy}
                    className={`btn btn-sm rounded-3 px-3 ${confirmDialog.confirmVariant || 'btn-brand'}`}
                  >
                    {confirmBusy ? 'Đang xử lý...' : confirmDialog.confirmLabel}
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

