import React, { useState } from 'react';

export default function AuthModal({ initialMode = 'login', onClose, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuthSuccess({
      email,
      name: fullName || (email.split('@')[0])
    });
    onClose();
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
        <div className="modal-content rounded-4 border-0 shadow-lg p-3">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold text-brand-dark">
              {mode === 'login' ? 'Đăng nhập SportsBooking' : 'Đăng ký tài khoản mới'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Mode switch */}
            <div className="d-flex bg-light p-1 rounded-3 mb-4">
              <button
                type="button"
                className={`btn btn-sm w-50 fw-semibold ${mode === 'login' ? 'btn-white shadow-sm bg-white' : 'text-muted'}`}
                onClick={() => setMode('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={`btn btn-sm w-50 fw-semibold ${mode === 'register' ? 'btn-white shadow-sm bg-white' : 'text-muted'}`}
                onClick={() => setMode('register')}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="mb-3">
                  <label className="form-label small text-muted">Họ và tên</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nguyễn Văn A"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small text-muted">Email hoặc Số điện thoại</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="name@example.com hoặc 090..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label small text-muted">Mật khẩu</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-brand w-100 py-2 mt-2">
                {mode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

