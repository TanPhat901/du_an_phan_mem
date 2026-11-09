import React, { useState, useMemo } from 'react';
import { buildVietQrUrl, formatDisplayDate } from '../utils/vietqr';

// Standard Code-39 encoding patterns (1=wide, 0=narrow across alternating bar/space/bar/...)
const CODE39_TABLE = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  A: '100001001',
  B: '001001001',
  C: '101001000',
  D: '000011001',
  E: '100011000',
  F: '001011000',
  G: '000001101',
  H: '100001100',
  I: '001001100',
  J: '000011100',
  K: '100000011',
  L: '001000011',
  M: '101000010',
  N: '000010011',
  O: '100010010',
  P: '001010010',
  Q: '000000111',
  R: '100000110',
  S: '001000110',
  T: '000010110',
  U: '110000001',
  V: '011000001',
  W: '111000000',
  X: '010010001',
  Y: '110010000',
  Z: '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '*': '010010100'
};

function Code39Svg({ value }) {
  const sanitized = useMemo(() => {
    const clean = String(value || 'BK-0')
      .toUpperCase()
      .replace(/[^0-9A-Z\-. ]/g, '-');
    return `*${clean}*`;
  }, [value]);

  const bars = useMemo(() => {
    const rects = [];
    let x = 4;
    const narrow = 2;
    const wide = 5;

    for (let c = 0; c < sanitized.length; c++) {
      const pattern = CODE39_TABLE[sanitized[c]] || CODE39_TABLE['-'];
      for (let i = 0; i < pattern.length; i++) {
        const w = pattern[i] === '1' ? wide : narrow;
        if (i % 2 === 0) {
          rects.push({ x, w });
        }
        x += w;
      }
      x += narrow; // inter-character gap
    }
    return { rects, totalWidth: x + 4 };
  }, [sanitized]);

  return (
    <svg
      viewBox={`0 0 ${bars.totalWidth} 44`}
      width="100%"
      height="44"
      style={{ maxWidth: '240px', display: 'block', margin: '0 auto' }}
      aria-label={`Mã vạch check-in ${value}`}
    >
      <rect x="0" y="0" width={bars.totalWidth} height="44" fill="#ffffff" />
      {bars.rects.map((r, idx) => (
        <rect key={idx} x={r.x} y="2" width={r.w} height="40" fill="#111827" />
      ))}
    </svg>
  );
}

