# 🏆 SportsBooking - Nền Tảng Đặt Sân Thể Thao Số 1 Việt Nam

Dự án trang chủ hệ thống đặt sân thể thao **SportsBooking** được xây dựng chuẩn theo yêu cầu công nghệ và giao diện thiết kế:

- **Frontend**: ReactJS, JavaScript (ES6+)
- **Giao diện**: HTML5, CSS3, Bootstrap 5, Bootstrap Icons
- **Backend**: Node.js, Express.js
- **Kiến trúc**: RESTful API Client-Server

---

## 📸 Các thành phần giao diện đã hoàn thiện (Theo mẫu thiết kế)

1. **Header / Thanh Điều Hướng (Navbar)**:
   - Logo thương hiệu kèm biểu tượng cúp thể thao 🏆
   - Danh mục điều hướng: *Trang chủ* (active underline), *Tìm sân*, *Lịch đặt*, *Hướng dẫn*.
   - Nút *Đăng nhập* & nút *Đăng ký* nổi bật.
2. **Hero Banner**:
   - Huy hiệu `● NỀN TẢNG THỂ THAO #1 VIỆT NAM`.
   - Tiêu đề ấn tượng: **"Tìm sân. Chơi hết mình."**
   - Mô tả và 2 cam kết: `✓ 1.200+ sân đã có mặt`, `✓ Xác nhận tức thì`.
   - Card phối cảnh 3D trực quan giao diện ứng dụng.
3. **Thanh tìm kiếm & Bộ lọc nổi (Search Bar)**:
   - 2 Tab chuyển đổi: **Tìm sân thể thao** và **Lịch đặt của tôi**.
   - Tìm kiếm theo từ khóa ("Bạn muốn chơi gì?"), Khu vực ("TP. Hồ Chí Minh", "Hà Nội", ...), Ngày chơi ("Thứ bảy, 24/08").
   - Gợi ý phân loại nhanh (Padel & Pickleball, Bóng đá & Tennis, Cầu lông).
   - Bộ lọc giá nâng cao linh hoạt.
4. **Khu vực Sân Thể Thao Nổi Bật Gần Bạn ("ĐỀ XUẤT HÔM NAY")**:
   - Hiển thị danh sách card sân với ảnh thực tế, tag môn thể thao, điểm đánh giá sao, địa chỉ chi tiết, danh sách tiện ích (Bãi đỗ ô tô, Phòng tắm nóng lạnh, Café, Sân cỏ nhân tạo...).
   - Giá thuê theo giờ và nút **"Đặt ngay"**.
5. **Khối Kêu Gọi Hợp Tác Dành Cho Chủ Sân**:
   - Banner nền xanh: *"Tối ưu công suất & Tăng 40% doanh thu mỗi tháng"*.
   - Nút đăng ký đối tác chủ sân & modal biểu mẫu gửi thông tin.
6. **Chân trang (Footer)**:
   - Thông tin bản quyền, đường dẫn hỗ trợ, Hotline `1900 8888`, chuyển đổi ngôn ngữ & khu vực.
7. **Các tính năng tương tác Modal**:
   - **Đặt sân tức thì**: Chọn ngày, khung giờ chơi, điền họ tên, số điện thoại, tính giá tự động và lưu vào hệ thống Backend.
   - **Xem danh sách lịch đặt**: Xem lại các đơn đặt sân đã xác nhận.
   - **Đăng ký đối tác chủ sân**: Đăng ký sân để tiếp cận khách hàng.
   - **Đăng nhập / Đăng ký**: Hỗ trợ tài khoản người chơi.

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Khởi chạy Backend (Node.js & Express.js)
```bash
cd server
npm install
npm start
```
*Server API sẽ chạy tại: `http://localhost:5000`*
- `GET /api/courts`: Tìm kiếm và lọc danh sách sân
- `POST /api/bookings`: Đặt sân
- `GET /api/bookings`: Lấy lịch sử đặt sân
- `POST /api/bookings/partner`: Tiếp nhận thông tin đối tác chủ sân

### 2. Khởi chạy Frontend (ReactJS & Bootstrap)
Mở một cửa sổ dòng lệnh thứ 2:
```bash
cd frontend
npm install
npm run dev
```
*Giao diện người dùng sẽ chạy tại: `http://localhost:3000` (hoặc cổng hiển thị trên terminal).*

---

## 📁 Cấu trúc thư mục dự án

```
c:\QTDAPM
├── server/                    # Backend Node.js & Express
│   ├── data/
│   │   └── courts.json        # Dữ liệu mẫu danh sách sân thể thao
│   ├── routes/
│   │   ├── courtRoutes.js     # API tìm kiếm, lọc sân
│   │   └── bookingRoutes.js   # API đặt sân & đối tác
│   ├── server.js              # Điểm khởi chạy Express server
│   └── package.json
│
├── frontend/                  # Frontend ReactJS + Bootstrap
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── HeroSection.jsx
│   │   │   ├── SearchFilterBar.jsx
│   │   │   ├── CourtList.jsx
│   │   │   ├── CourtCard.jsx
│   │   │   ├── PartnerBanner.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── BookingModal.jsx
│   │   │   ├── PartnerModal.jsx
│   │   │   ├── MyBookingsModal.jsx
│   │   │   └── AuthModal.jsx
│   │   ├── App.jsx            # State & điều phối toàn bộ ứng dụng
│   │   ├── App.css
│   │   ├── index.css          # Tùy biến màu thương hiệu & typography
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json               # Quản lý script khởi chạy tổng
└── README.md                  # Hướng dẫn chi tiết
```

