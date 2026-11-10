# 🏆 SportsBooking - Hệ Thống Đặt Sân Thể Thao Trực Tuyến

Dự án hệ thống đặt sân thể thao **SportsBooking** kết nối người chơi và chủ sân với dữ liệu lưu trữ tập trung trên **PostgreSQL**:

- **Frontend**: ReactJS, JavaScript (ES6+), Vite
- **Giao diện**: HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- **Backend**: Node.js, Express.js, JWT Authentication
- **Cơ sở dữ liệu**: PostgreSQL (`pg`)

---

## 📸 Các tính năng & thành phần chính

1. **Header / Thanh Điều Hướng (`Navbar.jsx`, `AccountMenu.jsx`)**:
   - Logo thương hiệu và các tab điều hướng: *Trang chủ*, *Tìm sân*, *Lịch đặt của tôi*, *Hướng dẫn*.
   - Menu tài khoản gọn theo dạng icon người dùng (khi đăng nhập sẽ hiển thị thêm các tùy chọn Hồ sơ cá nhân, Kênh Quản Lý Chủ Sân nếu là `OWNER`, Cổng Quản Trị Hệ Thống nếu là `ADMIN`, Đăng xuất).
2. **Hero Banner (`HeroSection.jsx`)**:
   - Hiển thị thông tin cụm sân nổi bật và tổng số cụm sân đang mở đặt lấy trực tiếp từ PostgreSQL.
3. **Thanh tìm kiếm & Bộ lọc (`SearchFilterBar.jsx`)**:
   - Tải danh sách bộ môn thể thao (`/api/courts/sport-types`) và khu vực (`/api/courts/areas`) trực tiếp từ PostgreSQL.
   - Hỗ trợ tìm kiếm theo từ khóa, khu vực, bộ môn, ngày chơi, lọc sân còn trống theo thời gian thực, sân đã lưu yêu thích và khoảng giá.
4. **Danh sách & Chi tiết Cụm Sân (`CourtList.jsx`, `CourtCard.jsx`, `CourtDetailPage.jsx`)**:
   - Hiển thị danh sách cụm sân thực tế từ API `/api/courts` kèm đánh giá, tiện ích, số sân con, giá thuê và nút **Xem sân**.
   - Trang chi tiết hiển thị ảnh thực tế (hoặc khung giữ chỗ khi chưa có ảnh), chọn sân con, chọn ngày và kiểm tra khung giờ trống theo thời gian thực (`/api/courts/:id/availability`), xem & viết đánh giá sau khi đã Check-in sân.
5. **Luồng Đặt Sân & Trang Lịch Đặt (`BookingModal.jsx`, `MyBookingsPage.jsx`, `TicketBarcode.jsx`)**:
   - Yêu cầu đăng nhập trước khi đặt sân; gửi yêu cầu đặt sân vào PostgreSQL ở trạng thái chờ chủ sân xác nhận (`PENDING`).
   - Hỗ trợ xem danh sách lịch đặt của tôi, vé điện tử QR/VietQR, hủy lịch và gửi đánh giá sau khi Check-in (`COMPLETED`).
6. **Đăng nhập / Đăng ký (`AuthPage.jsx`) & Hồ sơ cá nhân (`ProfilePage.jsx`)**:
   - Hỗ trợ đăng ký Người thuê sân (`USER`) và Chủ sân đối tác (`OWNER`), xác thực JWT lưu phiên làm việc.
7. **Kênh Quản Lý Chủ Sân (`OwnerDashboard.jsx`)**:
   - Quản lý nhiều cụm sân thuộc sở hữu trên một tài khoản.
   - Tổng quan KPI doanh thu, lượt đặt, công suất và biểu đồ 7 ngày từ PostgreSQL.
   - Thêm/Sửa/Xóa sân con, tùy chỉnh khung giờ hoạt động lẻ hoặc tạo nhanh hàng loạt (`/api/owner/time-slots`).
   - Ma trận lịch đặt theo ngày, duyệt đơn / Check-in / từ chối, đặt tại quầy (Walk-in), khóa khung giờ bảo trì.
   - Báo cáo doanh thu, xuất CSV, cài đặt thông tin cơ sở, ảnh đại diện cụm sân và tài khoản VietQR.
8. **Cổng Quản Trị Hệ Thống (`AdminDashboard.jsx`)**:
   - Dành riêng cho vai trò `ADMIN` (bảo vệ bởi `authMiddleware` và `adminMiddleware`).
   - Tổng quan KPI toàn sàn theo mốc 7/14/30 ngày (doanh thu, lượt đặt, người dùng, cụm sân).
   - Kiểm duyệt / bật tắt hiển thị cụm sân, quản lý người dùng (tạo tài khoản, khóa/mở khóa, phân quyền `USER` / `OWNER` / `ADMIN`).
   - Quản lý danh mục bộ môn thể thao, theo dõi/cập nhật trạng thái đơn đặt sân và kiểm duyệt đánh giá.

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Khởi tạo cơ sở dữ liệu PostgreSQL
Cấu hình biến môi trường trong `server/.env` (tham khảo `server/.env.example`), sau đó khởi tạo bảng và chạy migration:
```bash
cd server
npm install
npm run db:init
node database/applyMigrations.js
```

