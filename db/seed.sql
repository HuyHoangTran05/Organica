-- Minimal seed data for Organica
SET NAMES utf8mb4;
USE organica;

-- Orders schema (if not exists)
CREATE TABLE IF NOT EXISTS orders (
	id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	order_number VARCHAR(32) UNIQUE,
	status ENUM('pending','paid','shipped','cancelled') NOT NULL DEFAULT 'pending',
	subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
	shipping DECIMAL(10,2) NOT NULL DEFAULT 0,
	total DECIMAL(10,2) NOT NULL DEFAULT 0,
	currency CHAR(3) NOT NULL DEFAULT 'USD',
	customer_name VARCHAR(150),
	email VARCHAR(150),
	phone VARCHAR(50),
	address VARCHAR(255),
	city VARCHAR(120),
	zip VARCHAR(20),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
	id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
	order_id BIGINT UNSIGNED NOT NULL,
	product_id BIGINT UNSIGNED NOT NULL,
	name VARCHAR(200) NOT NULL,
	price DECIMAL(10,2) NOT NULL,
	quantity INT NOT NULL,
	line_total DECIMAL(10,2) NOT NULL,
	FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Categories
INSERT INTO categories (name, slug, sort_order) VALUES
('Fresh Vegetables', 'fresh-vegetables', 1),
('Fish & Meat', 'fish-meat', 2),
('Healthy Fruit', 'healthy-fruit', 3),
('Dairy Products', 'dairy-products', 4)
ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order);

-- Products
-- Healthy Fruit
INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Fresh Orangey', 'fresh-orangey', c.id, 'active', 'Juicy organic oranges.' FROM categories c WHERE c.slug='healthy-fruit'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Key Lime', 'key-lime', c.id, 'active', 'Tart and fresh key limes.' FROM categories c WHERE c.slug='healthy-fruit'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Fresh Watermelon', 'fresh-watermelon', c.id, 'active', 'Refreshing sweet watermelon.' FROM categories c WHERE c.slug='healthy-fruit'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Pomagranate Fruit', 'pomagranate-fruit', c.id, 'active', 'Rich in antioxidants.' FROM categories c WHERE c.slug='healthy-fruit'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

-- Fresh Vegetables
INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Red onion', 'red-onion', c.id, 'active', 'Crisp red onions.' FROM categories c WHERE c.slug='fresh-vegetables'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Lens Results Broccoli', 'lens-results-broccoli', c.id, 'active', 'Fresh broccoli.' FROM categories c WHERE c.slug='fresh-vegetables'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Lens Results Spinach', 'lens-results-spinach', c.id, 'active', 'Green spinach leaves.' FROM categories c WHERE c.slug='fresh-vegetables'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Leaf Lettuce', 'leaf-lettuce', c.id, 'active', 'Crisp green lettuce.' FROM categories c WHERE c.slug='fresh-vegetables'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

-- Fish & Meat
INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Salmon Fillet', 'salmon-fillet', c.id, 'active', 'Fresh Atlantic salmon.' FROM categories c WHERE c.slug='fish-meat'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Beef Steak', 'beef-steak', c.id, 'active', 'Grass-fed beef steak.' FROM categories c WHERE c.slug='fish-meat'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

-- Dairy Products
INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Organic Milk', 'organic-milk', c.id, 'active', 'Fresh organic whole milk.' FROM categories c WHERE c.slug='dairy-products'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Greek Yogurt', 'greek-yogurt', c.id, 'active', 'Thick and creamy yogurt.' FROM categories c WHERE c.slug='dairy-products'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

-- Variants (default)
-- Variants default for all products (idempotent on SKU)
INSERT INTO product_variants (product_id, sku, price, compare_at_price, is_default)
SELECT p.id, CONCAT('SKU-', p.slug),
			 CASE p.slug
				 WHEN 'fresh-orangey' THEN 85.00
				 WHEN 'key-lime' THEN 85.00
				 WHEN 'fresh-watermelon' THEN 65.00
				 WHEN 'pomagranate-fruit' THEN 95.00
				 WHEN 'red-onion' THEN 21.00
				 WHEN 'lens-results-broccoli' THEN 18.50
				 WHEN 'lens-results-spinach' THEN 16.00
				 WHEN 'leaf-lettuce' THEN 14.00
				 WHEN 'salmon-fillet' THEN 120.00
				 WHEN 'beef-steak' THEN 150.00
				 WHEN 'organic-milk' THEN 30.00
				 WHEN 'greek-yogurt' THEN 28.00
				 ELSE 49.00 END AS price,
			 CASE p.slug
				 WHEN 'fresh-orangey' THEN 75.00
				 WHEN 'key-lime' THEN 75.00
				 WHEN 'fresh-watermelon' THEN 80.00
				 WHEN 'pomagranate-fruit' THEN 110.00
				 WHEN 'red-onion' THEN 25.00
				 WHEN 'lens-results-broccoli' THEN 22.00
				 WHEN 'lens-results-spinach' THEN 20.00
				 WHEN 'leaf-lettuce' THEN 18.00
				 WHEN 'salmon-fillet' THEN 135.00
				 WHEN 'beef-steak' THEN 170.00
				 WHEN 'organic-milk' THEN 35.00
				 WHEN 'greek-yogurt' THEN 33.00
				 ELSE 59.00 END AS compare_at_price,
			 1
