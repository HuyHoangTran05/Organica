// Minimal Express API to serve products from MySQL and static site files
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const session = require('express-session');

const app = express();
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'organica-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 hours
}));

// Static files (serve the current folder)
const publicDir = __dirname;
app.use(express.static(publicDir));

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'organica',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper: map DB rows to frontend product card shape
function mapProductRow(row) {
  return {
    id: row.product_id,
    name: row.product_name,
    price: Number(row.price || 0),
    compareAt: row.compare_at_price != null ? Number(row.compare_at_price) : null,
    image: row.image_url || './assets/images/product-1.png',
    slug: row.slug,
  };
}

async function getProductBasic(productId){
  const [rows] = await pool.query(
    `SELECT p.id AS product_id, p.name, p.slug, v.price,
            (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1) AS image_url
     FROM products p
     JOIN product_variants v ON v.product_id=p.id AND v.is_default=1
     WHERE p.id = ?`, [productId]
  );
  return rows[0];
}

function getSessionCart(req){
  if(!req.session.cart) req.session.cart = {}; // { productId: qty }
  return req.session.cart;
}

async function buildCartResponse(cart){
  let items = [];
  let subtotal = 0;
  for(const [pid, qty] of Object.entries(cart)){
    const product = await getProductBasic(pid);
    if(!product) continue;
    const quantity = Math.max(1, parseInt(qty,10)||1);
    const price = Number(product.price||0);
    const line = price * quantity;
    subtotal += line;
    items.push({
      productId: product.product_id,
      name: product.name,
      slug: product.slug,
      image: product.image_url,
      price,
      quantity,
      lineTotal: Number(line.toFixed(2))
    });
  }
  const shipping = items.length ? 10.00 : 0.00;
  const total = subtotal + shipping;
  return {
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

// GET /api/products -> list default variants with primary image
app.get('/api/products', async (req, res) => {
  try {
    const { category, page = 1, limit = 24 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 48);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

    const params = [];
    let where = "WHERE p.status = 'active'";
    if (category) {
      where += ' AND c.slug = ?';
      params.push(String(category));
    }

    const [rows] = await pool.query(
      `SELECT p.id AS product_id, p.name AS product_name, p.slug,
              v.price, v.compare_at_price,
              (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1) AS image_url
       FROM products p
       JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, offset]
    );
    res.json(rows.map(mapProductRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// GET /api/top-products -> arbitrary latest 9 for the top-product section
app.get('/api/top-products', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.id AS product_id, p.name AS product_name, p.slug,
             v.price, v.compare_at_price,
             (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY is_primary DESC, sort_order ASC, id ASC LIMIT 1) AS image_url
      FROM products p
      JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
      WHERE p.status = 'active'
      ORDER BY CASE p.slug
        WHEN 'fresh-orangey' THEN 1
        WHEN 'key-lime' THEN 2
        WHEN 'fresh-watermelon' THEN 3
        WHEN 'pomagranate-fruit' THEN 5
        WHEN 'lens-results-broccoli' THEN 6
        WHEN 'lens-results-spinach' THEN 7
        WHEN 'leaf-lettuce' THEN 9
        WHEN 'beef-steak' THEN 10
        WHEN 'salmon-fillet' THEN 11
        ELSE 999 END,
        p.id DESC
      LIMIT 9;
    `);
    res.json(rows.map(mapProductRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load top products' });
  }
});

// GET /api/categories -> list categories
app.get('/api/categories', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, slug FROM categories ORDER BY sort_order ASC, name ASC;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// CART ENDPOINTS
app.get('/api/cart', async (req, res) => {
  try {
    const cart = getSessionCart(req);
    const result = await buildCartResponse(cart);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    if(!productId) return res.status(400).json({ error: 'productId required' });
    // ensure product exists
    const prod = await getProductBasic(productId);
    if(!prod) return res.status(404).json({ error: 'Product not found' });
    const cart = getSessionCart(req);
    const current = parseInt(cart[productId]||0,10);
    cart[productId] = Math.max(1, current + (parseInt(quantity,10)||1));
    const result = await buildCartResponse(cart);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.patch('/api/cart/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if(!productId) return res.status(400).json({ error: 'productId required' });
    const cart = getSessionCart(req);
    if(quantity <= 0){ delete cart[productId]; }
    else { cart[productId] = Math.max(1, parseInt(quantity,10)||1); }
    const result = await buildCartResponse(cart);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

app.delete('/api/cart/remove/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = getSessionCart(req);
    delete cart[productId];
    const result = await buildCartResponse(cart);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

app.delete('/api/cart/clear', async (req, res) => {
  try {
    req.session.cart = {};
    res.json(await buildCartResponse({}));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

// ORDER ENDPOINT
app.post('/api/orders', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { firstName, lastName, email, phone, address, city, zip } = req.body || {};
    const cart = await buildCartResponse(getSessionCart(req));
    if(!cart.items.length) return res.status(400).json({ error: 'Cart is empty' });

    await conn.beginTransaction();
    const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
    const [resOrder] = await conn.query(
      `INSERT INTO orders (order_number, status, subtotal, shipping, total, currency, customer_name, email, phone, address, city, zip)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNumber, 'pending', cart.subtotal, cart.shipping, cart.total, 'USD',
       `${firstName||''} ${lastName||''}`.trim(), email||null, phone||null, address||null, city||null, zip||null]
    );
    const orderId = resOrder.insertId;
    for(const it of cart.items){
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, line_total)
         VALUES (?,?,?,?,?,?)`,
        [orderId, it.productId, it.name, it.price, it.quantity, it.lineTotal]
      );
    }
    await conn.commit();
    // clear cart after order
    req.session.cart = {};
    res.json({ orderId, orderNumber, total: cart.total });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    conn.release();
  }
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Organica server running at http://localhost:${port}`);
});
