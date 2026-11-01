import React from 'react';

export default function CourtCard({ court, onBookNow }) {
  return (
    <div className="col-lg-4 col-md-6 mb-4">
      <div className="card h-100 court-card">
        {/* Card Image with Badges */}
        <div className="court-card-img-wrapper position-relative">
          <img 
            src={court.imageUrl} 
            alt={court.name} 
            className="court-card-img"
            loading="lazy"
          />
          {/* Category Tag */}
          <div className="position-absolute top-0 start-0 m-3">
            <span className="badge-sport text-uppercase shadow-sm">
              {court.category}
            </span>
          </div>
          {/* Rating Tag */}
          <div className="position-absolute top-0 end-0 m-3">
            <div className="badge bg-white text-dark shadow-sm d-flex align-items-center gap-1 py-1 px-2 fw-semibold">
              <i className="bi bi-star-fill text-warning"></i>
              <span>{court.rating.toFixed(1)}</span>
              <span className="text-muted small">({court.reviewCount})</span>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="card-body d-flex flex-column p-4">
          {/* Court Name */}
          <h5 className="card-title fw-bold text-brand-dark mb-2 line-clamp-1" title={court.name}>
            {court.name}
          </h5>

          {/* Court Address */}
          <p className="card-text text-muted small mb-3 d-flex align-items-start gap-1">
            <i className="bi bi-geo-alt text-brand flex-shrink-0 mt-1"></i>
            <span className="text-truncate">{court.address}</span>
          </p>

          {/* Amenities Badges */}
          <div className="d-flex flex-wrap gap-2 mb-4">
            {court.amenities && court.amenities.map((amenity, idx) => (
              <span key={idx} className="amenity-chip">
                {amenity}
              </span>
            ))}
          </div>

          {/* Pricing and Action Button */}
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
              className="btn btn-brand px-3 py-2 fw-semibold"
              onClick={() => onBookNow(court)}
            >
              Đặt ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

