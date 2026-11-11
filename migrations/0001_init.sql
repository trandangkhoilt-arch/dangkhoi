PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE admin_bootstrap_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  material TEXT NOT NULL,
  care TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  old_price INTEGER CHECK (old_price IS NULL OR old_price >= price),
  image TEXT NOT NULL,
  colors TEXT NOT NULL,
  sizes TEXT NOT NULL,
  badge TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sold INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX products_catalog_idx ON products(active, category, created_at);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  stock INTEGER NOT NULL CHECK (stock >= 0),
  UNIQUE(product_id, color, size)
);

CREATE INDEX product_variants_product_idx ON product_variants(product_id);

CREATE TABLE coupons (
  code TEXT PRIMARY KEY COLLATE NOCASE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_discount INTEGER NOT NULL CHECK (max_discount >= 0),
  min_order INTEGER NOT NULL DEFAULT 0 CHECK (min_order >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  expires_at TEXT
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bank_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  discount INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
  shipping_fee INTEGER NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  coupon_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX orders_created_idx ON orders(created_at DESC);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX order_items_order_idx ON order_items(order_id);

CREATE TRIGGER restore_inventory_after_cancellation
AFTER UPDATE OF status ON orders
WHEN OLD.status != 'cancelled' AND NEW.status = 'cancelled'
BEGIN
  UPDATE product_variants
  SET stock = stock + (
    SELECT SUM(i.quantity) FROM order_items i WHERE i.order_id = NEW.id AND i.variant_id = product_variants.id
  )
  WHERE id IN (SELECT variant_id FROM order_items WHERE order_id = NEW.id AND variant_id IS NOT NULL);
  UPDATE products
  SET sold = MAX(0, sold - (
    SELECT SUM(i.quantity) FROM order_items i WHERE i.order_id = NEW.id AND i.product_id = products.id
  ))
  WHERE id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL);
END;

CREATE TABLE newsletters (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, user_id)
);

INSERT INTO products
  (id, slug, sku, name, category, description, material, care, price, old_price, image, colors, sizes, badge)
