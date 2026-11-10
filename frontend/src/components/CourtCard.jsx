import React, { useState, useEffect } from 'react';

export default function CourtCard({
  court,
  onBookNow,
  isFavorite = false,
  onToggleFavorite
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [court.imageUrl]);

  const totalSlots = Number(court.totalSlots ?? (Array.isArray(court.availableSlots) ? court.availableSlots.length : 0));
  const availCount = Number(court.availableSlotCount ?? totalSlots);
  const reviewCount = Number(court.reviewCount || 0);
  const hasRealSlotsInfo = court.availabilityDate || typeof court.availableSlotCount === 'number';

  let availabilityTextClass = 'text-success';
  let availabilityLabel = 'Còn sân';
  if (hasRealSlotsInfo) {
    if (totalSlots === 0) {
      availabilityTextClass = 'text-muted';
      availabilityLabel = 'Chưa mở giờ';
    } else if (availCount > 0) {
      availabilityTextClass = 'text-success';
      availabilityLabel = `Còn ${availCount}/${totalSlots} ca`;
    } else {
      availabilityTextClass = 'text-danger';
      availabilityLabel = 'Hết chỗ';
    }
  }

  return (
    <div className="col-lg-4 col-md-6">
      <div className="card h-100 court-card">
        {/* Card Image */}
        <div className="court-card-img-wrapper position-relative">
          {court.imageUrl && !imgError ? (
            <img
              src={court.imageUrl}
              alt={court.name}
              className="court-card-img"
              loading="lazy"
              style={{ cursor: 'pointer' }}
              onClick={() => onBookNow(court)}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="court-placeholder-box"
              style={{ cursor: 'pointer' }}
              onClick={() => onBookNow(court)}
            >
              <i className="bi bi-building fs-2 mb-1"></i>
              <span className="small fw-medium text-truncate px-3" style={{ maxWidth: '100%' }}>
                {court.category || 'Sân thể thao'}
              </span>
            </div>
          )}

          {/* Crisp Category Tag */}
          <div className="position-absolute top-0 start-0 m-2 p-1">
            <span className="court-category-pill">
              {court.category}
            </span>
          </div>

          {/* Favorite Heart */}
          {onToggleFavorite && (
            <button
              type="button"
              className={`court-fav-btn btn btn-sm rounded-circle position-absolute top-0 end-0 m-2 p-0 d-inline-flex align-items-center justify-content-center border-0 ${
                isFavorite ? 'bg-danger text-white' : 'bg-white text-secondary'
              }`}
              title={isFavorite ? 'Bỏ lưu sân yêu thích' : 'Lưu sân yêu thích'}
              aria-label={isFavorite ? 'Bỏ lưu sân yêu thích' : 'Lưu sân yêu thích'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(court);
              }}
            >
              <i className={`bi ${isFavorite ? 'bi-heart-fill' : 'bi-heart'} small`}></i>
            </button>
          )}
        </div>

        {/* Card Body */}
        <div className="card-body d-flex flex-column p-3">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
            <h5
              className="card-title h6 fw-bold text-dark mb-0 text-truncate"
              title={court.name}
              style={{ cursor: 'pointer' }}
              onClick={() => onBookNow(court)}
            >
              {court.name}
            </h5>
            <span className="d-inline-flex align-items-center gap-1 small fw-semibold text-dark flex-shrink-0">
              <i className="bi bi-star-fill text-warning" style={{ fontSize: '0.78rem' }}></i>
              <span>{reviewCount > 0 ? (court.ratingFormatted || court.rating) : 'Mới'}</span>
            </span>
          </div>

          <p className="text-muted small mb-2 text-truncate" title={court.address}>
            <i className="bi bi-geo-alt me-1"></i>
            {court.address || 'Chưa cập nhật địa chỉ'}
          </p>

          <div className="small mb-3 d-flex flex-wrap align-items-center gap-2 text-muted">
            <span className={`fw-semibold ${availabilityTextClass}`}>{availabilityLabel}</span>
            {court.subCourtCount > 0 && <span>• {court.subCourtCount} sân</span>}
            {court.openTime && <span>• {court.openTime}</span>}
          </div>

          <div className="d-flex align-items-center justify-content-between mt-auto pt-3 border-top">
            <div>
              <span className="fw-bold text-dark fs-6">
                {court.priceFormatted || `${Number(court.pricePerHour || 0).toLocaleString('vi-VN')}đ`}
              </span>
              <span className="text-muted small"> / giờ</span>
            </div>

            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none fw-semibold text-brand-dark small"
              onClick={() => onBookNow(court)}
            >
              Xem sân <i className="bi bi-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
