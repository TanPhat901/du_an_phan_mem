const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const parseBookingNumericId = (rawId) => {
  const cleaned = String(rawId || '').replace(/^BK-/i, '').trim();
  const id = Number(cleaned);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const getTodayLocalYMD = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// GET /api/admin/overview?days=7|14|30
const getAdminOverview = async (req, res) => {
  try {
    const rawDays = Number(req.query.days);
    const days = Number.isInteger(rawDays) && [7, 14, 30].includes(rawDays) ? rawDays : 7;

    const [
      usersStatsRes,
      courtsStatsRes,
      bookingsStatsRes,
      reviewsStatsRes,
      trendRes,
      sportBreakdownRes,
      topFacilitiesRes,
      pendingFacilitiesRes
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_users,
          COUNT(*) FILTER (WHERE status = 'LOCKED')::int AS locked_users,
          COUNT(*) FILTER (WHERE role = 'USER')::int AS players_count,
          COUNT(*) FILTER (WHERE role = 'OWNER')::int AS owners_count,
          COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS admins_count,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '6 days')::int AS new_users_7d
        FROM users
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_facilities,
          COUNT(*) FILTER (WHERE operational_status = 'ACTIVE' AND is_visible = TRUE)::int AS active_facilities,
          COUNT(*) FILTER (WHERE operational_status = 'INACTIVE' AND is_visible = FALSE)::int AS pending_approval_facilities,
          COUNT(*) FILTER (WHERE is_visible = FALSE OR operational_status = 'INACTIVE')::int AS inactive_or_hidden_facilities,
          (SELECT COUNT(*)::int FROM sub_courts WHERE status = 'ACTIVE' AND is_visible = TRUE) AS active_sub_courts
        FROM courts
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_bookings,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_bookings,
          COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_bookings,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_bookings,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled_bookings,
          COUNT(*) FILTER (
            WHERE booking_date = CURRENT_DATE AND status <> 'CANCELLED'
          )::int AS today_bookings,
          COALESCE(SUM(total_amount) FILTER (
            WHERE booking_date = CURRENT_DATE AND status IN ('CONFIRMED', 'COMPLETED')
          ), 0)::numeric AS today_gmv,
          COALESCE(SUM(total_amount) FILTER (
            WHERE status IN ('CONFIRMED', 'COMPLETED')
              AND DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', CURRENT_DATE)
          ), 0)::numeric AS monthly_gmv,
          COALESCE(SUM(total_amount) FILTER (
            WHERE status IN ('CONFIRMED', 'COMPLETED')
              AND DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', CURRENT_DATE)
              AND (
                LOWER(COALESCE(payment_method, '')) LIKE '%vietqr%'
                OR LOWER(COALESCE(payment_method, '')) LIKE '%vnpay%'
                OR LOWER(COALESCE(payment_method, '')) LIKE '%online%'
              )
          ), 0)::numeric AS monthly_online_gmv,
          COALESCE(SUM(total_amount) FILTER (
            WHERE status IN ('CONFIRMED', 'COMPLETED')
          ), 0)::numeric AS total_all_time_gmv
        FROM bookings
      `),
      pool.query(`
        SELECT
          COUNT(*)::int AS total_reviews,
          COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::numeric AS avg_rating
        FROM court_reviews
      `),
      pool.query(
        `SELECT
           TO_CHAR(d::date, 'YYYY-MM-DD') AS day_date,
           EXTRACT(DOW FROM d::date)::int AS dow,
           COALESCE(b_stats.revenue, 0)::numeric AS revenue,
           COALESCE(b_stats.bookings_count, 0)::int AS bookings_count,
           COALESCE(u_stats.new_users_count, 0)::int AS new_users_count
         FROM GENERATE_SERIES(
           CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day',
           CURRENT_DATE::timestamp,
           '1 day'::interval
         ) AS d
         LEFT JOIN (
           SELECT
             booking_date,
             COALESCE(SUM(total_amount) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS revenue,
             COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED'))::int AS bookings_count
           FROM bookings
           GROUP BY booking_date
         ) b_stats ON b_stats.booking_date = d::date
         LEFT JOIN (
           SELECT
             created_at::date AS created_day,
             COUNT(*)::int AS new_users_count
           FROM users
           GROUP BY created_at::date
         ) u_stats ON u_stats.created_day = d::date
         ORDER BY d ASC`,
        [days]
      ),
      pool.query(`
        SELECT
          st.sport_type_id,
          st.name AS sport_name,
          st.status AS sport_status,
          COUNT(DISTINCT c.court_id)::int AS facility_count,
          COUNT(DISTINCT b.booking_id) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED'))::int AS bookings_count,
          COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS revenue
        FROM sport_types st
        LEFT JOIN courts c ON c.sport_type_id = st.sport_type_id
        LEFT JOIN bookings b ON b.court_id = c.court_id
        GROUP BY st.sport_type_id, st.name, st.status
        ORDER BY revenue DESC, facility_count DESC, st.sport_type_id ASC
      `),
      pool.query(`
        SELECT
          c.court_id,
          c.name,
          c.area,
          st.name AS sport_name,
          u.full_name AS owner_name,
          c.operational_status,
          c.is_visible,
          COUNT(DISTINCT b.booking_id) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED'))::int AS valid_bookings,
          COALESCE(SUM(b.total_amount) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS total_revenue,
          COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM court_reviews r WHERE r.court_id = c.court_id), 0)::numeric AS avg_rating,
          (SELECT COUNT(*)::int FROM court_reviews r WHERE r.court_id = c.court_id) AS review_count
        FROM courts c
        JOIN users u ON u.user_id = c.owner_id
        LEFT JOIN sport_types st ON st.sport_type_id = c.sport_type_id
        LEFT JOIN bookings b ON b.court_id = c.court_id
        GROUP BY c.court_id, c.name, c.area, st.name, u.full_name, c.operational_status, c.is_visible
        ORDER BY total_revenue DESC, valid_bookings DESC, c.court_id ASC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          c.court_id,
          c.name,
          c.address,
          c.area,
          c.created_at,
          st.name AS sport_name,
          u.user_id AS owner_id,
          u.full_name AS owner_name,
          u.email AS owner_email,
          u.phone AS owner_phone,
          op.business_name
        FROM courts c
        JOIN users u ON u.user_id = c.owner_id
        LEFT JOIN owner_profiles op ON op.owner_id = u.user_id
        LEFT JOIN sport_types st ON st.sport_type_id = c.sport_type_id
        WHERE c.operational_status = 'INACTIVE' AND c.is_visible = FALSE
        ORDER BY c.created_at DESC
        LIMIT 8
      `)
    ]);

    const uStats = usersStatsRes.rows[0] || {};
    const cStats = courtsStatsRes.rows[0] || {};
    const bStats = bookingsStatsRes.rows[0] || {};
    const rStats = reviewsStatsRes.rows[0] || {};

    const monthlyGmv = Number(bStats.monthly_gmv || 0);
    const monthlyOnlineGmv = Number(bStats.monthly_online_gmv || 0);
    const monthlyCounterGmv = Math.max(0, monthlyGmv - monthlyOnlineGmv);
    const platformCommissionEstimate = Math.round(monthlyOnlineGmv * 0.05);

    const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const trend = trendRes.rows.map((r) => ({
      date: r.day_date,
      label: days <= 7 ? (dayLabels[Number(r.dow)] || r.day_date.slice(5)) : r.day_date.slice(5),
      revenue: Number(r.revenue || 0),
      bookingsCount: Number(r.bookings_count || 0),
      newUsersCount: Number(r.new_users_count || 0)
    }));

    const totalSportRev = sportBreakdownRes.rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
    const bySport = sportBreakdownRes.rows.map((r) => {
      const rev = Number(r.revenue || 0);
      return {
        sportTypeId: Number(r.sport_type_id),
        sportName: r.sport_name,
        status: r.sport_status,
        facilityCount: Number(r.facility_count || 0),
        bookingsCount: Number(r.bookings_count || 0),
        revenue: rev,
        ratio: totalSportRev > 0 ? Math.round((rev / totalSportRev) * 100) : 0
      };
    });

    const topFacilities = topFacilitiesRes.rows.map((f) => ({
      courtId: Number(f.court_id),
      name: f.name,
      area: f.area || '',
      sportName: f.sport_name || 'Thể thao',
      ownerName: f.owner_name,
      operationalStatus: f.operational_status,
      isVisible: Boolean(f.is_visible),
      validBookings: Number(f.valid_bookings || 0),
      totalRevenue: Number(f.total_revenue || 0),
      avgRating: Number(f.avg_rating || 0),
      reviewCount: Number(f.review_count || 0)
    }));

    const pendingFacilities = pendingFacilitiesRes.rows.map((p) => ({
      courtId: Number(p.court_id),
      name: p.name,
      address: p.address || '',
      area: p.area || '',
      sportName: p.sport_name || 'Thể thao',
      ownerId: Number(p.owner_id),
      ownerName: p.owner_name,
      ownerEmail: p.owner_email,
      ownerPhone: p.owner_phone || '',
      businessName: p.business_name || '',
      createdAt: p.created_at
    }));

    return res.status(200).json({
      success: true,
      data: {
        days,
        todayDate: getTodayLocalYMD(),
        users: {
          total: Number(uStats.total_users || 0),
          active: Number(uStats.active_users || 0),
          locked: Number(uStats.locked_users || 0),
          players: Number(uStats.players_count || 0),
          owners: Number(uStats.owners_count || 0),
          admins: Number(uStats.admins_count || 0),
          newLast7Days: Number(uStats.new_users_7d || 0)
        },
        facilities: {
          total: Number(cStats.total_facilities || 0),
          active: Number(cStats.active_facilities || 0),
          pendingApproval: Number(cStats.pending_approval_facilities || 0),
          inactiveOrHidden: Number(cStats.inactive_or_hidden_facilities || 0),
          activeSubCourts: Number(cStats.active_sub_courts || 0)
        },
        bookings: {
          total: Number(bStats.total_bookings || 0),
          pending: Number(bStats.pending_bookings || 0),
          confirmed: Number(bStats.confirmed_bookings || 0),
          completed: Number(bStats.completed_bookings || 0),
          cancelled: Number(bStats.cancelled_bookings || 0),
          todayBookings: Number(bStats.today_bookings || 0),
          todayGmv: Number(bStats.today_gmv || 0),
          monthlyGmv,
          monthlyOnlineGmv,
          monthlyCounterGmv,
          platformCommissionEstimate,
          totalAllTimeGmv: Number(bStats.total_all_time_gmv || 0)
        },
        reviews: {
          total: Number(rStats.total_reviews || 0),
          avgRating: Number(rStats.avg_rating || 0)
        },
        trend,
        bySport,
        topFacilities,
        pendingFacilities
      }
    });
  } catch (error) {
    console.error('Lỗi tải tổng quan quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải dữ liệu tổng quan hệ thống.'
    });
  }
};

// GET /api/admin/courts?status=ALL|PENDING_APPROVAL|ACTIVE|HIDDEN&keyword=...&sportTypeId=...
const getAdminCourts = async (req, res) => {
  try {
    const statusFilter = String(req.query.status || 'ALL').toUpperCase().trim();
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const sportTypeId = req.query.sportTypeId ? Number(req.query.sportTypeId) : null;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (statusFilter === 'PENDING_APPROVAL') {
      conditions.push(`(c.operational_status = 'INACTIVE' AND c.is_visible = FALSE)`);
    } else if (statusFilter === 'ACTIVE') {
      conditions.push(`(c.operational_status = 'ACTIVE' AND c.is_visible = TRUE)`);
    } else if (statusFilter === 'HIDDEN') {
      conditions.push(`(c.is_visible = FALSE OR c.operational_status = 'INACTIVE')`);
    }

    if (Number.isSafeInteger(sportTypeId) && sportTypeId > 0) {
      conditions.push(`c.sport_type_id = $${idx++}`);
      values.push(sportTypeId);
    }

    if (keyword) {
      conditions.push(`(
        c.name ILIKE $${idx}
        OR COALESCE(c.address, '') ILIKE $${idx}
        OR COALESCE(c.area, '') ILIKE $${idx}
        OR u.full_name ILIKE $${idx}
        OR u.email ILIKE $${idx}
        OR COALESCE(op.business_name, '') ILIKE $${idx}
      )`);
      values.push(`%${keyword}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         c.court_id,
         c.name,
         c.address,
         c.area,
         c.description,
         c.image_url,
         c.price_per_slot,
         c.operational_status,
         c.is_visible,
         c.created_at,
         c.updated_at,
         c.sport_type_id,
         st.name AS sport_name,
         u.user_id AS owner_id,
         u.full_name AS owner_name,
         u.email AS owner_email,
         u.phone AS owner_phone,
         u.status AS owner_status,
         op.business_name,
         op.tax_code,
         op.bank_name,
         op.bank_account_no,
         COALESCE(sc_agg.sub_court_count, 0)::int AS sub_court_count,
         COALESCE(sc_agg.active_sub_court_count, 0)::int AS active_sub_court_count,
         COALESCE(ts_agg.time_slot_count, 0)::int AS time_slot_count,
         COALESCE(bk_agg.total_bookings, 0)::int AS total_bookings,
         COALESCE(bk_agg.valid_bookings, 0)::int AS valid_bookings,
         COALESCE(bk_agg.total_revenue, 0)::numeric AS total_revenue,
         COALESCE(rv_agg.avg_rating, 0)::numeric AS avg_rating,
         COALESCE(rv_agg.review_count, 0)::int AS review_count
       FROM courts c
       JOIN users u ON u.user_id = c.owner_id
       LEFT JOIN owner_profiles op ON op.owner_id = u.user_id
       LEFT JOIN sport_types st ON st.sport_type_id = c.sport_type_id
       LEFT JOIN (
         SELECT court_id,
                COUNT(*)::int AS sub_court_count,
                COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_sub_court_count
         FROM sub_courts
         GROUP BY court_id
       ) sc_agg ON sc_agg.court_id = c.court_id
       LEFT JOIN (
         SELECT court_id,
                COUNT(*) FILTER (WHERE is_active = TRUE)::int AS time_slot_count
         FROM time_slots
         GROUP BY court_id
       ) ts_agg ON ts_agg.court_id = c.court_id
       LEFT JOIN (
         SELECT court_id,
                COUNT(*)::int AS total_bookings,
                COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED'))::int AS valid_bookings,
                COALESCE(SUM(total_amount) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS total_revenue
         FROM bookings
         GROUP BY court_id
       ) bk_agg ON bk_agg.court_id = c.court_id
       LEFT JOIN (
         SELECT court_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*)::int AS review_count
         FROM court_reviews
         GROUP BY court_id
       ) rv_agg ON rv_agg.court_id = c.court_id
       ${whereClause}
       ORDER BY
         CASE WHEN c.operational_status = 'INACTIVE' AND c.is_visible = FALSE THEN 0 ELSE 1 END ASC,
         c.created_at DESC,
         c.court_id DESC`,
      values
    );

    const data = result.rows.map((r) => ({
      courtId: Number(r.court_id),
      name: r.name,
      address: r.address || '',
      area: r.area || '',
      description: r.description || '',
      imageUrl: r.image_url || '',
      pricePerSlot: Number(r.price_per_slot || 0),
      operationalStatus: r.operational_status,
      isVisible: Boolean(r.is_visible),
      sportTypeId: Number(r.sport_type_id),
      sportName: r.sport_name || 'Thể thao',
      ownerId: Number(r.owner_id),
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      ownerPhone: r.owner_phone || '',
      ownerStatus: r.owner_status,
      businessName: r.business_name || '',
      taxCode: r.tax_code || '',
      bankName: r.bank_name || '',
      bankAccountNo: r.bank_account_no || '',
      subCourtCount: Number(r.sub_court_count || 0),
      activeSubCourtCount: Number(r.active_sub_court_count || 0),
      timeSlotCount: Number(r.time_slot_count || 0),
      totalBookings: Number(r.total_bookings || 0),
      validBookings: Number(r.valid_bookings || 0),
      totalRevenue: Number(r.total_revenue || 0),
      avgRating: Number(r.avg_rating || 0),
      reviewCount: Number(r.review_count || 0),
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return res.status(200).json({
      success: true,
      total: data.length,
      data
    });
  } catch (error) {
    console.error('Lỗi tải danh sách cụm sân quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách cụm sân.'
    });
  }
};

// PATCH /api/admin/courts/:courtId/status
const updateAdminCourtStatus = async (req, res) => {
  try {
    const courtId = Number(req.params.courtId);
    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
    }

    const { action, operationalStatus, isVisible } = req.body || {};
    const actionUpper = typeof action === 'string' ? action.toUpperCase().trim() : '';

    let nextOperationalStatus;
    let nextIsVisible;

    if (actionUpper === 'APPROVE' || actionUpper === 'SHOW') {
      nextOperationalStatus = 'ACTIVE';
      nextIsVisible = true;
    } else if (actionUpper === 'SUSPEND' || actionUpper === 'HIDE') {
      nextOperationalStatus = 'INACTIVE';
      nextIsVisible = false;
    } else {
      if (
        !['ACTIVE', 'INACTIVE'].includes(String(operationalStatus || '').toUpperCase()) ||
        typeof isVisible !== 'boolean'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Tham số cập nhật trạng thái cụm sân không hợp lệ.'
        });
      }
      nextOperationalStatus = String(operationalStatus).toUpperCase();
      nextIsVisible = isVisible;
    }

    const updateRes = await pool.query(
      `UPDATE courts
       SET operational_status = $1,
           is_visible = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE court_id = $3
       RETURNING court_id, name, operational_status, is_visible`,
      [nextOperationalStatus, nextIsVisible, courtId]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cụm sân.' });
    }

    const row = updateRes.rows[0];
    const approved = row.operational_status === 'ACTIVE' && row.is_visible === true;

    return res.status(200).json({
      success: true,
      message: approved
        ? `Đã phê duyệt và hiển thị cụm sân "${row.name}" lên hệ thống.`
        : `Đã tạm ngưng và ẩn cụm sân "${row.name}".`,
      data: {
        courtId: Number(row.court_id),
        name: row.name,
        operationalStatus: row.operational_status,
        isVisible: Boolean(row.is_visible)
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái cụm sân:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái cụm sân.'
    });
  }
};

// GET /api/admin/users?role=ALL|USER|OWNER|ADMIN&status=ALL|ACTIVE|LOCKED&keyword=...
const getAdminUsers = async (req, res) => {
  try {
    const roleFilter = String(req.query.role || 'ALL').toUpperCase().trim();
    const statusFilter = String(req.query.status || 'ALL').toUpperCase().trim();
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';

    const conditions = [];
    const values = [];
    let idx = 1;

    if (['USER', 'OWNER', 'ADMIN'].includes(roleFilter)) {
      conditions.push(`u.role = $${idx++}`);
      values.push(roleFilter);
    }

    if (['ACTIVE', 'LOCKED'].includes(statusFilter)) {
      conditions.push(`u.status = $${idx++}`);
      values.push(statusFilter);
    }

    if (keyword) {
      conditions.push(`(
        u.full_name ILIKE $${idx}
        OR u.email ILIKE $${idx}
        OR COALESCE(u.phone, '') ILIKE $${idx}
        OR COALESCE(op.business_name, '') ILIKE $${idx}
      )`);
      values.push(`%${keyword}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.phone,
         u.role,
         u.status,
         u.created_at,
         u.updated_at,
         op.business_name,
         op.tax_code,
         COALESCE(c_agg.courts_count, 0)::int AS courts_count,
         COALESCE(b_agg.bookings_count, 0)::int AS bookings_count,
         COALESCE(b_agg.total_spent, 0)::numeric AS total_spent,
         COALESCE(rv_agg.reviews_count, 0)::int AS reviews_count
       FROM users u
       LEFT JOIN owner_profiles op ON op.owner_id = u.user_id
       LEFT JOIN (
         SELECT owner_id, COUNT(*)::int AS courts_count
         FROM courts
         GROUP BY owner_id
       ) c_agg ON c_agg.owner_id = u.user_id
       LEFT JOIN (
         SELECT user_id,
                COUNT(*)::int AS bookings_count,
                COALESCE(SUM(total_amount) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric AS total_spent
         FROM bookings
         GROUP BY user_id
       ) b_agg ON b_agg.user_id = u.user_id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS reviews_count
         FROM court_reviews
         GROUP BY user_id
       ) rv_agg ON rv_agg.user_id = u.user_id
       ${whereClause}
       ORDER BY u.created_at DESC, u.user_id DESC`,
      values
    );

    const data = result.rows.map((u) => ({
      id: Number(u.user_id),
      fullName: u.full_name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.status,
      businessName: u.business_name || '',
      taxCode: u.tax_code || '',
      courtsCount: Number(u.courts_count || 0),
      bookingsCount: Number(u.bookings_count || 0),
      totalSpent: Number(u.total_spent || 0),
      reviewsCount: Number(u.reviews_count || 0),
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    return res.status(200).json({
      success: true,
      total: data.length,
      data
    });
  } catch (error) {
    console.error('Lỗi tải danh sách người dùng:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách tài khoản.'
    });
  }
};

// POST /api/admin/users
const createAdminUser = async (req, res) => {
  const client = await pool.connect();
  try {
    const { fullName, email, phone, password, role = 'USER', businessName } = req.body || {};

    if (
      typeof fullName !== 'string' ||
      fullName.trim().length < 2 ||
      fullName.trim().length > 100 ||
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' ||
      password.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ Họ tên (>= 2 ký tự), Email hợp lệ và Mật khẩu (>= 6 ký tự).'
      });
    }

    const cleanRole = String(role || 'USER').toUpperCase().trim();
    if (!['USER', 'OWNER', 'ADMIN'].includes(cleanRole)) {
      return res.status(400).json({ success: false, message: 'Vai trò tài khoản không hợp lệ.' });
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;

    if (cleanPhone && !/^\+?[0-9]{9,15}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không đúng định dạng.' });
    }

    await client.query('BEGIN');

    const dupRes = await client.query(
      `SELECT user_id FROM users WHERE LOWER(email) = $1 OR ($2::text IS NOT NULL AND phone = $2)`,
      [cleanEmail, cleanPhone]
    );
    if (dupRes.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Email hoặc số điện thoại này đã được sử dụng.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const insertRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       RETURNING user_id, full_name, email, phone, role, status, created_at`,
      [cleanName, cleanEmail, hashedPassword, cleanPhone, cleanRole]
    );

    const created = insertRes.rows[0];

    if (cleanRole === 'OWNER' && typeof businessName === 'string' && businessName.trim()) {
      await client.query(
        `INSERT INTO owner_profiles (owner_id, business_name)
         VALUES ($1, $2)
         ON CONFLICT (owner_id) DO NOTHING`,
        [created.user_id, businessName.trim().slice(0, 150)]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({
      success: true,
      message: `Đã tạo tài khoản ${cleanEmail} (${cleanRole}) thành công.`,
      data: {
        id: Number(created.user_id),
        fullName: created.full_name,
        email: created.email,
        phone: created.phone || '',
        role: created.role,
        status: created.status,
        createdAt: created.created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi tạo tài khoản quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo tài khoản mới.'
    });
  } finally {
    client.release();
  }
};

// PATCH /api/admin/users/:userId/status
const updateAdminUserStatus = async (req, res) => {
  try {
    const adminId = Number(req.user.userId);
    const targetUserId = Number(req.params.userId);
    const nextStatus = String(req.body?.status || '').toUpperCase().trim();

    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã người dùng không hợp lệ.' });
    }
    if (!['ACTIVE', 'LOCKED'].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái tài khoản không hợp lệ.' });
    }
    if (targetUserId === adminId) {
      return res.status(400).json({ success: false, message: 'Không thể tự khóa tài khoản đang đăng nhập.' });
    }

    const targetRes = await pool.query(
      'SELECT user_id, full_name, role, status FROM users WHERE user_id = $1',
      [targetUserId]
    );
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role === 'ADMIN' && nextStatus === 'LOCKED') {
      const otherAdmins = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND user_id <> $1`,
        [targetUserId]
      );
      if (Number(otherAdmins.rows[0]?.cnt || 0) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không thể khóa Quản trị viên duy nhất đang hoạt động trên hệ thống.'
        });
      }
    }

    await pool.query(
      `UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [nextStatus, targetUserId]
    );

    return res.status(200).json({
      success: true,
      message:
        nextStatus === 'LOCKED'
          ? `Đã khóa tài khoản ${targetUser.full_name}.`
          : `Đã mở khóa tài khoản ${targetUser.full_name}.`,
      data: { id: targetUserId, status: nextStatus }
    });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái tài khoản:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái tài khoản.'
    });
  }
};

