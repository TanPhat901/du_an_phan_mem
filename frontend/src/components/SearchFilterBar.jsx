import React, { useState } from 'react';

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
  setMaxPrice
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section className="container mb-5" id="search-section" style={{ marginTop: '-1.5rem', position: 'relative', zIndex: 10 }}>
      <div className="search-card-container">
        {/* Tabs */}
        <div className="d-flex align-items-center gap-4 border-bottom pb-2 mb-4">
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
                  placeholder="Tìm sân, môn thể thao..."
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
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Bình Dương">Bình Dương</option>
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
                  value={playDate}
                  onChange={(e) => setPlayDate(e.target.value)}
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

          {/* Advanced Filter Toggle Row */}
          <div className="d-flex justify-content-between align-items-center pt-3 mt-2 border-top">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="small text-muted">Gợi ý nhanh:</span>
              <button
                type="button"
                className={`btn btn-sm ${selectedCategory === '' ? 'btn-dark' : 'btn-light border'} rounded-pill`}
                onClick={() => setSelectedCategory('')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedCategory === 'PADEL & PICKLEBALL' ? 'btn-success' : 'btn-light border'} rounded-pill`}
                onClick={() => setSelectedCategory(selectedCategory === 'PADEL & PICKLEBALL' ? '' : 'PADEL & PICKLEBALL')}
              >
                Padel & Pickleball
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedCategory === 'BÓNG ĐÁ & TENNIS' ? 'btn-success' : 'btn-light border'} rounded-pill`}
                onClick={() => setSelectedCategory(selectedCategory === 'BÓNG ĐÁ & TENNIS' ? '' : 'BÓNG ĐÁ & TENNIS')}
              >
                Bóng đá & Tennis
              </button>
              <button
                type="button"
                className={`btn btn-sm ${selectedCategory === 'CẦU LÔNG TRONG NHÀ' ? 'btn-success' : 'btn-light border'} rounded-pill`}
                onClick={() => setSelectedCategory(selectedCategory === 'CẦU LÔNG TRONG NHÀ' ? '' : 'CẦU LÔNG TRONG NHÀ')}
              >
                Cầu lông
              </button>
            </div>

            <button
              type="button"
              className="btn btn-link text-decoration-none text-muted small p-0 d-flex align-items-center gap-1"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <i className="bi bi-sliders"></i>
              <span>{showAdvanced ? 'Ẩn bộ lọc' : 'Bộ lọc nâng cao +'}</span>
            </button>
          </div>

          {/* Expanded Advanced Filters */}
          {showAdvanced && (
            <div className="bg-light rounded-3 p-3 mt-3 border">
              <div className="row g-3 align-items-center">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold text-muted mb-1">
                    Mức giá tối đa: <span className="text-dark fw-bold">{maxPrice ? `${Number(maxPrice).toLocaleString('vi-VN')}đ / giờ` : 'Không giới hạn'}</span>
                  </label>
                  <input
                    type="range"
                    className="form-range"
                    min="100000"
                    max="500000"
                    step="20000"
                    value={maxPrice || 500000}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                  <div className="d-flex justify-content-between small text-muted">
                    <span>100.000đ</span>
                    <span>300.000đ</span>
                    <span>500.000đ</span>
                  </div>
                </div>

                <div className="col-md-6 text-end">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary btn-sm me-2"
                    onClick={() => {
                      setKeyword('');
                      setSelectedCity('');
                      setSelectedCategory('');
                      setMaxPrice('');
                    }}
                  >
                    Đặt lại bộ lọc
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

