import React, { useState, useEffect } from 'react';
import { formatLocalYMD } from '../utils/vietqr';

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
  sportTypes = [],
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
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    let cancelled = false;
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
  const activeAdvancedCount =
    (maxPrice ? 1 : 0) +
    (onlyAvailable ? 1 : 0) +
    (sortBy && sortBy !== 'featured' ? 1 : 0) +
    (selectedCategory ? 1 : 0);

  return (
    <section className="container search-card-floating mb-4" id="search-section">
      <div className="search-card-container">
        {/* Top Tabs Row */}
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 border-bottom pb-2 mb-3">
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
              <i className="bi bi-calendar2-check"></i>
              <span>Lịch đặt của tôi</span>
            </button>
          </div>

          {currentUser && (
            <button
              type="button"
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-1 ${
                favoritesOnly ? 'btn-danger text-white' : 'btn-outline-secondary'
              }`}
              onClick={() => setFavoritesOnly?.(!favoritesOnly)}
            >
              <i className={`bi ${favoritesOnly ? 'bi-heart-fill' : 'bi-heart'}`}></i>
              <span>Sân đã lưu ({favoritesCount})</span>
            </button>
          )}
        </div>

        {/* Segmented Horizontal Search Bar */}
        <form onSubmit={handleSubmit}>
          <div className="row g-3 align-items-center">
            {/* Field 1: Keyword */}
            <div className="col-lg-4 col-md-6">
              <label className="form-label small text-muted mb-1">Bạn muốn chơi gì?</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-0 ps-0 text-muted">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-0 bg-transparent shadow-none ps-1 fw-medium text-dark"
                  placeholder="Tên sân, môn thể thao..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            {/* Field 2: Area */}
            <div className="col-lg-3 col-md-6 search-segment-divider">
              <label className="form-label small text-muted mb-1">Khu vực</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-0 ps-0 text-muted">
                  <i className="bi bi-geo-alt"></i>
                </span>
                <select
                  className="form-select border-0 bg-transparent shadow-none ps-1 fw-semibold text-dark cursor-pointer"
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

            {/* Field 3: Date */}
            <div className="col-lg-3 col-md-6 search-segment-divider">
              <label className="form-label small text-muted mb-1">Ngày chơi</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-0 ps-0 text-muted">
                  <i className="bi bi-calendar3"></i>
                </span>
                <input
                  type="date"
                  className="form-control border-0 bg-transparent shadow-none ps-1 fw-semibold text-dark"
                  min={todayYmd}
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value || todayYmd)}
                />
              </div>
            </div>

            {/* Submit & Advanced Filter Trigger */}
            <div className="col-lg-2 col-md-6 text-lg-end">
              <button
                type="submit"
                className="btn btn-brand w-100 py-2 d-flex align-items-center justify-content-center gap-2 rounded-3"
              >
                <i className="bi bi-search"></i>
                <span>Tìm sân</span>
              </button>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 pt-2 border-top">
            <div className="d-flex align-items-center gap-2">
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="onlyAvailableSwitch"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable?.(e.target.checked)}
                />
                <label className="form-check-label small text-muted cursor-pointer" htmlFor="onlyAvailableSwitch">
                  Chỉ hiện sân còn khung giờ trống
                </label>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-link text-decoration-none text-secondary small p-0 d-inline-flex align-items-center gap-1 fw-medium"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <i className="bi bi-sliders"></i>
              <span>Bộ lọc nâng cao</span>
              {activeAdvancedCount > 0 && (
                <span className="badge rounded-pill bg-success text-white ms-1" style={{ fontSize: '0.68rem' }}>
                  {activeAdvancedCount}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Advanced Filters */}
          {showAdvanced && (
            <div className="bg-light rounded-3 p-3 mt-3 border">
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label small fw-semibold text-muted mb-1">Môn thể thao</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory?.(e.target.value)}
                  >
                    <option value="">Tất cả môn</option>
                    {sportTypes.map((cat) => (
                      <option key={cat.sport_type_id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    Giá tối đa:{' '}
                    <span className="text-dark fw-bold">
                      {maxPrice ? `${Number(maxPrice).toLocaleString('vi-VN')}đ/h` : 'Không giới hạn'}
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

                <div className="col-md-2 d-flex gap-2 justify-content-md-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => onResetFilters?.()}
                  >
                    Đặt lại
                  </button>
                  <button type="button" className="btn btn-brand btn-sm" onClick={onSearch}>
                    Lọc
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