VALUES
  ('p-linen-shirt', 'ao-so-mi-linen-nang', 'MM-001', 'Áo sơ mi Linen Nắng', 'Áo', 'Phom suông nhẹ, vai rơi tự nhiên và hàng nút gỗ tối giản. Một chiếc áo dễ mặc từ buổi sáng đến những chuyến đi xa.', 'Linen pha cotton mềm, thoáng khí', 'Giặt nhẹ với nước mát. Phơi trong bóng râm, là ở nhiệt độ thấp.', 590000, 720000, 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1200&q=85', '["Trắng ngà","Xanh nhạt"]', '["S","M","L","XL"]', 'BÁN CHẠY'),
  ('p-midi-dress', 'dam-midi-hoa-nang', 'MM-002', 'Đầm Midi Hoa Nắng', 'Đầm', 'Đường cắt eo mềm và chân váy rủ vừa phải. Họa tiết hoa nhỏ được chọn để tủ đồ luôn có một ngày dịu dàng.', 'Cotton poplin', 'Giặt riêng lần đầu. Không ngâm lâu, tránh chất tẩy mạnh.', 890000, NULL, 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85', '["Vàng kem","Xanh lá"]', '["S","M","L"]', 'MẺ MỚI'),
  ('p-wide-trousers', 'quan-ong-rong-thu', 'MM-003', 'Quần Ống Rộng Thu', 'Quần', 'Cạp cao có ly nhẹ, ống suông dài tạo cảm giác thoải mái mà vẫn gọn gàng. Dễ phối cùng áo thun hoặc sơ mi.', 'Tencel twill', 'Giặt máy chế độ nhẹ trong túi giặt. Treo thẳng sau khi giặt.', 760000, NULL, 'https://images.unsplash.com/photo-1506629905607-d9c36b4c0f55?auto=format&fit=crop&w=1200&q=85', '["Đen","Nâu cát"]', '["S","M","L","XL"]', 'DỄ PHỐI'),
  ('p-knit-top', 'ao-det-kim-mem', 'MM-004', 'Áo Dệt Kim Mềm', 'Áo', 'Chất dệt mịn ôm vừa cơ thể, cổ tròn thanh lịch. Một lớp nền nhẹ nhàng cho những ngày cần mặc đẹp mà không cầu kỳ.', 'Cotton knit co giãn nhẹ', 'Giặt tay hoặc giặt máy ở chế độ đồ len.', 520000, 620000, 'https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=1200&q=85', '["Kem","Nâu hạt dẻ"]', '["S","M","L"]', 'GIẢM 16%'),
  ('p-cropped-jacket', 'ao-khoac-crop-gio', 'MM-005', 'Áo Khoác Crop Gió', 'Áo khoác', 'Phom crop cân đối với cổ đứng và túi hộp kín đáo. Lớp ngoài nhẹ cho những ngày chuyển mùa.', 'Cotton canvas phủ mềm', 'Lộn trái khi giặt, không sấy ở nhiệt độ cao.', 990000, NULL, 'https://images.unsplash.com/photo-1548624149-f7d8f4e97f9b?auto=format&fit=crop&w=1200&q=85', '["Xanh rêu","Be"]', '["S","M","L","XL"]', 'THIẾT KẾ MỚI'),
  ('p-cotton-tee', 'ao-thun-cotton-ban-mai', 'MM-006', 'Áo Thun Cotton Ban Mai', 'Áo', 'Áo thun phom relaxed, cổ bo vừa vặn và bề mặt cotton mịn. Món đồ cơ bản được làm chỉn chu để mặc lâu dài.', 'Cotton compact 100%', 'Giặt với màu tương tự, lộn trái và tránh là trực tiếp lên hình in.', 390000, NULL, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85', '["Trắng","Xanh navy"]', '["S","M","L","XL"]', NULL),
  ('p-satin-skirt', 'chan-vay-satin-dem', 'MM-007', 'Chân Váy Satin Đêm', 'Váy', 'Bề mặt satin bắt sáng vừa đủ, đường cắt chéo tạo độ rủ tự nhiên. Có thể mặc cùng áo dệt kim hoặc sơ mi linen.', 'Satin viscose', 'Giặt tay với nước mát. Treo bằng móc kẹp có đệm.', 680000, NULL, 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1200&q=85', '["Nâu cacao","Đen"]', '["S","M","L"]', 'ĐƯỢC YÊU THÍCH'),
  ('p-linen-shorts', 'quan-short-linen-he', 'MM-008', 'Quần Short Linen Hè', 'Quần', 'Cạp chun sau lưng, túi sâu tiện dụng và độ dài vừa phải cho ngày nắng. Mặc thoải mái nhưng vẫn giữ phom chỉn chu.', 'Linen pha rayon', 'Giặt nhẹ, phơi ngang để giữ phom.', 450000, NULL, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=1200&q=85', '["Trắng ngà","Nâu cát"]', '["S","M","L","XL"]', NULL);

WITH colors(color, code) AS (VALUES ('Trắng ngà', 'kem'), ('Xanh nhạt', 'xanh'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 5
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') s
WHERE p.slug = 'ao-so-mi-linen-nang';

WITH colors(color, code) AS (VALUES ('Vàng kem', 'vang'), ('Xanh lá', 'xanh'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 4
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L') s
WHERE p.slug = 'dam-midi-hoa-nang';

WITH colors(color, code) AS (VALUES ('Đen', 'den'), ('Nâu cát', 'nau'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 4
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') s
WHERE p.slug = 'quan-ong-rong-thu';

WITH colors(color, code) AS (VALUES ('Kem', 'kem'), ('Nâu hạt dẻ', 'nau'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 5
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L') s
WHERE p.slug = 'ao-det-kim-mem';

WITH colors(color, code) AS (VALUES ('Xanh rêu', 'reu'), ('Be', 'be'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 3
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') s
WHERE p.slug = 'ao-khoac-crop-gio';

WITH colors(color, code) AS (VALUES ('Trắng', 'trang'), ('Xanh navy', 'navy'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 8
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') s
WHERE p.slug = 'ao-thun-cotton-ban-mai';

WITH colors(color, code) AS (VALUES ('Nâu cacao', 'nau'), ('Đen', 'den'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 4
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L') s
WHERE p.slug = 'chan-vay-satin-dem';

WITH colors(color, code) AS (VALUES ('Trắng ngà', 'kem'), ('Nâu cát', 'nau'))
INSERT INTO product_variants (id, product_id, color, size, sku, stock)
SELECT lower(hex(randomblob(16))), p.id, c.color, s.size, p.sku || '-' || c.code || '-' || lower(s.size), 6
FROM products p CROSS JOIN colors c CROSS JOIN (SELECT 'S' AS size UNION ALL SELECT 'M' UNION ALL SELECT 'L' UNION ALL SELECT 'XL') s
WHERE p.slug = 'quan-short-linen-he';

INSERT INTO coupons (code, discount_percent, max_discount, min_order)
VALUES ('MAYMOI10', 10, 100000, 500000);
