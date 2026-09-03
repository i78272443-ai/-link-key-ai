# Link Key AI Website

Website chatbot hỗ trợ phân tích URL và redirect công khai.

## Chạy trên máy tính
1. Cài Node.js.
2. Đổi `.env.example` thành `.env`.
3. Điền `OPENAI_API_KEY` vào `.env` (không gửi key lên chat và không đưa vào frontend).
4. Chạy:
   npm install
   npm start
5. Mở http://localhost:3000

## Đưa lên hosting
Tạo biến môi trường `OPENAI_API_KEY` trên hosting rồi chạy `npm install` và `npm start`.

## Giới hạn
Không dùng website để bypass CAPTCHA, Cloudflare, anti-bot, paywall hoặc cơ chế bảo vệ/truy cập trái phép.