// PATCH /api/admin/users/:userId/role
const updateAdminUserRole = async (req, res) => {
  try {
    const adminId = Number(req.user.userId);
    const targetUserId = Number(req.params.userId);
    const nextRole = String(req.body?.role || '').toUpperCase().trim();

    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã người dùng không hợp lệ.' });
    }
    if (!['USER', 'OWNER', 'ADMIN'].includes(nextRole)) {
      return res.status(400).json({ success: false, message: 'Vai trò tài khoản không hợp lệ.' });
    }
    if (targetUserId === adminId && nextRole !== 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Không thể tự hạ quyền tài khoản Quản trị viên đang đăng nhập.'
      });
    }

    const targetRes = await pool.query(
      'SELECT user_id, full_name, role, status FROM users WHERE user_id = $1',
      [targetUserId]
    );
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    const targetUser = targetRes.rows[0];
    if (targetUser.role === 'ADMIN' && nextRole !== 'ADMIN' && targetUser.status === 'ACTIVE') {
      const otherAdmins = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND user_id <> $1`,
        [targetUserId]
      );
      if (Number(otherAdmins.rows[0]?.cnt || 0) === 0) {
        return res.status(400).json({
          success: false,
          message: 'Phải giữ lại ít nhất 1 Quản trị viên đang hoạt động.'
        });
      }
    }

    await pool.query(
      `UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [nextRole, targetUserId]
    );

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật vai trò của ${targetUser.full_name} thành ${nextRole}.`,
      data: { id: targetUserId, role: nextRole }
    });
  } catch (error) {
    console.error('Lỗi cập nhật vai trò người dùng:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật vai trò tài khoản.'
    });
  }
};

// GET /api/admin/sport-types
const getAdminSportTypes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        st.sport_type_id,
        st.name,
        st.description,
        st.status,
        st.created_at,
        COUNT(DISTINCT c.court_id)::int AS facility_count,
        COUNT(DISTINCT sc.sub_court_id)::int AS sub_court_count
      FROM sport_types st
      LEFT JOIN courts c ON c.sport_type_id = st.sport_type_id
      LEFT JOIN sub_courts sc ON sc.sport_type_id = st.sport_type_id
      GROUP BY st.sport_type_id, st.name, st.description, st.status, st.created_at
      ORDER BY st.sport_type_id ASC
    `);

    const data = result.rows.map((s) => ({
      sportTypeId: Number(s.sport_type_id),
      name: s.name,
      description: s.description || '',
      status: s.status,
      facilityCount: Number(s.facility_count || 0),
      subCourtCount: Number(s.sub_court_count || 0),
      createdAt: s.created_at
    }));

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Lỗi tải danh mục bộ môn:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh mục bộ môn thể thao.' });
  }
};

