import React from 'react';

export default function CourtCard({
  court,
  onBookNow,
  isFavorite = false,
  onToggleFavorite
}) {
  const totalSlots = Number(court.totalSlots ?? (Array.isArray(court.availableSlots) ? court.availableSlots.length : 0));
  const availCount = Number(court.availableSlotCount ?? totalSlots);
  const reviewCount = Number(court.reviewCount || 0);
  const hasRealSlotsInfo = court.availabilityDate || typeof court.availableSlotCount === 'number';

  let availabilityBadgeClass = 'bg-success';
  let availabilityLabel = 'Sân trống';
  if (hasRealSlotsInfo) {
    if (totalSlots === 0) {
      availabilityBadgeClass = 'bg-secondary';
      availabilityLabel = 'Chưa mở giờ';
    } else if (availCount > 0) {
      availabilityBadgeClass = 'bg-success';
      availabilityLabel = `Còn ${availCount}/${totalSlots} ca`;
    } else {
      availabilityBadgeClass = 'bg-danger';
      availabilityLabel = 'Hết chỗ';
    }
  }

  return (
    <div className="col-lg-4 col-md-6 mb-4">
      <div className="card h-100 court-card">
        {/* Card Image / Preview with Badges */}
        <div className="court-card-img-wrapper position-relative">
          <img
            src={court.imageUrl}
            alt={court.name}
            className="court-card-img"
            loading="lazy"
            style={{ cursor: 'pointer' }}
            onClick={() => onBookNow(court)}
          />

          {/* Bottom overlay frame with real slot availability for chosen date */}
          <div
            className="position-absolute bottom-0 start-0 end-0 m-2 p-2 rounded-3 bg-white bg-opacity-95 shadow-sm d-flex align-items-center justify-content-between"
            style={{ backdropFilter: 'blur(4px)', fontSize: '0.72rem' }}
          >
            <div className="d-flex align-items-center gap-1 min-w-0">
              <span className={`badge ${availabilityBadgeClass} py-1 px-1 flex-shrink-0`} style={{ fontSize: '0.62rem' }}>
                {availabilityLabel}
              </span>
              <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: '125px' }}>
                {court.subCourtCount > 0 ? `${court.subCourtCount} sân con` : court.name}
              </span>
            </div>
            <span className="text-success fw-bold flex-shrink-0 ms-1">{court.openTime || 'Mở cả ngày'}</span>
          </div>

          {/* Category Tag */}
          <div className="position-absolute top-0 start-0 m-3">
            <span className="badge-sport text-uppercase shadow-sm">
              {court.category}
            </span>
          </div>

          {/* Rating & Favorite Heart Controls */}
          <div className="position-absolute top-0 end-0 m-3 d-flex align-items-center gap-2">
            <div className="badge bg-white text-dark shadow-sm d-flex align-items-center gap-1 py-1 px-2 fw-semibold">
              <i className="bi bi-star-fill text-warning"></i>
              <span>{reviewCount > 0 ? (court.ratingFormatted || court.rating) : 'Mới'}</span>
              {reviewCount > 0 && <span className="text-muted small">({reviewCount})</span>}
            </div>

            {onToggleFavorite && (
              <button
                type="button"
                className={`btn btn-sm rounded-circle shadow-sm p-0 d-inline-flex align-items-center justify-content-center ${
                  isFavorite ? 'btn-danger text-white' : 'btn-light text-danger'
                }`}
                style={{ width: '30px', height: '30px' }}
                title={isFavorite ? 'Bỏ khỏi sân yêu thích' : 'Lưu sân yêu thích'}
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
        </div>

        {/* Card Body */}
        <div className="card-body d-flex flex-column p-4">
          <h5
            className="card-title fw-bold text-brand-dark mb-2 line-clamp-1"
            title={court.name}
            style={{ cursor: 'pointer' }}
            onClick={() => onBookNow(court)}
          >
            {court.name}
          </h5>

          <p className="card-text text-muted small mb-3 d-flex align-items-start gap-1">
            <i className="bi bi-geo-alt text-brand flex-shrink-0 mt-1"></i>
            <span className="text-truncate">{court.address}</span>
          </p>

          <div className="d-flex flex-wrap gap-2 mb-4">
            {court.amenities && court.amenities.map((amenity, idx) => (
              <span key={idx} className="amenity-chip">
                {amenity}
              </span>
            ))}
          </div>

          <div className="d-flex align-items-center justify-content-between mt-auto pt-3 border-top">
            <div>
              <span className="d-block text-muted" style={{ fontSize: '0.75rem' }}>Giá thuê chỉ từ</span>
              <div className="d-flex align-items-baseline gap-1">
                <span className="fw-bold fs-5 text-brand-dark">
                  {court.priceFormatted || `${court.pricePerHour.toLocaleString('vi-VN')}đ`}
                </span>
                <span className="text-muted small">/giờ</span>
              </div>
            </div>

            <button
              className="btn btn-xem-san"
              onClick={() => onBookNow(court)}
              title="Xem chi tiết sân và đặt lịch"
            >
              <span>Xem sân</span>
              <span className="xem-san-icon">
                <i className="bi bi-chevron-right"></i>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
