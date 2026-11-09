const tls = require('tls');

/**
 * Gửi email thật qua giao thức SMTP chuẩn của Node.js (hỗ trợ Gmail, Brevo, SendGrid, Outlook)
 * Không cần bất kỳ thư viện ngoài nào (100% Native Node.js TLS).
 */
function sendSmtpEmail({ to, subject, htmlContent, textContent }) {
  return new Promise((resolve, reject) => {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return reject(new Error('Chưa cấu hình SMTP_USER và SMTP_PASS trong file server/.env'));
    }

    const socket = tls.connect(smtpPort, smtpHost, { rejectUnauthorized: false }, () => {
      // Kết nối TLS thành công
    });

    socket.setEncoding('utf8');

    let step = 0;
    let logBuffer = '';

    socket.on('data', (data) => {
      logBuffer += data;
      const lines = data.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (code >= 400) {
        socket.end();
        return reject(new Error(`SMTP Error [${code}]: ${lastLine}`));
      }

      // State machine đơn giản của giao thức SMTP
      switch (step) {
        case 0: // Kết nối nhận mã 220
          if (code === 220) {
            step++;
            socket.write(`EHLO ${smtpHost}\r\n`);
          }
          break;
        case 1: // Sau khi gửi EHLO -> AUTH LOGIN
          if (code === 250) {
            step++;
            socket.write('AUTH LOGIN\r\n');
          }
          break;
        case 2: // Nhập Username (base64)
          if (code === 334) {
            step++;
            socket.write(Buffer.from(smtpUser).toString('base64') + '\r\n');
          }
          break;
        case 3: // Nhập Password (base64)
          if (code === 334) {
            step++;
            socket.write(Buffer.from(smtpPass).toString('base64') + '\r\n');
          }
          break;
        case 4: // Xác thực thành công -> MAIL FROM
          if (code === 235) {
            step++;
            socket.write(`MAIL FROM:<${smtpUser}>\r\n`);
          }
          break;
        case 5: // Nhận RCPT TO
          if (code === 250) {
            step++;
            socket.write(`RCPT TO:<${to}>\r\n`);
          }
          break;
        case 6: // Bắt đầu gửi DATA
          if (code === 250) {
            step++;
            socket.write('DATA\r\n');
          }
          break;
        case 7: // Gửi nội dung email
          if (code === 354) {
            step++;
            const message = [
              `From: "SportsBooking Vietnam" <${smtpUser}>`,
              `To: <${to}>`,
              `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
              'MIME-Version: 1.0',
              'Content-Type: text/html; charset=UTF-8',
              '',
              htmlContent,
              '\r\n.\r\n'
            ].join('\r\n');

            socket.write(message);
          }
          break;
        case 8: // Email gửi thành công -> QUIT
          if (code === 250) {
            step++;
            socket.write('QUIT\r\n');
          }
          break;
        case 9:
          socket.end();
          resolve({ success: true, message: 'Đã gửi email thành công qua SMTP thật!' });
          break;
        default:
          break;
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error('SMTP connection timed out'));
    });
  });
}

/**
 * Gửi mã OTP xác thực qua email với template HTML đẹp mắt
 */
async function sendOtpEmail(toEmail, otpCode) {
  const subject = `[SportsBooking] Mã xác thực OTP của bạn là: ${otpCode}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: #0b4d3c; padding: 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
        .body { padding: 32px 28px; text-align: center; }
        .otp-badge { display: inline-block; background: #f0fdf4; border: 2px dashed #0b4d3c; color: #0b4d3c; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 14px 28px; border-radius: 12px; margin: 20px 0; }
        .alert-box { background: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 12px; font-size: 13px; color: #991b1b; text-align: left; margin-top: 20px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SportsBooking</h1>
          <p>Nền tảng tìm kiếm và đặt sân thể thao số 1 Việt Nam</p>
        </div>
        <div class="body">
          <h2 style="margin: 0 0 12px; font-size: 20px; color: #0f172a;">Mã xác thực tài khoản của bạn</h2>
          <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
            Bạn đang thực hiện thao tác đăng ký tài khoản trên hệ thống SportsBooking. Vui lòng nhập mã OTP dưới đây để hoàn tất:
          </p>
          <div class="otp-badge">${otpCode}</div>
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            Mã OTP này có hiệu lực trong vòng <strong>5 phút</strong>.
          </p>
          <div class="alert-box">
            ⚠️ <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã xác thực này cho bất kỳ ai, kể cả nhân viên hỗ trợ của SportsBooking.
          </div>
        </div>
        <div class="footer">
          © 2025 SportsBooking Vietnam.
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendSmtpEmail({
    to: toEmail,
    subject,
    htmlContent
  });
}

module.exports = {
  sendSmtpEmail,
  sendOtpEmail
};

