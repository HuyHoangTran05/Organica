// Minimal Express API to serve products from MongoDB and static site files
require('dotenv').config();
<<<<<<< HEAD
=======
const client = require('prom-client'); // Thêm cho Metrics
const winston = require('winston');   // Thêm cho Logging
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Thêm cho Chatbot

// Minimal Express API to serve products from MongoDB and static site files
require('dotenv').config();

// ===========================================
// MONITORING: KHỞI TẠO LOGGER VÀ METRICS
// ===========================================

// Cấu hình Logger (Winston)
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json() 
  ),
  transports: [
    new winston.transports.Console(), 
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Cấu hình Prometheus Metrics Registry
const register = new client.Registry();
register.setDefaultLabels({ app: 'organica-server' });
client.collectDefaultMetrics({ register });

// Định nghĩa Metric: request_duration_seconds
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  registers: [register],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5] 
});
register.registerMetric(httpRequestDurationMicroseconds);

// TIẾP THEO LÀ const express = require('express'); VÀ CÁC LỆNH KHÁC
>>>>>>> nam
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
// Keycloak integration
const initKeycloak = require('./keycloak');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
<<<<<<< HEAD
app.use(helmet());
app.use(cors());
app.use(express.json());
=======
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ 
      method: req.method, 
      route: req.route ? req.route.path : req.path,
      code: res.statusCode 
    });
  });
  next();
});
>>>>>>> nam
// Use explicit MemoryStore so Keycloak can hook into the same session store
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: process.env.SESSION_SECRET || 'organica-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

// Initialize Keycloak (if env variables present). If not configured, legacy JWT remains active.
let keycloak;
if (process.env.KEYCLOAK_BASE_URL && process.env.KEYCLOAK_REALM && process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET) {
  keycloak = initKeycloak(memoryStore);
  app.use(keycloak.middleware());
  console.log('Keycloak middleware enabled');
} else {
  const missing = [];
  if(!process.env.KEYCLOAK_BASE_URL) missing.push('KEYCLOAK_BASE_URL');
  if(!process.env.KEYCLOAK_REALM) missing.push('KEYCLOAK_REALM');
  if(!process.env.KEYCLOAK_CLIENT_ID) missing.push('KEYCLOAK_CLIENT_ID');
  if(!process.env.KEYCLOAK_CLIENT_SECRET) missing.push('KEYCLOAK_CLIENT_SECRET');
  console.log('[Auth] Keycloak NOT enabled. Missing:', missing.join(', ') || 'None (check formatting)');
}

// Static files (serve the current folder)
const publicDir = __dirname;
app.use(express.static(publicDir));

// MongoDB client
// Mongo config: allow a dedicated MONGO_DB_NAME to avoid confusion with MySQL DB_NAME
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'organica';
let mongoClient;
let db;

async function connectMongo(){
<<<<<<< HEAD
  if(db) return db;
  mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();
  db = mongoClient.db(DB_NAME);
  return db;
}
=======
  if(db) return db;
  mongoClient = new MongoClient(MONGO_URL);
  try {
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    return db;
  } catch (e) {
    logger.error('MongoDB connection failed!', e); 
    throw e;
  }
} 
>>>>>>> nam

// --- Auth configuration ---
const JWT_SECRET = process.env.JWT_SECRET || 'dev-access-secret-change';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret-change';
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_SEC = (() => {
  const env = process.env.REFRESH_TOKEN_TTL || '30d';
  // Convert to seconds; support simple 'Nd' days
  const m = /^([0-9]+)d$/.exec(env);
  if (m) return parseInt(m[1], 10) * 24 * 60 * 60;
  return 30 * 24 * 60 * 60; // default 30d
})();
const REFRESH_TOKEN_PEPPER = process.env.REFRESH_TOKEN_PEPPER || 'pepper';
const ADMIN_SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

function normalizeEmail(email){ return String(email||'').trim().toLowerCase(); }

async function hashPassword(pw){ return bcrypt.hash(String(pw), 10); }
async function comparePassword(pw, hash){ return bcrypt.compare(String(pw), String(hash||'')); }

function signAccessToken(user){
  const payload = { sub: String(user._id), roles: user.roles||['user'] };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function generateRefreshToken(user){
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ sub: String(user._id), jti }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SEC });
  const tokenHash = crypto.createHash('sha256').update(token + REFRESH_TOKEN_PEPPER).digest('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);
  return { token, tokenHash, jti, createdAt: now, expiresAt };
}

async function saveRefreshToken(userId, tokenRecord){
  await connectMongo();
  await db.collection('users').updateOne(
    { _id: new ObjectId(String(userId)) },
    { $push: { refreshTokens: { tokenHash: tokenRecord.tokenHash, jti: tokenRecord.jti, createdAt: tokenRecord.createdAt, expiresAt: tokenRecord.expiresAt } } }
  );
}

async function revokeRefreshToken(userId, tokenHash){
  await connectMongo();
  await db.collection('users').updateOne(
    { _id: new ObjectId(String(userId)), 'refreshTokens.tokenHash': tokenHash },
    { $set: { 'refreshTokens.$.revokedAt': new Date() } }
  );
}

async function findUserByEmail(email){
  await connectMongo();
  return db.collection('users').findOne({ email: normalizeEmail(email) });
}

