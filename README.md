# Mây Mặc Studio

Website cửa hàng thời trang tiếng Việt, được tạo mới độc lập. Project này không nhập dữ liệu, tài khoản, giỏ hàng hay cấu hình từ website cũ.

**Bản xem trước đang chạy:** https://may-mac-fashion.trandangkhoi-lt.workers.dev
Đây chưa phải cấu hình bán hàng hoàn chỉnh: cần đặt `ADMIN_SETUP_KEY`, cấu hình Resend để xác minh email, và nhập thông tin cửa hàng trước khi mở các luồng tài khoản cho khách.
Chatbot trên bản Cloudflare đã dùng Workers AI model `@cf/meta/llama-3.1-8b-instruct-fp8`; Ollama vẫn là lựa chọn mặc định cho phát triển local.

## Công nghệ

- React 19, TypeScript, Vite và React Router.
- Cloudflare Worker phục vụ API và file tĩnh.
- Cloudflare D1 lưu tài khoản, catalog, tồn kho, đơn hàng, đánh giá và đăng ký nhận tin.
- Dữ liệu SQL mẫu nằm trong `migrations/0001_init.sql`; mỗi môi trường dùng database riêng.
- Mật khẩu được băm PBKDF2; session dùng cookie `HttpOnly`, `SameSite=Lax`.

## Chạy local

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm ci
cp .dev.vars.example .dev.vars
```

Đổi `ADMIN_SETUP_KEY` trong `.dev.vars` thành chuỗi bí mật ngẫu nhiên của riêng bạn, rồi khởi tạo D1 local:

```bash
ollama pull qwen2.5:3b
npm run db:local
npm run dev
```

Mở `http://localhost:5173`. Vite chuyển `/api` đến Worker local ở cổng `8787`. Tạo quản trị viên đầu tiên tại `/admin/setup`; endpoint này chỉ hoạt động một lần và cần đúng `ADMIN_SETUP_KEY`.
Chatbot local mặc định dùng Ollama tại `http://127.0.0.1:11434`, model `qwen2.5:3b`; bảo đảm Ollama đang chạy và có model đã tải. Có thể đổi `AI_MODEL`, `AI_BASE_URL` hoặc `AI_PROVIDER` trong `.dev.vars`. Chatbot nhận catalog, giá, tồn kho theo màu/size, đánh giá, mã ưu đãi đang hoạt động và thông tin cửa hàng từ Worker/D1 cho mỗi lượt hỏi.

Các lệnh kiểm tra:

```bash
npm run lint
npm run build
```

## Deploy lên Cloudflare

1. Database D1 `may-mac-store` đã được tạo cho project này. Đăng nhập Wrangler nếu chưa đăng nhập:

   ```bash
   npx wrangler login
   ```

2. `wrangler.jsonc` đã trỏ đến database riêng của project. Nếu deploy sang tài khoản Cloudflare khác, tạo D1 riêng và thay `database_id`; không dùng database của dự án khác.
3. Áp dụng schema và dữ liệu sản phẩm khởi tạo:

   ```bash
   npm run db:remote
   ```

4. Cấu hình secret cần thiết trên Cloudflare:

   ```bash
   npx wrangler secret put ADMIN_SETUP_KEY
   ```

   Production đã cấu hình binding Cloudflare Workers AI với model `@cf/meta/llama-3.1-8b-instruct-fp8`; không cần API key Ollama/OpenAI. Có thể cấu hình thêm `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER`. Workers AI tính usage theo tài khoản Cloudflare; kiểm tra giới hạn và giá hiện hành trong Cloudflare Dashboard.
5. Deploy:

   ```bash
   npm run deploy
   ```

Sau khi deploy, mở `/admin/setup` để tạo tài khoản quản trị đầu tiên. Kết nối GitHub với Cloudflare Workers Builds để tự build và deploy khi có thay đổi trên nhánh chính; workflow GitHub trong `.github/workflows/ci.yml` chạy lint và production build.

## Tính năng đã kết nối

- Catalog có tìm kiếm, danh mục và sắp xếp; trang chi tiết hiển thị size, màu, tồn kho.
- Giỏ hàng và danh sách yêu thích lưu trên thiết bị mới này; đơn hàng được tính giá và kiểm tra tồn kho lại ở server.
- Đặt hàng COD hoặc chuyển khoản nếu cửa hàng đã cấu hình thông tin ngân hàng. Mã ưu đãi khởi tạo: `MAYMOI10`.
- Đăng ký có xác minh email, đăng nhập, đặt lại mật khẩu, session phía server, lịch sử và tra cứu đơn hàng.
- Quản trị sản phẩm, ẩn/hiện catalog, cập nhật trạng thái đơn; hủy đơn trước khi giao sẽ hoàn tồn kho bằng trigger D1.
- Đăng ký nhận tin, đánh giá sau khi nhận hàng và chatbot tư vấn dựa trên catalog, tồn kho, đánh giá, mã giảm giá và thông tin cửa hàng qua Cloudflare Workers AI trên production hoặc Ollama local khi phát triển.

## Cấu hình và giới hạn cần hoàn tất trước bán hàng thật

- Database D1 đã được tạo nhưng cần xác nhận cấu hình email và mã quản trị trước khi mở các luồng đăng ký và quản trị cho khách thật.
- COD và chuyển khoản là các phương thức thanh toán hiện được xử lý. VNPay/MoMo chưa bật; cần tài khoản merchant, khóa ký và cấu hình callback/webhook riêng trước khi nhận thanh toán trực tuyến.
- Ollama local chỉ dùng trong phát triển; Worker production dùng binding Cloudflare Workers AI, không gọi Ollama cục bộ.
- Email xác minh/đặt lại mật khẩu dùng Resend; cần cấu hình `RESEND_API_KEY`, `MAIL_FROM` và `APP_ORIGIN`. Local dev trả link kiểm thử ngay trong phản hồi API.
- Chưa có tích hợp hãng vận chuyển, hóa đơn điện tử, chính sách trả hàng theo từng trường hợp hay đồng bộ tồn kho từ POS.
- Hình ảnh sản phẩm hiện tải từ Unsplash; thay bằng ảnh sản phẩm có bản quyền cửa hàng hoặc object storage trước khi mở bán.
- Catalog SQL là dữ liệu khởi tạo mới để demo; hãy rà soát sản phẩm, chất liệu, giá, tồn kho, thông tin pháp lý và nội dung chính sách trước khi nhận khách.

Website có thể build và chạy trên Cloudflare, nhưng chưa nên nhận thanh toán trực tuyến cho đến khi hoàn tất cấu hình merchant và kiểm thử nghiệp vụ với dữ liệu cửa hàng thật.
