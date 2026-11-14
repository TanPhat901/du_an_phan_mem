// Cấu hình Base URL API linh hoạt
// 1. Khi chạy trên Vercel hoặc Local (có Vite proxy): API_BASE = '' (dùng đường dẫn tương đối /api/...)
// 2. Khi Backend deploy riêng (Render, Railway): API_BASE = import.meta.env.VITE_API_URL
export const API_BASE = import.meta.env.VITE_API_URL || '';