// POST /api/admin/sport-types
const createAdminSportType = async (req, res) => {
  try {
    const { name, description, status = 'ACTIVE' } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tên bộ môn thể thao không hợp lệ (1 - 100 ký tự).'
      });
    }
    const cleanStatus = String(status || 'ACTIVE').toUpperCase().trim();
    if (!['ACTIVE', 'INACTIVE'].includes(cleanStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái bộ môn không hợp lệ.' });
    }

    const result = await pool.query(
      `INSERT INTO sport_types (name, description, status)
       VALUES ($1, $2, $3)
       RETURNING sport_type_id, name, description, status, created_at`,
      [name.trim(), typeof description === 'string' && description.trim() ? description.trim() : null, cleanStatus]
    );

    const row = result.rows[0];
    return res.status(201).json({
      success: true,
      message: `Đã thêm bộ môn "${row.name}" thành công!`,
      data: {
        sportTypeId: Number(row.sport_type_id),
        name: row.name,
        description: row.description || '',
        status: row.status,
        facilityCount: 0,
        subCourtCount: 0,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Tên bộ môn thể thao này đã tồn tại.' });
    }
    console.error('Lỗi tạo bộ môn thể thao:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể tạo bộ môn thể thao.' });
  }
};

// PUT /api/admin/sport-types/:sportTypeId
const updateAdminSportType = async (req, res) => {
  try {
    const sportTypeId = Number(req.params.sportTypeId);
    if (!Number.isSafeInteger(sportTypeId) || sportTypeId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã bộ môn không hợp lệ.' });
    }

    const { name, description, status } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Tên bộ môn thể thao không hợp lệ (1 - 100 ký tự).'
      });
    }
    const cleanStatus = String(status || 'ACTIVE').toUpperCase().trim();
    if (!['ACTIVE', 'INACTIVE'].includes(cleanStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái bộ môn không hợp lệ.' });
    }

    const result = await pool.query(
      `UPDATE sport_types
       SET name = $1,
           description = $2,
           status = $3
       WHERE sport_type_id = $4
       RETURNING sport_type_id, name, description, status, created_at`,
      [name.trim(), typeof description === 'string' && description.trim() ? description.trim() : null, cleanStatus, sportTypeId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ môn thể thao.' });
    }

    const row = result.rows[0];
    return res.status(200).json({
      success: true,
      message: `Đã cập nhật bộ môn "${row.name}".`,
      data: {
        sportTypeId: Number(row.sport_type_id),
        name: row.name,
        description: row.description || '',
        status: row.status,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Tên bộ môn thể thao này đã tồn tại.' });
    }
    console.error('Lỗi cập nhật bộ môn thể thao:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật bộ môn thể thao.' });
  }
};

// DELETE /api/admin/sport-types/:sportTypeId
const deleteAdminSportType = async (req, res) => {
  try {
    const sportTypeId = Number(req.params.sportTypeId);
    if (!Number.isSafeInteger(sportTypeId) || sportTypeId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã bộ môn không hợp lệ.' });
    }

    const refRes = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM courts WHERE sport_type_id = $1) AS courts_cnt,
         (SELECT COUNT(*)::int FROM sub_courts WHERE sport_type_id = $1) AS sub_cnt`,
      [sportTypeId]
    );
    const counts = refRes.rows[0] || {};
    if (Number(counts.courts_cnt || 0) > 0 || Number(counts.sub_cnt || 0) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bộ môn đang được sử dụng bởi cụm sân hoặc sân con. Hãy chuyển sang trạng thái Tạm ẩn thay vì xóa.'
      });
    }

    const delRes = await pool.query(
      'DELETE FROM sport_types WHERE sport_type_id = $1 RETURNING name',
      [sportTypeId]
    );
    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bộ môn thể thao.' });
    }

    return res.status(200).json({
      success: true,
      message: `Đã xóa bộ môn "${delRes.rows[0].name}".`
    });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Bộ môn đang được tham chiếu nên không thể xóa. Hãy chuyển trạng thái sang Tạm ẩn.'
      });
    }
    console.error('Lỗi xóa bộ môn thể thao:', error.message);
    return res.status(500).json({ success: false, message: 'Không thể xóa bộ môn thể thao.' });
  }
};

// GET /api/admin/bookings?status=...&courtId=...&date=...&keyword=...&limit=...
const getAdminBookings = async (req, res) => {
  try {
    const statusFilter = String(req.query.status || 'ALL').toUpperCase().trim();
    const courtId = req.query.courtId ? Number(req.query.courtId) : null;
    const dateFilter = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : '';
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(300, rawLimit) : 150;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(statusFilter)) {
      conditions.push(`b.status = $${idx++}`);
      values.push(statusFilter);
    }

    if (Number.isSafeInteger(courtId) && courtId > 0) {
      conditions.push(`b.court_id = $${idx++}`);
      values.push(courtId);
    }

    if (dateFilter) {
      conditions.push(`b.booking_date = $${idx++}::date`);
      values.push(dateFilter);
    }

    if (keyword) {
      conditions.push(`(
        ('BK-' || b.booking_id::text) ILIKE $${idx}
        OR COALESCE(b.customer_name, u.full_name, '') ILIKE $${idx}
        OR COALESCE(b.customer_phone, u.phone, '') ILIKE $${idx}
        OR COALESCE(u.email, '') ILIKE $${idx}
        OR COALESCE(c.name, '') ILIKE $${idx}
        OR COALESCE(sc.name, '') ILIKE $${idx}
      )`);
      values.push(`%${keyword}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit);

    const result = await pool.query(
      `SELECT
         b.booking_id,
         b.user_id,
         b.court_id,
         b.sub_court_id,
         TO_CHAR(b.booking_date, 'YYYY-MM-DD') AS booking_date_str,
         b.status,
         b.total_amount,
         b.payment_method,
         b.payment_status,
         b.cancel_reason,
         b.note,
         b.created_at,
         COALESCE(b.customer_name, u.full_name, 'Khách đặt sân') AS customer_name,
         COALESCE(b.customer_phone, u.phone, '') AS customer_phone,
         u.email AS customer_email,
         c.name AS court_name,
         uo.full_name AS owner_name,
         uo.phone AS owner_phone,
         sc.name AS sub_court_name,
         COALESCE(
           TO_CHAR(ts.start_time, 'HH24:MI') || ' - ' || TO_CHAR(ts.end_time, 'HH24:MI'),
           '—'
         ) AS time_slot
       FROM bookings b
       LEFT JOIN users u ON u.user_id = b.user_id
       LEFT JOIN courts c ON c.court_id = b.court_id
       LEFT JOIN users uo ON uo.user_id = c.owner_id
       LEFT JOIN sub_courts sc ON sc.sub_court_id = b.sub_court_id
       LEFT JOIN LATERAL (
         SELECT bd.slot_id
         FROM booking_details bd
         WHERE bd.booking_id = b.booking_id
         ORDER BY bd.detail_id ASC
         LIMIT 1
       ) bd_first ON TRUE
       LEFT JOIN time_slots ts ON ts.slot_id = bd_first.slot_id
       ${whereClause}
       ORDER BY b.created_at DESC, b.booking_id DESC
       LIMIT $${idx}`,
      values
    );

    const data = result.rows.map((b) => ({
      id: `BK-${b.booking_id}`,
      bookingId: Number(b.booking_id),
      courtId: Number(b.court_id),
      courtName: b.court_name || 'Sân thể thao',
      ownerName: b.owner_name || '',
      ownerPhone: b.owner_phone || '',
      subCourtId: b.sub_court_id ? Number(b.sub_court_id) : null,
      subCourtName: b.sub_court_name || 'Sân tiêu chuẩn',
      customerName: b.customer_name,
      customerPhone: b.customer_phone,
      customerEmail: b.customer_email || '',
      date: b.booking_date_str,
      timeSlot: b.time_slot,
      totalPrice: Number(b.total_amount || 0),
      paymentMethod: b.payment_method || 'Tại quầy',
      paymentStatus: b.payment_status || 'PENDING',
      status: b.status,
      cancelReason: b.cancel_reason || '',
      note: b.note || '',
      createdAt: b.created_at
    }));

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Lỗi tải danh sách đơn đặt sân quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách đơn đặt sân.'
    });
  }
};

