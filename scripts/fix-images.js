// One-off script to correct product images and remove legacy product
require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'organica';
  const client = new MongoClient(MONGO_URL);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const products = db.collection('products');

    const ops = [
      { slug: 'beef-steak', image: './assets/images/top-product-10.png' },
      { slug: 'salmon-fillet', image: './assets/images/top-product-11.png' }
    ];

    for(const op of ops){
      const r = await products.updateOne({ slug: op.slug }, { $set: { image: op.image, updatedAt: new Date() } });
      console.log('Updated', op.slug, 'matched:', r.matchedCount);
    }

    const del = await products.deleteOne({ slug: 'visual-matches' });
    console.log('Removed visual-matches deletedCount:', del.deletedCount);
  } catch(e){
    console.error('fix-images failed:', e.message);
    process.exit(1);
  } finally {
    try { await client.close(); } catch(_){}
  }
})();