FROM products p
LEFT JOIN product_variants v ON v.sku = CONCAT('SKU-', p.slug)
WHERE v.id IS NULL;

-- Images (use existing repo images)
-- Primary images (insert only if none exists for product)
INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-1.png', 'Fresh Orangey', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='fresh-orangey' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-2.png', 'Key Lime', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='key-lime' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-3.png', 'Fresh Watermelon', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='fresh-watermelon' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-5.png', 'Pomagranate Fruit', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='pomagranate-fruit' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-6.png', 'Red onion', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='red-onion' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-7.png', 'Lens Results Broccoli', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='lens-results-broccoli' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/product-8.png', 'Lens Results Spinach', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='lens-results-spinach' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/top-product-9.png', 'Leaf Lettuce', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='leaf-lettuce' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/top-product-11.png', 'Salmon Fillet', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='salmon-fillet' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/top-product-10.png', 'Beef Steak', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='beef-steak' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/top-product-13.png', 'Organic Milk', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='organic-milk' AND i.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/top-product-14.png', 'Greek Yogurt', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='greek-yogurt' AND i.id IS NULL;

-- Ensure existing primary images match requested filenames
UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-13.png', i.alt = 'Organic Milk'
WHERE p.slug = 'organic-milk' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-14.png', i.alt = 'Greek Yogurt'
WHERE p.slug = 'greek-yogurt' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-10.png', i.alt = 'Beef Steak'
WHERE p.slug = 'beef-steak' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-11.png', i.alt = 'Salmon Fillet'
WHERE p.slug = 'salmon-fillet' AND i.is_primary = 1;

-- Trendy items: use top-product-1..9 style images for clean background
UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-1.png', i.alt = 'Fresh Orangey'
WHERE p.slug = 'fresh-orangey' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-2.png', i.alt = 'Key Lime'
WHERE p.slug = 'key-lime' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-3.png', i.alt = 'Fresh Watermelon'
WHERE p.slug = 'fresh-watermelon' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-5.png', i.alt = 'Pomagranate Fruit'
WHERE p.slug = 'pomagranate-fruit' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-6.png', i.alt = 'Lens Results Broccoli'
WHERE p.slug = 'lens-results-broccoli' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-7.png', i.alt = 'Lens Results Spinach'
WHERE p.slug = 'lens-results-spinach' AND i.is_primary = 1;

UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-9.png', i.alt = 'Leaf Lettuce'
WHERE p.slug = 'leaf-lettuce' AND i.is_primary = 1;

-- Add Cheese in Dairy Products
INSERT INTO products (name, slug, category_id, status, short_description)
SELECT 'Cheese', 'cheese', c.id, 'active', 'Aged organic cheese.' FROM categories c WHERE c.slug='dairy-products'
ON DUPLICATE KEY UPDATE name=VALUES(name), category_id=VALUES(category_id);

INSERT INTO product_variants (product_id, sku, price, compare_at_price, is_default)
SELECT p.id, CONCAT('SKU-', p.slug), 42.00, 49.00, 1 FROM products p
LEFT JOIN product_variants v ON v.sku = CONCAT('SKU-', p.slug)
WHERE p.slug='cheese' AND v.id IS NULL;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
SELECT p.id, './assets/images/top-product-12.png', 'Cheese', 1, 0
FROM products p
LEFT JOIN product_images i ON i.product_id = p.id
WHERE p.slug='cheese' AND i.id IS NULL;

-- Ensure Cheese uses the requested image filename
UPDATE product_images i
JOIN products p ON p.id = i.product_id
SET i.url = './assets/images/top-product-12.png', i.alt = 'Cheese'
WHERE p.slug = 'cheese' AND i.is_primary = 1;
