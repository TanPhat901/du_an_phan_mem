## 1. Liên kết Issue & Milestone
- Issue giải quyết: Closes #
- Sprint / Milestone: 

## 2. Loại thay đổi (Conventional Commits)
- [ ] `feat`: Tính năng mới
- [ ] `fix`: Sửa lỗi
- [ ] `docs`: Cập nhật tài liệu
- [ ] `refactor`: Tái cấu trúc mã nguồn (không đổi nghiệp vụ)
- [ ] `chore`: Cấu hình công cụ, CI/CD, database migration

## 3. Tóm tắt thay đổi
- 

## 4. Ghi chú tự kiểm thử (Self-test Notes)
> Mô tả rõ cách bạn đã tự test trước khi gửi Peer Review (tài khoản test, API đã gọi, các case đã thử).

- **Môi trường test:** Local (`frontend` Vite + `server` Node.js + PostgreSQL)
- **Các kịch bản đã tự kiểm thử:**
  - [ ] Đã kiểm tra build Frontend (`npm run build` trong `frontend/`) thành công, không lỗi cú pháp
  - [ ] Đã kiểm tra khởi chạy Backend (`server.js`) và API liên quan hoạt động bình thường
  - [ ] Đã test các trường hợp biên / phân quyền / dữ liệu rỗng
- **Bằng chứng kiểm thử (ảnh chụp màn hình / terminal log):**
  *(Dán ảnh hoặc log kết quả test tại đây nếu có)*

## 5. Checklist trước khi gửi Peer Review
- [ ] Tiêu đề PR / commit mới tuân thủ Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`)
- [ ] Không chứa file nhạy cảm (`server/.env`, token, mật khẩu thật)
- [ ] Đã tag thành viên trong nhóm thực hiện **Peer Review Approval**

