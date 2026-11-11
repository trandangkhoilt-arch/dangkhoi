# Mây Mặc Studio

Website cửa hàng thời trang tiếng Việt, được tạo mới độc lập. Project này không nhập dữ liệu, tài khoản, giỏ hàng hay cấu hình từ website cũ.

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
npm run db:local
npm run dev
```

Mở `http://localhost:5173`. Vite chuyển `/api` đến Worker local ở cổng `8787`. Tạo quản trị viên đầu tiên tại `/admin/setup`; endpoint này chỉ hoạt động một lần và cần đúng `ADMIN_SETUP_KEY`.

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

   Có thể cấu hình thêm `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`, `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER`. Không đặt các khóa bí mật trong mã frontend hoặc commit vào Git.
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
- Đăng ký nhận tin, đánh giá sau khi nhận hàng và chatbot tư vấn nếu cấu hình nhà cung cấp AI.

## Cấu hình và giới hạn cần hoàn tất trước bán hàng thật

- Database D1 đã được tạo nhưng cần xác nhận cấu hình email và mã quản trị trước khi mở các luồng đăng ký và quản trị cho khách thật.
- COD và chuyển khoản là các phương thức thanh toán hiện được xử lý. VNPay/MoMo chưa bật; cần tài khoản merchant, khóa ký và cấu hình callback/webhook riêng trước khi nhận thanh toán trực tuyến.
- Chatbot chỉ hoạt động sau khi cấu hình khóa và model AI. Email xác minh/đặt lại mật khẩu dùng Resend; cần cấu hình `RESEND_API_KEY`, `MAIL_FROM` và `APP_ORIGIN`. Local dev trả link kiểm thử ngay trong phản hồi API.
- Chưa có tích hợp hãng vận chuyển, hóa đơn điện tử, chính sách trả hàng theo từng trường hợp hay đồng bộ tồn kho từ POS.
- Hình ảnh sản phẩm hiện tải từ Unsplash; thay bằng ảnh sản phẩm có bản quyền cửa hàng hoặc object storage trước khi mở bán.
- Catalog SQL là dữ liệu khởi tạo mới để demo; hãy rà soát sản phẩm, chất liệu, giá, tồn kho, thông tin pháp lý và nội dung chính sách trước khi nhận khách.

Website có thể build và chạy trên Cloudflare, nhưng chưa nên nhận thanh toán trực tuyến cho đến khi hoàn tất cấu hình merchant và kiểm thử nghiệp vụ với dữ liệu cửa hàng thật.
