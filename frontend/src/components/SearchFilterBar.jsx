import React, { useState, useEffect } from 'react';
import { formatLocalYMD } from '../utils/vietqr';

const formatCategoryLabel = (name) => {
  if (!name) return '';
  if (name === 'CẦU LÔNG TRONG NHÀ') return 'Cầu lông';
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => (w === '&' ? '&' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
};

export default function SearchFilterBar({
  onSearch,
  onTabChange,
  activeSearchTab,
  selectedCity,
  setSelectedCity,
  keyword,
  setKeyword,
  playDate,
  setPlayDate,
  selectedCategory,
  setSelectedCategory,
  maxPrice,
  setMaxPrice,
  sortBy,
  setSortBy,
  onlyAvailable,
  setOnlyAvailable,
  favoritesOnly,
  setFavoritesOnly,
  currentUser,
  favoritesCount = 0,
  onResetFilters
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categories, setCategories] = useState([]);
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('http://localhost:5000/api/courts/sport-types')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      })
      .catch(() => {});

    fetch('http://localhost:5000/api/courts/areas')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setAreas(json.data);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  const todayYmd = formatLocalYMD();

  return (
    <section className="container mb-5" id="search-section" style={{ marginTop: '-1.5rem', position: 'relative', zIndex: 10 }}>
      <div className="search-card-container">
        {/* Tabs */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 border-bottom pb-2 mb-4">
          <div className="d-flex align-items-center gap-4">
            <button
              type="button"
              className={`search-tab-btn d-flex align-items-center gap-2 ${activeSearchTab === 'search' ? 'active' : ''}`}
              onClick={() => onTabChange('search')}
            >
              <i className="bi bi-search"></i>
              <span>Tìm sân thể thao</span>
            </button>
            <button
              type="button"
              className={`search-tab-btn d-flex align-items-center gap-2 ${activeSearchTab === 'my-bookings' ? 'active' : ''}`}
              onClick={() => onTabChange('my-bookings')}
            >
              <i className="bi bi-calendar-check"></i>
              <span>Lịch đặt của tôi</span>
            </button>
          </div>

          {currentUser && (
            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-1 ${
                favoritesOnly ? 'btn-danger text-white' : 'btn-outline-danger'
              }`}
              onClick={() => setFavoritesOnly?.(!favoritesOnly)}
            >
              <i className={`bi ${favoritesOnly ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              <span>Sân đã lưu ({favoritesCount})</span>
            </button>
          )}
        </div>

        {/* Search Inputs Form */}
        <form onSubmit={handleSubmit}>
          <div className="row g-3 align-items-end">
            {/* Input 1: Sport or Court Name */}
            <div className="col-lg-4 col-md-6">
              <label className="form-label small fw-semibold text-muted mb-1">Bạn muốn chơi gì?</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0 shadow-none py-2"
                  placeholder="Tìm tên sân, địa chỉ, môn thể thao..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            {/* Input 2: Location / City */}
            <div className="col-lg-3 col-md-6">
              <label className="form-label small fw-semibold text-muted mb-1">Khu vực</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-geo-alt"></i>
                </span>
                <select
                  className="form-select border-start-0 ps-0 shadow-none py-2 cursor-pointer"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="">Tất cả khu vực</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input 3: Date */}
            <div className="col-lg-3 col-md-6">
              <label className="form-label small fw-semibold text-muted mb-1">Ngày chơi</label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-calendar3"></i>
                </span>
                <input
                  type="date"
                  className="form-control border-start-0 ps-0 shadow-none py-2"
                  min={todayYmd}
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value || todayYmd)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="col-lg-2 col-md-6">
              <button
                type="submit"
                className="btn btn-brand w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                style={{ height: '42px' }}
              >
                <i className="bi bi-search"></i>
                <span>Tìm sân</span>
              </button>
            </div>
          </div>

          {/* Quick Categories & Sort/Advanced Toggle Row */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 mt-2 border-top">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="small text-muted">Bộ môn:</span>
              <button
                type="button"
                className={`btn btn-sm ${selectedCategory === '' ? 'btn-dark' : 'btn-light border'} rounded-pill`}
                onClick={() => setSelectedCategory('')}
              >
                Tất cả
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.sport_type_id || cat.name}
                    type="button"
                    className={`btn btn-sm ${active ? 'btn-success' : 'btn-light border'} rounded-pill`}
                    onClick={() => setSelectedCategory(active ? '' : cat.name)}
                  >
                    {formatCategoryLabel(cat.name)}
                  </button>
                );
              })}
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <button
                type="button"
                className={`btn btn-sm rounded-pill d-flex align-items-center gap-1 ${
                  onlyAvailable ? 'btn-success' : 'btn-outline-secondary'
                }`}
                onClick={() => setOnlyAvailable?.(!onlyAvailable)}
              >
                <i className={`bi ${onlyAvailable ? 'bi-check-circle-fill' : 'bi-clock'}`}></i>
                <span>Còn sân trống</span>
              </button>

              <button
                type="button"
                className="btn btn-link text-decoration-none text-muted small p-0 d-flex align-items-center gap-1"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <i className="bi bi-sliders"></i>
                <span>{showAdvanced ? 'Ẩn lọc nâng cao' : 'Lọc giá & Sắp xếp'}</span>
              </button>
            </div>
          </div>

          {/* Expanded Advanced Filters */}
          {showAdvanced && (
            <div className="bg-light rounded-3 p-3 mt-3 border">
              <div className="row g-3 align-items-center">
                <div className="col-md-5">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    Mức giá tối đa:{' '}
                    <span className="text-dark fw-bold">
                      {maxPrice ? `${Number(maxPrice).toLocaleString('vi-VN')}đ / giờ` : 'Không giới hạn'}
                    </span>
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    min="100000"
                    max="1000000"
                    step="20000"
                    value={maxPrice || 1000000}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                  <div className="d-flex justify-content-between small text-muted">
                    <span>100.000đ</span>
                    <span>500.000đ</span>
                    <span>1.000.000đ</span>
                  </div>
                </div>

                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted mb-1">Sắp xếp theo</label>
                  <select
                    className="form-select form-select-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy?.(e.target.value)}
                  >
                    <option value="featured">Đề xuất nổi bật</option>
                    <option value="price_asc">Giá thấp đến cao</option>
                    <option value="price_desc">Giá cao đến thấp</option>
                    <option value="rating_desc">Đánh giá cao nhất</option>
                  </select>
                </div>

                <div className="col-md-4 text-md-end pt-md-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm me-2"
                    onClick={() => onResetFilters?.()}
                  >
                    Đặt lại tất cả
                  </button>
                  <button
                    type="button"
                    className="btn btn-brand btn-sm"
                    onClick={onSearch}
                  >
                    Áp dụng lọc
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