// PATCH /api/admin/bookings/:bookingId/status
const updateAdminBookingStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const adminId = Number(req.user.userId);
    const bookingId = parseBookingNumericId(req.params.bookingId);
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Mã đơn đặt sân không hợp lệ.' });
    }

    const nextStatus = String(req.body?.status || '').toUpperCase().trim();
    if (!['CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: 'Trạng thái cập nhật không hợp lệ.' });
    }

    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT booking_id, status, payment_method
       FROM bookings
       WHERE booking_id = $1
       FOR UPDATE`,
      [bookingId]
    );
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đặt sân.' });
    }

    const row = checkRes.rows[0];
    const currentStatus = row.status;
    const paymentMethodText = String(row.payment_method || '').toLowerCase();

    if (currentStatus === 'CANCELLED' && nextStatus !== 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Đơn đã hủy không thể khôi phục trực tiếp.'
      });
    }
    if (currentStatus === 'COMPLETED' && nextStatus !== 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Đơn đã hoàn tất Check-in không thể chuyển về trạng thái khác.'
      });
    }

    const defaultReason =
      nextStatus === 'CANCELLED'
        ? 'Quản trị viên hủy đơn đặt sân'
        : nextStatus === 'CONFIRMED'
          ? 'Quản trị viên xác nhận đơn đặt sân'
          : 'Quản trị viên xác nhận hoàn tất Check-in';

    const reason =
      typeof req.body?.reason === 'string' && req.body.reason.trim()
        ? req.body.reason.trim().slice(0, 500)
        : defaultReason;

    if (nextStatus === 'CANCELLED') {
      await client.query(
        `UPDATE bookings
         SET status = 'CANCELLED',
             cancelled_at = NOW(),
             cancel_reason = $1,
             updated_at = NOW()
         WHERE booking_id = $2`,
        [reason, bookingId]
      );
      await client.query(
        'UPDATE booking_details SET active_flag = NULL WHERE booking_id = $1',
        [bookingId]
      );
    } else {
      let nextPaymentStatus = null;
      if (nextStatus === 'COMPLETED') {
        nextPaymentStatus = 'PAID';
      } else if (
        nextStatus === 'CONFIRMED' &&
        (paymentMethodText.includes('vietqr') || paymentMethodText.includes('vnpay') || paymentMethodText.includes('online'))
      ) {
        nextPaymentStatus = 'PAID_ONLINE';
      }

      await client.query(
        `UPDATE bookings
         SET status = $1,
             payment_status = COALESCE($3, payment_status),
             cancelled_at = NULL,
             updated_at = NOW()
         WHERE booking_id = $2`,
        [nextStatus, bookingId, nextPaymentStatus]
      );
    }

    if (currentStatus !== nextStatus) {
      await client.query(
        `INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, currentStatus, nextStatus, adminId, reason]
      );
    }

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      message:
        nextStatus === 'CANCELLED'
          ? `Đã hủy đơn BK-${bookingId} và giải phóng khung giờ trống.`
          : nextStatus === 'CONFIRMED'
            ? `Đã xác nhận đơn BK-${bookingId}.`
            : `Đã đánh dấu Check-in hoàn tất cho đơn BK-${bookingId}.`,
      data: { id: `BK-${bookingId}`, bookingId, status: nextStatus }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Lỗi cập nhật đơn đặt sân từ quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể cập nhật trạng thái đơn đặt sân.'
    });
  } finally {
    client.release();
  }
};