### 2. Khởi chạy Backend (Node.js & Express.js)
```bash
cd server
npm start
```
*Server API sẽ chạy tại: `http://localhost:5000`*
- `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/register-owner`: Xác thực & đăng ký
- `GET /api/courts`, `GET /api/courts/:id`, `GET /api/courts/:id/availability`: Tìm kiếm, chi tiết sân & khung giờ trống
- `GET /api/courts/sport-types`, `GET /api/courts/areas`: Danh mục bộ môn & khu vực từ PostgreSQL
- `POST /api/bookings`, `GET /api/bookings/my`: Đặt sân & lịch đặt cá nhân
- `GET /api/owner/*`: API quản lý dành cho Chủ sân (`OWNER`)
- `GET/POST/PATCH/PUT/DELETE /api/admin/*`: API quản trị hệ thống dành cho Quản trị viên (`ADMIN`)

### 3. Khởi chạy Frontend (ReactJS & Vite)
Mở một cửa sổ dòng lệnh thứ 2:
```bash
cd frontend
npm install
npm run dev
```
*Giao diện người dùng sẽ chạy tại địa chỉ Vite hiển thị trên terminal (mặc định `http://localhost:3000` hoặc `http://localhost:5173`).*

---

## 🛠️ Quy chuẩn GitHub & Quản lý dự án (Project Charter - Mục 7)

1. **GitHub Repository & Branch Protection**:
   - Nhánh `main` được bảo vệ (**Branch Protection**), không push trực tiếp mà hợp nhất qua Pull Request.
   - Commit mới tuân thủ **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
2. **GitHub Issues & Milestones**:
   - Mỗi nhiệm vụ WBS / User Story tương ứng với 01 Issue (mẫu trong `.github/ISSUE_TEMPLATE/`), có đầy đủ **Acceptance Criteria**, **Assignee** và **Milestone** (Sprint).
3. **GitHub Projects (Board & Table)**:
   - Bảng quản lý công khai: [GitHub Projects #1](https://github.com/users/TanPhat901/projects/1).
   - Quản lý luồng Agile/Kanban theo 5 cột: `Backlog` → `Ready` → `In Progress` → `In Review` → `Done`, kết hợp cột `Sprint` (Iteration) và `Story Points` để theo dõi tiến độ / [Biểu đồ Burndown Sprint 1 & 2](./docs/sprint-burndown.md).
4. **GitHub Pull Requests & Peer Review**:
   - Mọi PR vào `main` sử dụng `.github/PULL_REQUEST_TEMPLATE.md`, có ghi chú **tự kiểm thử (Self-test)**, vượt qua kiểm tra CI (`.github/workflows/ci-check.yml`) và được ít nhất **01 thành viên duyệt (Peer Review Approval)**.

---

## 📁 Cấu trúc thư mục dự án

```text
├── .github/
│   ├── ISSUE_TEMPLATE/        # Template User Story (WBS) & Bug Report có Acceptance Criteria
│   ├── workflows/             # ci-check.yml (tự động build Frontend & kiểm tra cú pháp Backend)
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── burndown-sprint-1-2.png # Biểu đồ Burndown Chart Sprint 1 & Sprint 2
│   └── sprint-burndown.md     # Bảng số liệu chi tiết Sprint 1 & Sprint 2
├── database/
│   └── migrations/            # Các script SQL migration cập nhật schema
├── server/                    # Backend Node.js & Express
│   ├── config/                # Kết nối PostgreSQL
│   ├── controllers/           # adminController, ownerCourtController, profileController
│   ├── database/              # schema.sql, initDb.js, applyMigrations.js
│   ├── middleware/            # authMiddleware, adminMiddleware
│   ├── routes/                # authRoutes, courtRoutes, bookingRoutes, ownerCourtRoutes, profileRoutes, adminRoutes
│   ├── services/              # Dịch vụ gửi email
│   ├── server.js              # Điểm khởi chạy Express server
│   └── package.json
├── frontend/                  # Frontend ReactJS + Bootstrap
│   ├── src/
│   │   ├── components/        # AccountMenu, AdminDashboard, AuthPage, BookingModal, CourtCard,
│   │   │                      # CourtDetailPage, CourtList, Footer, HeroSection, HowItWorksSection,
│   │   │                      # MyBookingsPage, Navbar, OwnerDashboard, PartnerBanner,
│   │   │                      # ProfilePage, SearchFilterBar, TicketBarcode
│   │   ├── utils/             # Tiện ích VietQR & xử lý ngày/token
│   │   ├── App.jsx            # Điều phối toàn bộ ứng dụng
│   │   ├── index.css          # Tùy biến giao diện thương hiệu
│   │   └── main.jsx
│   └── package.json
├── package.json               # Script khởi chạy tổng
└── README.md                  # Hướng dẫn dự án
```
