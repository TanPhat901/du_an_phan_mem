import React from 'react';
import CourtCard from './CourtCard';
import { formatDisplayDate } from '../utils/vietqr';

const formatCategoryLabel = (name) => {
  if (!name) return '';
  if (name === 'CẦU LÔNG TRONG NHÀ') return 'Cầu lông';
  return name
    .toLowerCase()
    .split(' ')
    .map((w) => (w === '&' ? '&' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
};

const getSportIconClass = (name = '') => {
  const lower = String(name).toLowerCase();
  if (lower.includes('bóng đá')) return 'bi-dribbble';
  if (lower.includes('bóng rổ')) return 'bi-dribbble';
  if (lower.includes('cầu lông')) return 'bi-wind';
  if (lower.includes('tennis') || lower.includes('padel') || lower.includes('pickleball')) return 'bi-circle';
  return 'bi-trophy';
};

export default function CourtList({
  courts,
  loading,
  error = '',
  onRetry,
  onBookNow,
  favoriteCourtIds = [],
  onToggleFavorite,
  playDate,
  favoritesOnly = false,
  currentUser = null,
  sportTypes = [],
  selectedCategory = '',
  setSelectedCategory,
  onResetFilters
}) {
  const favSet = new Set(favoriteCourtIds.map(Number));

  return (
    <section className="container pt-3 pb-5 mb-2" id="featured-courts">
      {/* Editorial Section Header */}
      <div className="hero-eyebrow mb-1">
        <span>KHÁM PHÁ SÂN GẦN BẠN</span>
      </div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-end mb-3 gap-2">
        <h2 className="fw-bold text-dark mb-0 h3">
          {favoritesOnly ? 'Sân đã lưu' : 'Sân được yêu thích'}
        </h2>
        <div className="d-flex align-items-center gap-3 small">
          <span className="text-muted">
            {courts.length} cụm sân • {formatDisplayDate(playDate)}
          </span>
          {onResetFilters && (
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none fw-semibold text-dark small"
              onClick={onResetFilters}
            >
              Xem tất cả <i className="bi bi-arrow-right ms-1"></i>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Sport Pill Filter Row */}
      {sportTypes.length > 0 && setSelectedCategory && (
        <div className="d-flex align-items-center gap-2 flex-wrap mb-4">
          <button
            type="button"
            className={`sport-filter-pill ${selectedCategory === '' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('')}
          >
            <i className="bi bi-grid-fill"></i>
            <span>Tất cả</span>
          </button>

          {sportTypes.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <button
                key={cat.sport_type_id || cat.name}
                type="button"
                className={`sport-filter-pill ${active ? 'active' : ''}`}
                onClick={() => setSelectedCategory(active ? '' : cat.name)}
              >
                <i className={`bi ${getSportIconClass(cat.name)}`}></i>
                <span>{formatCategoryLabel(cat.name)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading / Error / Empty / Grid state */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2 text-muted small">Đang tải danh sách sân...</p>
        </div>
      ) : error ? (
        <div className="text-center py-5 bg-light rounded-3 border">
          <i className="bi bi-wifi-off fs-2 text-danger"></i>
          <h6 className="mt-2 fw-bold text-dark">Không thể tải dữ liệu sân</h6>
          <p className="text-muted small mb-3">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-brand btn-sm" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise me-1"></i>Thử lại
            </button>
          )}
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-3 border">
          <i className={`bi ${favoritesOnly ? 'bi-heart' : 'bi-search'} fs-2 text-muted`}></i>
          <h6 className="mt-2 fw-bold text-dark">
            {favoritesOnly ? 'Bạn chưa lưu sân nào' : 'Không tìm thấy sân phù hợp'}
          </h6>
          <p className="text-muted small mb-3">
            {favoritesOnly
              ? 'Nhấn biểu tượng trái tim trên cụm sân để lưu vào danh sách của bạn.'
              : 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'}
          </p>
          {onResetFilters && (
            <button type="button" className="btn btn-brand btn-sm" onClick={onResetFilters}>
              Xem tất cả sân
            </button>
          )}
        </div>
      ) : (
        <div className="row g-4">
          {courts.map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              onBookNow={onBookNow}
              isFavorite={Boolean(currentUser) && favSet.has(Number(court.id))}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}
