import React from 'react';
import CourtCard from './CourtCard';
import { formatDisplayDate } from '../utils/vietqr';

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
  onResetFilters
}) {
  const favSet = new Set(favoriteCourtIds.map(Number));

  return (
    <section className="container py-4 mb-5" id="featured-courts">
      {/* Section Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
        <div>
          <div className="d-inline-flex align-items-center gap-2 badge-pill-brand mb-2">
            <span className="rounded-circle bg-success" style={{ width: '6px', height: '6px' }}></span>
            <span>{favoritesOnly ? 'SÂN YÊU THÍCH CỦA BẠN' : 'ĐỀ XUẤT HÔM NAY'}</span>
          </div>
          <h2 className="fw-bold text-brand-dark mb-0 fs-3">
            {favoritesOnly ? 'Danh sách sân bạn đã lưu' : 'Sân thể thao nổi bật gần bạn'}
          </h2>
        </div>

        <div className="text-md-end">
          <div className="d-inline-flex align-items-center gap-2 small fw-semibold text-brand-dark bg-light border rounded-pill px-3 py-1 mb-1">
            <i className="bi bi-calendar3 text-brand"></i>
            <span>{courts.length} cụm sân • Ngày {formatDisplayDate(playDate)}</span>
          </div>
          <p className="text-muted small mb-0" style={{ maxWidth: '380px' }}>
            Hiển thị khung giờ trống theo thời gian thực và đánh giá thực tế từ người chơi
          </p>
        </div>
      </div>

      {/* Loading / Error / Empty / Grid state */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2 text-muted">Đang cập nhật danh sách sân mới nhất...</p>
        </div>
      ) : error ? (
        <div className="text-center py-5 bg-danger-subtle bg-opacity-25 rounded-4 border border-danger-subtle">
          <i className="bi bi-wifi-off fs-1 text-danger"></i>
          <h5 className="mt-3 fw-bold text-danger-emphasis">Không thể tải dữ liệu sân từ máy chủ</h5>
          <p className="text-muted small mb-3">{error}</p>
          {onRetry && (
            <button type="button" className="btn btn-brand btn-sm" onClick={onRetry}>
              <i className="bi bi-arrow-clockwise me-1"></i>Thử tải lại
            </button>
          )}
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className={`bi ${favoritesOnly ? 'bi-heart' : 'bi-emoji-neutral'} fs-1 text-muted`}></i>
          <h5 className="mt-3 fw-bold">
            {favoritesOnly ? 'Bạn chưa lưu sân yêu thích nào' : 'Không tìm thấy sân phù hợp'}
          </h5>
          <p className="text-muted small mb-3">
            {favoritesOnly
              ? 'Nhấn biểu tượng trái tim trên bất kỳ cụm sân nào để lưu vào danh sách nhanh.'
              : 'Hãy thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc.'}
          </p>
          {onResetFilters && (
            <button type="button" className="btn btn-brand btn-sm" onClick={onResetFilters}>
              Xem tất cả cụm sân
            </button>
          )}
        </div>
      ) : (
        /* Courts Grid */
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
