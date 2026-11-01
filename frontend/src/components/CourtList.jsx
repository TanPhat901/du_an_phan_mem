import React from 'react';
import CourtCard from './CourtCard';

export default function CourtList({ courts, loading, onBookNow }) {
  return (
    <section className="container py-4 mb-5" id="featured-courts">
      {/* Section Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
        <div>
          <div className="d-inline-flex align-items-center gap-2 badge-pill-brand mb-2">
            <span className="rounded-circle bg-success" style={{ width: '6px', height: '6px' }}></span>
            <span>ĐỀ XUẤT HÔM NAY</span>
          </div>
          <h2 className="fw-bold text-brand-dark mb-0 fs-3">
            Sân thể thao nổi bật gần bạn
          </h2>
        </div>
        <p className="text-muted small mb-0 text-md-end" style={{ maxWidth: '360px' }}>
          Được cộng đồng đánh giá dịch vụ tốt, mặt sân chuẩn thi đấu và đặt sân nhiều nhất
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
          <p className="mt-2 text-muted">Đang cập nhật danh sách sân mới nhất...</p>
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border">
          <i className="bi bi-emoji-neutral fs-1 text-muted"></i>
          <h5 className="mt-3 fw-bold">Không tìm thấy sân phù hợp</h5>
          <p className="text-muted small">Hãy thử tìm kiếm với từ khóa khác hoặc bỏ các bộ lọc nâng cao.</p>
        </div>
      ) : (
        /* Courts Grid */
        <div className="row g-4">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} onBookNow={onBookNow} />
          ))}
        </div>
      )}
    </section>
  );
}

