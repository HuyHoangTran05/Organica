// Minimal Express API to serve products from MongoDB and static site files
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { MongoClient, ObjectId } = require('mongodb');

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

// MongoDB client
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://23020536_db_user:RCq52HQhlAtD30Sg@organica.fob1mqp.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'organica';
let mongoClient;
let db;

async function connectMongo(){
  if(db) return db;
  mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  return db;
}

// Helper: map DB rows to frontend product card shape
function mapProductDoc(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    price: Number(doc.price || 0),
    compareAt: doc.compareAt != null ? Number(doc.compareAt) : null,
    image: doc.image || './assets/images/product-1.png',
    slug: doc.slug,
  };
}

async function getProductBasic(productId){
  try{
    await connectMongo();
    const _id = new ObjectId(String(productId));
    const doc = await db.collection('products').findOne({ _id });
    if(!doc) return null;
    return {
      product_id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      price: Number(doc.price||0),
      image_url: doc.image || './assets/images/product-1.png'
    };
  }catch(e){ return null; }
}

function getSessionCart(req){
  if(!req.session.cart) req.session.cart = {}; // { productId: qty }
  return req.session.cart;
}

function getSessionWishlist(req){
  if(!req.session.wishlist) req.session.wishlist = {}; // { productId: true }
  return req.session.wishlist;
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

// GET /api/products -> list products with primary image
app.get('/api/products', async (req, res) => {
  try {
    await connectMongo();
    const { category, page = 1, limit = 24 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 48);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;

    const query = { status: 'active' };
    if(category){ query.categorySlug = String(category); }
    const rows = await db.collection('products')
      .find(query)
      .sort({ _id: -1 })
      .skip(offset)
      .limit(safeLimit)
      .toArray();
    res.json(rows.map(mapProductDoc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// GET /api/top-products -> curated set by slug order
app.get('/api/top-products', async (req, res) => {
  try {
    await connectMongo();
    const order = ['fresh-orangey','key-lime','fresh-watermelon','pomagranate-fruit','lens-results-broccoli','lens-results-spinach','leaf-lettuce','beef-steak','salmon-fillet'];
    const docs = await db.collection('products').find({ status: 'active' }).toArray();
    docs.sort((a,b)=>{
      const ia = order.indexOf(a.slug); const ib = order.indexOf(b.slug);
      const sa = ia === -1 ? 999 : ia; const sb = ib === -1 ? 999 : ib;
      if(sa !== sb) return sa - sb; return String(b._id).localeCompare(String(a._id));
    });
    res.json(docs.slice(0,9).map(mapProductDoc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load top products' });
  }
});

// GET /api/categories -> list categories
app.get('/api/categories', async (_req, res) => {
  try {
    await connectMongo();
    const rows = await db.collection('categories').find({}).sort({ sort_order: 1, name: 1 }).toArray();
    // normalize id to string for consistency
    res.json(rows.map(r=>({ id: String(r._id), name: r.name, slug: r.slug })));
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
    // Clamp to minimum 1; do not delete on <=0 (removal must use DELETE endpoint)
    cart[productId] = Math.max(1, parseInt(quantity,10)||1);
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

// WISHLIST ENDPOINTS
async function buildWishlistResponse(wishlist){
  const items = [];
  for(const pid of Object.keys(wishlist||{})){
    const product = await getProductBasic(pid);
    if(!product) continue;
    items.push({
      productId: product.product_id,
      name: product.name,
      slug: product.slug,
      image: product.image_url,
      price: Number(product.price||0)
    });
  }
  return { items };
}

app.get('/api/wishlist', async (req, res) => {
  try{
    const wl = getSessionWishlist(req);
    res.json(await buildWishlistResponse(wl));
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to load wishlist' }); }
});

app.post('/api/wishlist/add', async (req, res) => {
  try{
    const { productId } = req.body || {};
    if(!productId) return res.status(400).json({ error: 'productId required' });
    const prod = await getProductBasic(productId);
    if(!prod) return res.status(404).json({ error: 'Product not found' });
    const wl = getSessionWishlist(req);
    wl[productId] = true;
    res.json(await buildWishlistResponse(wl));
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to add to wishlist' }); }
});

app.delete('/api/wishlist/remove/:productId', async (req, res) => {
  try{
    const { productId } = req.params;
    const wl = getSessionWishlist(req);
    delete wl[productId];
    res.json(await buildWishlistResponse(wl));
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to remove from wishlist' }); }
});

app.delete('/api/wishlist/clear', async (req, res) => {
  try{
    req.session.wishlist = {};
    res.json(await buildWishlistResponse({}));
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to clear wishlist' }); }
});

// ORDER ENDPOINT
app.post('/api/orders', async (req, res) => {
  try {
    await connectMongo();
    const { firstName, lastName, email, phone, address, city, zip } = req.body || {};
    const cart = await buildCartResponse(getSessionCart(req));
    if(!cart.items.length) return res.status(400).json({ error: 'Cart is empty' });

    const orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase();
    const orderDoc = {
      orderNumber,
      status: 'pending',
      subtotal: cart.subtotal,
      shipping: cart.shipping,
      total: cart.total,
      currency: 'USD',
      customer: { name: `${firstName||''} ${lastName||''}`.trim(), email: email||null, phone: phone||null },
      address: { address: address||null, city: city||null, zip: zip||null },
      items: cart.items.map(it=>({ productId: it.productId, name: it.name, price: it.price, quantity: it.quantity, lineTotal: it.lineTotal })),
      createdAt: new Date()
    };
    const r = await db.collection('orders').insertOne(orderDoc);
    req.session.cart = {};
    res.json({ orderId: String(r.insertedId), orderNumber, total: cart.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// HEALTH CHECK
app.get('/api/health', async (_req, res) => {
  try {
    await connectMongo();
    const productsCount = await db.collection('products').countDocuments();
    const categoriesCount = await db.collection('categories').countDocuments();
    res.json({ ok: true, db: DB_NAME, products: productsCount, categories: categoriesCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message || 'health failed' });
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