// GET /api/admin/reviews?rating=...&keyword=...
const getAdminReviews = async (req, res) => {
  try {
    const ratingFilter = req.query.rating ? Number(req.query.rating) : null;
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';

    const conditions = [];
    const values = [];
    let idx = 1;

    if (Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5) {
      conditions.push(`r.rating = $${idx++}`);
      values.push(ratingFilter);
    }

    if (keyword) {
      conditions.push(`(
        r.comment ILIKE $${idx}
        OR c.name ILIKE $${idx}
        OR u.full_name ILIKE $${idx}
        OR u.email ILIKE $${idx}
      )`);
      values.push(`%${keyword}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         r.review_id,
         r.court_id,
         r.user_id,
         r.booking_id,
         r.rating,
         r.comment,
         r.created_at,
         c.name AS court_name,
         st.name AS sport_name,
         u.full_name AS reviewer_name,
         u.email AS reviewer_email
       FROM court_reviews r
       JOIN courts c ON c.court_id = r.court_id
       JOIN users u ON u.user_id = r.user_id
       LEFT JOIN sport_types st ON st.sport_type_id = c.sport_type_id
       ${whereClause}
       ORDER BY r.created_at DESC, r.review_id DESC
       LIMIT 200`,
      values
    );

    const data = result.rows.map((r) => ({
      reviewId: Number(r.review_id),
      courtId: Number(r.court_id),
      courtName: r.court_name,
      sportName: r.sport_name || 'Thể thao',
      userId: Number(r.user_id),
      reviewerName: r.reviewer_name,
      reviewerEmail: r.reviewer_email,
      bookingCode: r.booking_id ? `BK-${r.booking_id}` : '',
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.created_at
    }));

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Lỗi tải danh sách đánh giá quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tải danh sách đánh giá.'
    });
  }
};

// DELETE /api/admin/reviews/:reviewId
const deleteAdminReview = async (req, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    if (!Number.isSafeInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã đánh giá không hợp lệ.' });
    }

    const delRes = await pool.query(
      'DELETE FROM court_reviews WHERE review_id = $1 RETURNING review_id',
      [reviewId]
    );
    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá cần xóa.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Đã gỡ bỏ đánh giá khỏi hệ thống.'
    });
  } catch (error) {
    console.error('Lỗi xóa đánh giá quản trị:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể xóa đánh giá.'
    });
  }
};

module.exports = {
  getAdminOverview,
  getAdminCourts,
  updateAdminCourtStatus,
  getAdminUsers,
  createAdminUser,
  updateAdminUserStatus,
  updateAdminUserRole,
  getAdminSportTypes,
  createAdminSportType,
  updateAdminSportType,
  deleteAdminSportType,
  getAdminBookings,
  updateAdminBookingStatus,
  getAdminReviews,
  deleteAdminReview
};