function authOptional(){
  return (req, _res, next) => {
    const hdr = req.headers['authorization']||'';
    const m = /^Bearer (.+)$/.exec(hdr);
    if(!m) return next();
    try{
      const decoded = jwt.verify(m[1], JWT_SECRET);
      req.user = { id: decoded.sub, roles: decoded.roles||['user'] };
    }catch(_e){ /* ignore */ }
    next();
  };
}

function authRequired(){
  return (req, res, next) => {
    const hdr = req.headers['authorization']||'';
    const m = /^Bearer (.+)$/.exec(hdr);
    if(!m) return res.status(401).json({ error: 'Unauthorized' });
    try{
      const decoded = jwt.verify(m[1], JWT_SECRET);
      req.user = { id: decoded.sub, roles: decoded.roles||['user'] };
      return next();
    }catch(e){ return res.status(401).json({ error: 'Invalid token' }); }
  };
}

function requireRole(role){
  return (req, res, next) => {
    const roles = (req.user && req.user.roles) || [];
    if(roles.includes(role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

// If Keycloak is active, map Keycloak grant to req.user first
if (keycloak) {
  // Map Keycloak subject (UUID) to internal Mongo user _id, creating user if needed.
  app.use(async (req, _res, next) => {
    if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
      try {
        const token = req.kauth.grant.access_token;
        const sub = token.content.sub;
        const emailRaw = token.content.email || null;
        const email = emailRaw ? normalizeEmail(emailRaw) : null;
        const kcRoles = (token.content.realm_access && token.content.realm_access.roles) || [];
        await connectMongo();
        const usersCol = db.collection('users');
        let userDoc = await usersCol.findOne({ keycloakId: sub });
        // Fallback: locate by email if keycloakId not yet stored.
        if (!userDoc && email) {
          userDoc = await usersCol.findOne({ email });
          if (userDoc && !userDoc.keycloakId) {
            await usersCol.updateOne({ _id: userDoc._id }, { $set: { keycloakId: sub, updatedAt: new Date() } });
            userDoc.keycloakId = sub;
          }
        }
        // Create new user if none found.
        if (!userDoc) {
          const roles = kcRoles.length ? kcRoles : ['user'];
          const newUser = {
            email: email,
            name: token.content.name || '',
            keycloakId: sub,
            roles,
            createdAt: new Date(),
            updatedAt: new Date(),
            refreshTokens: [],
            oauthProviders: []
          };
            const r = await usersCol.insertOne(newUser);
            userDoc = { ...newUser, _id: r.insertedId };
        }
        req.user = { id: String(userDoc._id), roles: userDoc.roles || kcRoles || ['user'], keycloakId: sub };
      } catch (e) {
        console.error('Keycloak mapping error', e);
      }
    }
    next();
  });
}

// Apply optional legacy JWT auth so routes can detect logged-in user when Keycloak not present or tokens from old system
app.use(authOptional());

// Rate limit auth endpoints
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

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

// --- User-based cart/wishlist helpers ---
async function getUserCartDoc(userId){
  await connectMongo();
  const uid = new ObjectId(String(userId));
  let doc = await db.collection('userCarts').findOne({ userId: uid });
  if(!doc){
    doc = { userId: uid, items: [], updatedAt: new Date() };
    await db.collection('userCarts').insertOne(doc);
  }
  return doc;
}

async function saveUserCart(userId, items){
  await connectMongo();
  const uid = new ObjectId(String(userId));
  await db.collection('userCarts').updateOne(
    { userId: uid },
    { $set: { items, updatedAt: new Date() } },
    { upsert: true }
  );
}

async function getUserWishlistDoc(userId){
  await connectMongo();
  const uid = new ObjectId(String(userId));
  let doc = await db.collection('userWishlists').findOne({ userId: uid });
  if(!doc){
    doc = { userId: uid, items: [], updatedAt: new Date() };
    await db.collection('userWishlists').insertOne(doc);
  }
  return doc;
}

async function saveUserWishlist(userId, items){
  await connectMongo();
  const uid = new ObjectId(String(userId));
  await db.collection('userWishlists').updateOne(
    { userId: uid },
    { $set: { items, updatedAt: new Date() } },
    { upsert: true }
  );
}

// Merge session cart into user cart on login
async function mergeSessionCartIntoUser(req, userId){
  const sessionCart = getSessionCart(req);
  if(!Object.keys(sessionCart).length) return;
  const doc = await getUserCartDoc(userId);
  const map = new Map();
  for(const it of doc.items){ map.set(String(it.productId), (it.quantity||1)); }
  for(const [pid, qty] of Object.entries(sessionCart)){
    const q = Math.max(1, parseInt(qty,10)||1);
    map.set(String(pid), (map.get(String(pid))||0) + q);
  }
  const items = Array.from(map.entries()).map(([pid,q])=>({ productId: new ObjectId(String(pid)), quantity: q }));
  await saveUserCart(userId, items);
  req.session.cart = {};
}

async function mergeSessionWishlistIntoUser(req, userId){
  const wl = getSessionWishlist(req);
  if(!Object.keys(wl).length) return;
  const doc = await getUserWishlistDoc(userId);
  const set = new Set(doc.items.map(id=>String(id)));
  for(const pid of Object.keys(wl)) set.add(String(pid));
  const items = Array.from(set).map(pid=> new ObjectId(String(pid)));
  await saveUserWishlist(userId, items);
  req.session.wishlist = {};
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
    if(req.user){
      const doc = await getUserCartDoc(req.user.id);
      const asMap = {};
      for(const it of doc.items){ asMap[String(it.productId)] = Math.max(1, parseInt(it.quantity,10)||1); }
      const result = await buildCartResponse(asMap);
      return res.json(result);
    }
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
    if(req.user){
      const doc = await getUserCartDoc(req.user.id);
      const map = new Map(doc.items.map(it=>[String(it.productId), it.quantity]));
      const current = parseInt(map.get(String(productId))||0,10);
      map.set(String(productId), Math.max(1, current + (parseInt(quantity,10)||1)));
      const items = Array.from(map.entries()).map(([pid,q])=>({ productId: new ObjectId(String(pid)), quantity: q }));
      await saveUserCart(req.user.id, items);
      const asMap = {}; for(const it of items){ asMap[String(it.productId)] = it.quantity; }
      return res.json(await buildCartResponse(asMap));
    } else {
      const cart = getSessionCart(req);
      const current = parseInt(cart[productId]||0,10);
      cart[productId] = Math.max(1, current + (parseInt(quantity,10)||1));
      const result = await buildCartResponse(cart);
      return res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.patch('/api/cart/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if(!productId) return res.status(400).json({ error: 'productId required' });
    if(req.user){
      const doc = await getUserCartDoc(req.user.id);
      const map = new Map(doc.items.map(it=>[String(it.productId), it.quantity]));
      map.set(String(productId), Math.max(1, parseInt(quantity,10)||1));
      const items = Array.from(map.entries()).map(([pid,q])=>({ productId: new ObjectId(String(pid)), quantity: q }));
      await saveUserCart(req.user.id, items);
      const asMap = {}; for(const it of items){ asMap[String(it.productId)] = it.quantity; }
      return res.json(await buildCartResponse(asMap));
    } else {
      const cart = getSessionCart(req);
      cart[productId] = Math.max(1, parseInt(quantity,10)||1);
      const result = await buildCartResponse(cart);
      return res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

app.delete('/api/cart/remove/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if(req.user){
      const doc = await getUserCartDoc(req.user.id);
      const items = doc.items.filter(it=> String(it.productId) !== String(productId));
      await saveUserCart(req.user.id, items);
      const asMap = {}; for(const it of items){ asMap[String(it.productId)] = it.quantity; }
      return res.json(await buildCartResponse(asMap));
    } else {
      const cart = getSessionCart(req);
      delete cart[productId];
      const result = await buildCartResponse(cart);
      return res.json(result);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

app.delete('/api/cart/clear', async (req, res) => {
  try {
    if(req.user){
      await saveUserCart(req.user.id, []);
      return res.json(await buildCartResponse({}));
    } else {
      req.session.cart = {};
      return res.json(await buildCartResponse({}));
    }
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
    if(req.user){
      const doc = await getUserWishlistDoc(req.user.id);
      const map = {}; for(const id of doc.items){ map[String(id)] = true; }
      return res.json(await buildWishlistResponse(map));
    }
    const wl = getSessionWishlist(req);
    return res.json(await buildWishlistResponse(wl));
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to load wishlist' }); }
});

app.post('/api/wishlist/add', async (req, res) => {
  try{
    const { productId } = req.body || {};
    if(!productId) return res.status(400).json({ error: 'productId required' });
    const prod = await getProductBasic(productId);
    if(!prod) return res.status(404).json({ error: 'Product not found' });
    if(req.user){
      const doc = await getUserWishlistDoc(req.user.id);
      const set = new Set(doc.items.map(id=>String(id)));
      set.add(String(productId));
      const items = Array.from(set).map(pid=> new ObjectId(String(pid)));
      await saveUserWishlist(req.user.id, items);
      const map = {}; for(const id of items){ map[String(id)] = true; }
      return res.json(await buildWishlistResponse(map));
    } else {
      const wl = getSessionWishlist(req);
      wl[productId] = true;
      return res.json(await buildWishlistResponse(wl));
    }
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to add to wishlist' }); }
});

app.delete('/api/wishlist/remove/:productId', async (req, res) => {
  try{
    const { productId } = req.params;
    if(req.user){
      const doc = await getUserWishlistDoc(req.user.id);
      const items = doc.items.filter(id=> String(id) !== String(productId));
      await saveUserWishlist(req.user.id, items);
      const map = {}; for(const id of items){ map[String(id)] = true; }
      return res.json(await buildWishlistResponse(map));
    } else {
      const wl = getSessionWishlist(req);
      delete wl[productId];
      return res.json(await buildWishlistResponse(wl));
    }
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to remove from wishlist' }); }
});

app.delete('/api/wishlist/clear', async (req, res) => {
  try{
    if(req.user){
      await saveUserWishlist(req.user.id, []);
      return res.json(await buildWishlistResponse({}));
    } else {
      req.session.wishlist = {};
      return res.json(await buildWishlistResponse({}));
    }
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to clear wishlist' }); }
});

// ORDER ENDPOINT
app.post('/api/orders', async (req, res) => {
  try {
    await connectMongo();
    const { firstName, lastName, email, phone, address, city, zip } = req.body || {};
    let cart;
    if(req.user){
      const doc = await getUserCartDoc(req.user.id);
      const asMap = {}; for(const it of doc.items){ asMap[String(it.productId)] = Math.max(1, parseInt(it.quantity,10)||1); }
      cart = await buildCartResponse(asMap);
    } else {
      cart = await buildCartResponse(getSessionCart(req));
    }
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
    if(req.user){ orderDoc.userId = new ObjectId(String(req.user.id)); }
    const r = await db.collection('orders').insertOne(orderDoc);
    if(req.user){ await saveUserCart(req.user.id, []); } else { req.session.cart = {}; }
    res.json({ orderId: String(r.insertedId), orderNumber, total: cart.total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// --- Auth routes ---
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try{
    const { name, email, password, role, adminCode } = req.body||{};
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    // Basic password strength check (length >=8, letter, number)
    const pw = String(password||'');
    if(pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
      return res.status(400).json({ error: 'Password too weak (min 8 chars, include letter & number)', code: 'WEAK_PASSWORD' });
    }
    await connectMongo();
    const users = db.collection('users');
    const em = normalizeEmail(email);
    const exists = await users.findOne({ email: em });
    if(exists) return res.status(409).json({ error: 'Email already in use', code: 'EMAIL_EXISTS' });
    const passwordHash = await hashPassword(password);
    // role selection with admin code protection
    let roles = ['user'];
    const requested = String(role||'user').toLowerCase();
    if(requested === 'admin'){
      const provided = String(adminCode||'');
      if(!ADMIN_SIGNUP_CODE){
        console.warn('[Signup] ADMIN_SIGNUP_CODE not set in environment, cannot create admin');
        return res.status(500).json({ error: 'Admin signup disabled (missing ADMIN_SIGNUP_CODE server config)', code: 'ADMIN_DISABLED' });
      }
      if(provided !== ADMIN_SIGNUP_CODE){
        console.warn('[Signup] Invalid admin code attempt email=' + em);
        return res.status(403).json({ error: 'Invalid admin code. Check ADMIN_SIGNUP_CODE.', code: 'ADMIN_CODE_INVALID' });
      }
      roles = ['admin'];
    }
    const userDoc = { email: em, name: name||'', passwordHash, roles, createdAt: new Date(), updatedAt: new Date(), refreshTokens: [] };
    const r = await users.insertOne(userDoc);
    const user = { ...userDoc, _id: r.insertedId };
    const accessToken = signAccessToken(user);
    const rt = generateRefreshToken(user);
    await saveRefreshToken(user._id, rt);
    // Merge session data
    await mergeSessionCartIntoUser(req, user._id);
    await mergeSessionWishlistIntoUser(req, user._id);
    res.json({ user: { id: String(user._id), email: user.email, name: user.name, roles: user.roles }, accessToken, refreshToken: rt.token });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Signup failed', code: 'SIGNUP_FAIL' }); }
});

// Promote existing user to admin via admin code (for cases where email already exists but needs elevation)
app.post('/api/auth/promote-admin', authLimiter, async (req, res) => {
  try {
    const { email, adminCode } = req.body || {};
    if(!email || !adminCode) return res.status(400).json({ error: 'email and adminCode required', code: 'MISSING_FIELDS' });
    if(!ADMIN_SIGNUP_CODE) return res.status(500).json({ error: 'Admin promotion disabled (missing ADMIN_SIGNUP_CODE)', code: 'ADMIN_DISABLED' });
    if(String(adminCode) !== ADMIN_SIGNUP_CODE) return res.status(403).json({ error: 'Invalid admin code', code: 'ADMIN_CODE_INVALID' });
    await connectMongo();
    const users = db.collection('users');
    const em = normalizeEmail(email);
    const user = await users.findOne({ email: em });
    if(!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    if((user.roles||[]).includes('admin')) return res.json({ ok: true, message: 'Already admin', code: 'ALREADY_ADMIN' });
    await users.updateOne({ _id: user._id }, { $set: { roles: ['admin'], updatedAt: new Date() } });
    console.log('[PromoteAdmin] User promoted email=' + em);
    return res.json({ ok: true, message: 'Promoted to admin', code: 'PROMOTED' });
  } catch (e) {
    console.error('Promote admin failed', e);
    return res.status(500).json({ error: 'Promote admin failed', code: 'PROMOTE_FAIL' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try{
    const { email, password } = req.body||{};
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    const user = await findUserByEmail(email);
    if(!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await comparePassword(password, user.passwordHash);
    if(!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const accessToken = signAccessToken(user);
    const rt = generateRefreshToken(user);
    await saveRefreshToken(user._id, rt);
    await db.collection('users').updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });
    await mergeSessionCartIntoUser(req, user._id);
    await mergeSessionWishlistIntoUser(req, user._id);
    res.json({ user: { id: String(user._id), email: user.email, name: user.name, roles: user.roles }, accessToken, refreshToken: rt.token });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Login failed' }); }
});

app.post('/api/auth/refresh', authLimiter, async (req, res) => {
  try{
    const { refreshToken } = req.body||{};
    if(!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    let decoded;
    try{ decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET); }catch(_e){ return res.status(401).json({ error: 'Invalid refresh token' }); }
    const userId = decoded.sub;
    const tokenHash = crypto.createHash('sha256').update(refreshToken + REFRESH_TOKEN_PEPPER).digest('hex');
    await connectMongo();
    const users = db.collection('users');
    const user = await users.findOne({ _id: new ObjectId(String(userId)), 'refreshTokens.tokenHash': tokenHash, 'refreshTokens.revokedAt': { $exists: false } });
    if(!user) return res.status(401).json({ error: 'Refresh token not recognized or revoked' });
    // rotate
    await revokeRefreshToken(userId, tokenHash);
    const newRt = generateRefreshToken({ _id: user._id, roles: user.roles });
    await saveRefreshToken(userId, newRt);
    const accessToken = signAccessToken({ _id: user._id, roles: user.roles });
    res.json({ accessToken, refreshToken: newRt.token });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Refresh failed' }); }
});

app.post('/api/auth/logout', authLimiter, async (req, res) => {
  try{
    const { refreshToken } = req.body||{};
    if(refreshToken){
      try{
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const tokenHash = crypto.createHash('sha256').update(refreshToken + REFRESH_TOKEN_PEPPER).digest('hex');
        await revokeRefreshToken(decoded.sub, tokenHash);
      }catch(_e){}
    }
    res.json({ ok: true });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Logout failed' }); }
});

// Support Keycloak session (req.user set by adapter) OR legacy JWT bearer even when Keycloak is enabled
const meMiddleware = keycloak
  ? (req, res, next) => {
      if (req.user && req.user.id) return next();
      const hdr = req.headers['authorization'] || '';
      const m = /^Bearer (.+)$/.exec(hdr);
      if (m) {
        try {
          const decoded = jwt.verify(m[1], JWT_SECRET);
          req.user = { id: decoded.sub, roles: decoded.roles || ['user'] };
          return next();
        } catch (_e) { /* fallthrough */ }
      }
      return res.status(401).json({ error: 'Unauthorized' });
    }
  : authRequired();

app.get('/api/me', meMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(req.user.id)) }, { projection: { email:1, name:1, roles:1 } });
    if(!user) return res.status(404).json({ error: 'Not found' });
    res.json({ id: String(user._id), email: user.email, name: user.name, roles: user.roles||['user'] });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to load profile' }); }
});

// Example admin-only endpoint (hybrid):
// When Keycloak enabled: allow if realm role 'admin' OR legacy JWT bearer token has 'admin'.
// When Keycloak disabled: use legacy JWT checks.
const adminHealthMiddleware = keycloak ? async (req, res, next) => {
  try {
    // Keycloak path
    if (req.kauth && req.kauth.grant && req.kauth.grant.access_token) {
      const kcRoles = (req.kauth.grant.access_token.content.realm_access && req.kauth.grant.access_token.content.realm_access.roles) || [];
      if (kcRoles.includes('admin')) return next();
    }
    // Legacy JWT path (Authorization header)
    const hdr = req.headers['authorization'] || '';
    const m = /^Bearer (.+)$/.exec(hdr);
    if (m) {
      try {
        const decoded = jwt.verify(m[1], JWT_SECRET);
        const roles = decoded.roles || [];
        if (roles.includes('admin')) {
          req.user = { id: decoded.sub, roles };
          return next();
        }
      } catch (_e) { /* ignore */ }
    }
    return res.status(403).json({ error: 'Forbidden (admin role required)' });
  } catch (e) {
    console.error('Admin middleware error', e);
    return res.status(500).json({ error: 'Admin middleware failure' });
  }
} : [authRequired(), requireRole('admin')];

app.get('/api/admin/health', adminHealthMiddleware, async (_req, res) => {
  try{
    await connectMongo();
    const usersCount = await db.collection('users').countDocuments();
    res.json({ ok: true, users: usersCount });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Admin health failed' }); }
});

// --- Admin: Products CRUD ---
// List products (admin)
app.get('/api/admin/products', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const { q, page = 1, limit = 20, status } = req.query || {};
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;
    const filter = {};
    if(q){ filter.$or = [ { name: { $regex: String(q), $options: 'i' } }, { slug: { $regex: String(q), $options: 'i' } } ]; }
    if(status){ filter.status = String(status); }
    const cursor = db.collection('products').find(filter).sort({ _id: -1 }).skip(offset).limit(safeLimit);
    const rows = await cursor.toArray();
    const total = await db.collection('products').countDocuments(filter);
    res.json({ items: rows.map(r=>({ ...r, _id: String(r._id) })), page: Number(page), limit: safeLimit, total });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to list products' }); }
});

// Create product
app.post('/api/admin/products', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const { name, slug, price = 0, compareAt = null, image = '', categorySlug = null, status = 'active' } = req.body || {};
    if(!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
    const doc = { name: String(name), slug: String(slug), price: Number(price)||0, image: String(image||''), status: String(status||'active'), updatedAt: new Date(), createdAt: new Date() };
    if(compareAt != null) doc.compareAt = Number(compareAt);
    if(categorySlug) doc.categorySlug = String(categorySlug);
    const r = await db.collection('products').insertOne(doc);
    res.json({ id: String(r.insertedId) });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to create product' }); }
});

// Update product
app.patch('/api/admin/products/:id', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const { id } = req.params;
    const _id = new ObjectId(String(id));
    const allowed = ['name','slug','price','compareAt','image','categorySlug','status'];
    const set = { updatedAt: new Date() };
    for(const k of allowed){ if(req.body && k in req.body){ set[k] = req.body[k]; } }
    if('price' in set) set.price = Number(set.price)||0;
    if('compareAt' in set && set.compareAt != null) set.compareAt = Number(set.compareAt);
    const r = await db.collection('products').updateOne({ _id }, { $set: set });
    res.json({ ok: r.matchedCount === 1 });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to update product' }); }
});

// Delete product
app.delete('/api/admin/products/:id', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const _id = new ObjectId(String(req.params.id));
    const r = await db.collection('products').deleteOne({ _id });
    res.json({ ok: r.deletedCount === 1 });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to delete product' }); }
});

// --- Admin: Categories CRUD ---
app.get('/api/admin/categories', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const { q } = req.query || {};
    const filter = {};
    if(q){ filter.$or = [ { name: { $regex: String(q), $options: 'i' } }, { slug: { $regex: String(q), $options: 'i' } } ]; }
    const rows = await db.collection('categories').find(filter).sort({ sort_order: 1, name: 1 }).toArray();
    res.json(rows.map(r=>({ ...r, _id: String(r._id) })));
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to list categories' }); }
});

app.post('/api/admin/categories', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const { name, slug, sort_order = 0 } = req.body || {};
    if(!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
    const doc = { name: String(name), slug: String(slug), sort_order: Number(sort_order)||0, createdAt: new Date(), updatedAt: new Date() };
    const r = await db.collection('categories').insertOne(doc);
    res.json({ id: String(r.insertedId) });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to create category' }); }
});

app.patch('/api/admin/categories/:id', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const _id = new ObjectId(String(req.params.id));
    const set = { updatedAt: new Date() };
    if('name' in req.body) set.name = String(req.body.name);
    if('slug' in req.body) set.slug = String(req.body.slug);
    if('sort_order' in req.body) set.sort_order = Number(req.body.sort_order)||0;
    const r = await db.collection('categories').updateOne({ _id }, { $set: set });
    res.json({ ok: r.matchedCount === 1 });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to update category' }); }
});

app.delete('/api/admin/categories/:id', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const _id = new ObjectId(String(req.params.id));
    const r = await db.collection('categories').deleteOne({ _id });
    res.json({ ok: r.deletedCount === 1 });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to delete category' }); }
});

// --- Admin: Users management ---
app.get('/api/admin/users', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const { q, page = 1, limit = 20 } = req.query || {};
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safeLimit;
    const filter = {};
    if(q){ filter.$or = [ { email: { $regex: String(q), $options: 'i' } }, { name: { $regex: String(q), $options: 'i' } } ]; }
    const cursor = db.collection('users').find(filter, { projection: { passwordHash: 0, refreshTokens: 0 } }).sort({ _id: -1 }).skip(offset).limit(safeLimit);
    const rows = await cursor.toArray();
    const total = await db.collection('users').countDocuments(filter);
    res.json({ items: rows.map(r=>({ ...r, _id: String(r._id) })), page: Number(page), limit: safeLimit, total });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to list users' }); }
});

app.patch('/api/admin/users/:id', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const _id = new ObjectId(String(req.params.id));
    const set = { updatedAt: new Date() };
    if('name' in req.body) set.name = String(req.body.name||'');
    if('roles' in req.body && Array.isArray(req.body.roles)) set.roles = req.body.roles.map(String);
    const r = await db.collection('users').updateOne({ _id }, { $set: set });
    res.json({ ok: r.matchedCount === 1 });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to update user' }); }
});

app.delete('/api/admin/users/:id', adminHealthMiddleware, async (req, res) => {
  try{
    await connectMongo();
    const _id = new ObjectId(String(req.params.id));
    const r = await db.collection('users').deleteOne({ _id });
    res.json({ ok: r.deletedCount === 1 });
  }catch(err){ console.error(err); res.status(500).json({ error: 'Failed to delete user' }); }
});

// Auth context debug helper
app.get('/api/debug/auth-context', async (req, res) => {
  const out = {
    keycloakEnabled: !!keycloak,
    hasKeycloakGrant: !!(req.kauth && req.kauth.grant),
    keycloakRoles: (req.kauth && req.kauth.grant && req.kauth.grant.access_token && req.kauth.grant.access_token.content.realm_access && req.kauth.grant.access_token.content.realm_access.roles) || [],
    mappedUser: req.user || null
  };
  res.json(out);
});

// --- Google OAuth (OIDC-lite) ---
// Legacy Google OAuth (kept for transition). Recommended to use Keycloak identity providers instead.
// LEGACY: Khuyến nghị chuyển social login về Keycloak Identity Provider.
app.get('/api/auth/google', (req, res) => {
  if(!GOOGLE_CLIENT_ID){
    return res.status(400).send('Google OAuth is not configured. Set GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI.');
  }
  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');
  // Optional post-login redirect (path on this site). Default handled in callback.
  let redirect = (req.query && req.query.redirect) ? String(req.query.redirect) : '';
  if(!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) redirect = '';
  req.session.oauthState = { state, nonce, redirect, createdAt: Date.now() };
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
});

app.get('/api/auth/google/callback', async (req, res) => {
  try{
    const { code, state } = req.query || {};
    const sess = req.session.oauthState || {};
    if(!code || !state || !sess.state || state !== sess.state){
      return res.status(400).send('Invalid OAuth state');
    }
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokenJson = await tokenRes.json();
    if(!tokenRes.ok){
      console.error('Google token error', tokenJson);
      return res.status(400).send('Failed to exchange Google code');
    }
    const accessToken = tokenJson.access_token;
    // Fetch userinfo
    const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const info = await infoRes.json();
    if(!infoRes.ok){
      console.error('Google userinfo error', info);
      return res.status(400).send('Failed to fetch Google profile');
    }
    const email = normalizeEmail(info.email);
    const sub = info.sub;
    await connectMongo();
    const users = db.collection('users');
    let user = await users.findOne({ email });
    if(!user){
      const userDoc = { email, name: info.name || '', roles: ['user'], createdAt: new Date(), updatedAt: new Date(), refreshTokens: [], oauthProviders: [{ provider:'google', providerUserId: sub, email, linkedAt: new Date() }] };
      const r = await users.insertOne(userDoc);
      user = { ...userDoc, _id: r.insertedId };
    } else {
      const has = (user.oauthProviders||[]).some(p=> p.provider==='google' && p.providerUserId===sub);
      if(!has){
        await users.updateOne({ _id: user._id }, { $push: { oauthProviders: { provider:'google', providerUserId: sub, email, linkedAt: new Date() } } });
      }
    }
    // Issue tokens
    const at = signAccessToken(user);
    const rt = generateRefreshToken(user);
    await saveRefreshToken(user._id, rt);
    // Merge session data
    await mergeSessionCartIntoUser(req, user._id);
    await mergeSessionWishlistIntoUser(req, user._id);

    // Return CSP-friendly HTML: deliver payload via meta and load external JS.
    res.set('Content-Type', 'text/html');
    const safe = (sess.redirect && sess.redirect.startsWith('/') && !sess.redirect.startsWith('//')) ? sess.redirect : '/index.html';
    const payload = Buffer.from(JSON.stringify({ accessToken: at, refreshToken: rt.token, redirectTo: safe }), 'utf8').toString('base64');
    res.send(`<!doctype html><html><head>
      <meta charset="utf-8" />
      <meta name="oauth" content="${payload}" />
      <title>Signing you in…</title>
    </head><body>
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#222;padding:24px;">Processing sign-in, please wait…</div>
      <script src="/assets/js/oauth-finish.js"></script>
    </body></html>`);
  }catch(err){ console.error(err); res.status(500).send('Google auth failed'); }
});
<<<<<<< HEAD

=======
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Lấy danh sách sản phẩm từ DB để Gemini biết mình đang bán gì
    await connectMongo();
    const products = await db.collection('products').find({ status: 'active' }).toArray();
    
    // Tạo ngữ cảnh (Context) sản phẩm cho AI
    const productListText = products.map(p => 
      `- Tên: ${p.name}, Giá: $${p.price}, Danh mục: ${p.categorySlug}`
    ).join('\n');

    // Cấu hình AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

    const prompt = `
      Bạn là trợ lý ảo AI của cửa hàng thực phẩm sạch Organica.
      Dưới đây là danh sách sản phẩm cửa hàng đang bán:
      ${productListText}

      Quy tắc trả lời:
      1. Chỉ tư vấn dựa trên danh sách sản phẩm trên.
      2. Nếu khách hỏi về bệnh (ví dụ: đau dạ dày, tiểu đường), hãy tư vấn các loại rau củ quả phù hợp có trong danh sách và giải thích công dụng dinh dưỡng.
      3. Giọng điệu thân thiện, ngắn gọn, có ích.
      4. Nếu khách hỏi sản phẩm không có trong danh sách, hãy khéo léo bảo cửa hàng chưa bán.

      Câu hỏi của khách: "${message}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (err) {
    logger.error('Chat AI Error:', err); // Sử dụng logger.error
    res.status(500).json({ error: 'AI đang bận, thử lại sau nhé!' });
  }
});

// Endpoint Metrics (Thêm dòng này ngay sau Chatbot)
app.get('/api/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
>>>>>>> nam
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

// Keycloak logout helper (session-based). Destroys Express session then redirects to Keycloak end-session endpoint.
app.get('/api/auth/logout-keycloak', (req, res) => {
  if (!keycloak) {
    return res.status(400).json({ error: 'Keycloak not enabled' });
  }
  const base = process.env.KEYCLOAK_BASE_URL || '';
  const realm = process.env.KEYCLOAK_REALM || '';
  const clientId = process.env.KEYCLOAK_CLIENT_ID || '';
  // Allow optional query override; default to site root.
  const postRedirect = req.query.redirect || (req.protocol + '://' + req.get('host') + '/');
  // Keycloak end-session now expects client_id and post_logout_redirect_uri.
  // Ensure postRedirect is configured in Keycloak client (Valid Redirect URIs & post logout redirect settings).
  const endSessionUrl = base.replace(/\/$/, '') + '/realms/' + realm + '/protocol/openid-connect/logout' +
    '?client_id=' + encodeURIComponent(clientId) +
    '&post_logout_redirect_uri=' + encodeURIComponent(postRedirect);
  if (req.session) {
    req.session.destroy(() => res.redirect(endSessionUrl));
  } else {
    res.redirect(endSessionUrl);
  }
});

// Keycloak adapter login route: triggers Keycloak login via protect(), then redirects back to home.
// Unified login route: if Keycloak active triggers adapter flow, otherwise explains missing config
app.get('/api/auth/keycloak-login', (req, res, next) => {
  if (!keycloak) return res.status(500).send('Keycloak not enabled (set KEYCLOAK_* env vars then restart server).');
  // Dynamically invoke protect middleware; on success redirect home
  return keycloak.protect()(req, res, () => res.redirect('/'));
});

// Debug endpoint to verify Keycloak env & initialization
app.get('/api/auth/keycloak-debug', (req, res) => {
  res.json({
    enabled: !!keycloak,
    realm: process.env.KEYCLOAK_REALM || null,
    clientId: process.env.KEYCLOAK_CLIENT_ID || null,
    hasGrant: !!(req.kauth && req.kauth.grant),
    userMapped: !!req.user,
  });
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const port = process.env.PORT || 3000;

async function setupIndexesAndAdmin(){
  await connectMongo();
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  try { 
    await db.collection('users').createIndex({ keycloakId: 1 }, { unique: true, sparse: true }); 
  } catch(e){ 
    // THAY THẾ console.error BẰNG logger.error
    logger.error('Index keycloakId error', e.message); 
  }
  await db.collection('userCarts').createIndex({ userId: 1 }, { unique: true });
  await db.collection('userWishlists').createIndex({ userId: 1 }, { unique: true });
  const adminEmail = process.env.ADMIN_EMAIL && normalizeEmail(process.env.ADMIN_EMAIL);
  const adminPassword = process.env.ADMIN_PASSWORD;
  if(adminEmail && adminPassword){
    const existing = await db.collection('users').findOne({ email: adminEmail });
    if(!existing){
      const passwordHash = await hashPassword(adminPassword);
      await db.collection('users').insertOne({ email: adminEmail, name: 'Admin', passwordHash, roles: ['admin'], createdAt: new Date(), updatedAt: new Date(), refreshTokens: [] });
      // THAY THẾ console.log BẰNG logger.info
      logger.info('Admin user created for', adminEmail);
    }
  }
}

// ==========================================
// THÊM ĐOẠN NÀY VÀO SERVER.JS (Gần cuối file)
// ==========================================

// 1. Import thư viện (Thêm dòng này lên đầu file server.js cùng các dòng require khác)

// 2. Thêm API Chat (Dán đoạn này vào trước dòng 'if(!process.env.VERCEL)...')
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    // Lấy danh sách sản phẩm từ DB để Gemini biết mình đang bán gì
    await connectMongo();
    const products = await db.collection('products').find({ status: 'active' }).toArray();
    
    // Tạo ngữ cảnh (Context) sản phẩm cho AI
    const productListText = products.map(p => 
      `- Tên: ${p.name}, Giá: $${p.price}, Danh mục: ${p.categorySlug}`
    ).join('\n');

    // Cấu hình AI
    // LƯU Ý: Bạn cần thêm GEMINI_API_KEY vào file .env nhé
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});

    const prompt = `
      Bạn là trợ lý ảo AI của cửa hàng thực phẩm sạch Organica.
      Dưới đây là danh sách sản phẩm cửa hàng đang bán:
      ${productListText}

      Quy tắc trả lời:
      1. Chỉ tư vấn dựa trên danh sách sản phẩm trên.
      2. Nếu khách hỏi về bệnh (ví dụ: đau dạ dày, tiểu đường), hãy tư vấn các loại rau củ quả phù hợp có trong danh sách và giải thích công dụng dinh dưỡng.
      3. Giọng điệu thân thiện, ngắn gọn, có ích.
      4. Nếu khách hỏi sản phẩm không có trong danh sách, hãy khéo léo bảo cửa hàng chưa bán.

      Câu hỏi của khách: "${message}"
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (err) {
    console.error('Chat AI Error:', err);
    res.status(500).json({ error: 'AI đang bận, thử lại sau nhé!' });
  }
});

// ==========================================

if(!process.env.VERCEL){
  // Local mode: start server normally
  setupIndexesAndAdmin().then(()=>{
    app.listen(port, () => {
      // THAY THẾ console.log BẰNG logger.info
      logger.info(`Organica server running at http://localhost:${port}`); 
      if (keycloak) {
        // THAY THẾ console.log BẰNG logger.info
        logger.info('Keycloak realm:', process.env.KEYCLOAK_REALM, 'client:', process.env.KEYCLOAK_CLIENT_ID);
        // THAY THẾ console.log BẰNG logger.info
        logger.info('Login URL (Keycloak):', `${process.env.KEYCLOAK_BASE_URL}realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/auth`);
      }
    });
  }).catch(err=>{ 
    // THAY THẾ console.error BẰNG logger.error
    logger.error('Failed to start server', err); 
    process.exit(1); 
});
} else {
  // Vercel serverless: prepare indexes eagerly (non-blocking for cold start
  // Cần sửa console.error trong khối này nếu bạn muốn deploy lên Vercel
  setupIndexesAndAdmin().catch(e=>logger.error('Setup error (serverless):', e.message));
  module.exports = app;
>>>>>>> nam
}