export default function TicketBarcode({ booking, compact = false }) {
  const [qrOnlineFailed, setQrOnlineFailed] = useState(false);
  const [vietQrFailed, setVietQrFailed] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  if (!booking) return null;

  const ticketCode = booking.id || `BK-${booking.bookingId || 0}`;
  const isPending = booking.status === 'PENDING';
  const isCompleted = booking.status === 'COMPLETED';
  const headerColor = isPending
    ? '#b45309'
    : isCompleted
      ? '#1d4ed8'
      : '#0b4d3c';
  const headerLabel = isPending
    ? 'Phiếu đặt sân • Chờ chủ sân xác nhận'
    : isCompleted
      ? 'Vé điện tử • Đã check-in'
      : 'Vé điện tử • Đã xác nhận';
  const checkinPayload = `SPORTSBOOKING|${ticketCode}|${booking.date}|${booking.timeSlot}`;
  const checkinQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=${encodeURIComponent(checkinPayload)}`;

  const showVietQr =
    booking.paymentMethod &&
    (booking.paymentMethod.toLowerCase().includes('vietqr') ||
      booking.paymentMethod.toLowerCase().includes('vnpay')) &&
    booking.bankAccountNo;

  const transferNote = `TT SAN ${ticketCode.replace(/[^A-Z0-9]/gi, '')}`;
  const vietQrUrl = showVietQr
    ? buildVietQrUrl({
        bankName: booking.bankName,
        bankAccountNo: booking.bankAccountNo,
        bankAccountName: booking.bankAccountName,
        amount: booking.totalPrice,
        addInfo: transferNote
      })
    : null;

  const copyValue = (key, val) => {
    navigator.clipboard?.writeText(String(val || ''));
    setCopiedField(key);
    setTimeout(() => setCopiedField(''), 2000);
  };

  return (
    <div className="d-flex flex-column gap-3">
      {/* Electronic Check-in Pass */}
      <div className="border rounded-4 overflow-hidden bg-white shadow-sm">
        <div
          className="px-3 py-2 text-white d-flex justify-content-between align-items-center"
          style={{ backgroundColor: headerColor }}
        >
          <div className="d-flex align-items-center gap-2">
            <i className={`bi ${isPending ? 'bi-hourglass-split' : isCompleted ? 'bi-patch-check-fill' : 'bi-qr-code-scan'}`}></i>
            <span className="fw-bold small">{headerLabel}</span>
          </div>
          <span className="badge rounded-pill bg-white text-dark fw-bold">{ticketCode}</span>
        </div>

        <div className={compact ? 'p-3' : 'p-4'}>
          <div className="row g-3 align-items-center">
            <div className="col-sm-8">
              <div className="fw-bold text-brand-dark fs-6 mb-1">{booking.courtName}</div>
              {booking.subCourtName && (
                <div className="mb-2">
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    {booking.subCourtName}
                  </span>
                </div>
              )}
              {booking.address && (
                <div className="small text-muted mb-2">
                  <i className="bi bi-geo-alt me-1 text-brand"></i>
                  {booking.address}
                </div>
              )}
              <div className="row g-2 small mt-1">
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Ngày chơi</div>
                  <div className="fw-bold text-dark">{formatDisplayDate(booking.date)}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Khung giờ</div>
                  <div className="fw-bold text-success">{booking.timeSlot}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Người đặt</div>
                  <div className="fw-semibold text-dark">{booking.customerName}</div>
                </div>
                <div className="col-6">
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>Thanh toán</div>
                  <div className="fw-bold text-brand-dark">
                    {Number(booking.totalPrice || 0).toLocaleString('vi-VN')}đ ({booking.paymentMethod})
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-4 text-center">
              {!qrOnlineFailed && (
                <div className="p-2 bg-white border rounded-3 d-inline-block mb-2">
                  <img
                    src={checkinQrUrl}
                    alt={`QR check-in ${ticketCode}`}
                    width="108"
                    height="108"
                    style={{ display: 'block' }}
                    onError={() => setQrOnlineFailed(true)}
                  />
                </div>
              )}
              <div className="px-2 py-1 bg-light border rounded-2">
                <Code39Svg value={ticketCode} />
                <div className="fw-bold text-dark mt-1" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>
                  {ticketCode}
                </div>
              </div>
              <div className="text-muted mt-1" style={{ fontSize: '0.68rem' }}>
                {isPending
                  ? 'Đang chờ chủ sân xác nhận đơn trước khi Check-in'
                  : isCompleted
                    ? 'Đã hoàn tất Check-in tại sân'
                    : 'Đưa mã này tại quầy để check-in'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Owner VietQR Payment Panel (when chosen & owner bank is configured) */}
      {showVietQr && (
        <div className="border border-success-subtle rounded-4 p-3" style={{ backgroundColor: '#f4f9f6' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold text-brand-dark small d-flex align-items-center gap-2">
              <i className="bi bi-bank2 text-brand"></i>
              <span>Thông tin chuyển khoản VietQR</span>
            </div>
            <span className="badge rounded-pill bg-success-subtle text-success">Quét bằng App Ngân hàng</span>
          </div>

          <div className="row g-3 align-items-center">
            {vietQrUrl && !vietQrFailed && (
              <div className="col-sm-4 text-center">
                <div className="bg-white p-2 rounded-3 border d-inline-block shadow-sm">
                  <img
                    src={vietQrUrl}
                    alt="Mã VietQR thanh toán sân"
                    style={{ width: '140px', maxWidth: '100%', display: 'block' }}
                    onError={() => setVietQrFailed(true)}
                  />
                </div>
              </div>
            )}
            <div className={vietQrUrl && !vietQrFailed ? 'col-sm-8' : 'col-12'}>
              <div className="bg-white rounded-3 border p-3 small d-flex flex-column gap-2">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Ngân hàng:</span>
                  <strong className="text-dark">{booking.bankName || 'Ngân hàng đối tác'}</strong>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Số tài khoản:</span>
                  <div className="d-flex align-items-center gap-2">
                    <strong className="text-brand-dark">{booking.bankAccountNo}</strong>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      style={{ fontSize: '0.72rem' }}
                      onClick={() => copyValue('acct', booking.bankAccountNo)}
                    >
                      {copiedField === 'acct' ? 'Đã chép ✓' : 'Chép'}
                    </button>
                  </div>
                </div>
                {booking.bankAccountName && (
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Chủ tài khoản:</span>
                    <strong className="text-dark">{booking.bankAccountName}</strong>
                  </div>
                )}
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Số tiền:</span>
                  <strong className="text-success fs-6">
                    {Number(booking.totalPrice || 0).toLocaleString('vi-VN')}đ
                  </strong>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted">Nội dung CK:</span>
                  <div className="d-flex align-items-center gap-2">
                    <strong className="text-dark">{transferNote}</strong>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                      style={{ fontSize: '0.72rem' }}
                      onClick={() => copyValue('note', transferNote)}
                    >
                      {copiedField === 'note' ? 'Đã chép ✓' : 'Chép'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

