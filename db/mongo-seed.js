// Seed MongoDB with sample categories and products for Organica
require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
	const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
	// Prefer explicit MONGO_DB_NAME for consistency with server.js
	const DB_NAME = process.env.MONGO_DB_NAME || process.env.DB_NAME || 'organica';
	const client = new MongoClient(MONGO_URL);
	try {
		await client.connect();
		const db = client.db(DB_NAME);

		const categories = [
			{ name: 'Fresh Vegetables', slug: 'fresh-vegetables', sort_order: 1 },
			{ name: 'Fish & Meat', slug: 'fish-meat', sort_order: 2 },
			{ name: 'Healthy Fruit', slug: 'healthy-fruit', sort_order: 3 },
			{ name: 'Dairy Products', slug: 'dairy-products', sort_order: 4 },
		];

		for (const c of categories) {
			await db.collection('categories').updateOne(
				{ slug: c.slug },
				{ $set: { ...c, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
				{ upsert: true }
			);
		}

		const catMap = categories.reduce((m, c) => { m[c.slug] = c.slug; return m; }, {});

		const products = [
			{ name: 'Fresh Orangey', slug: 'fresh-orangey', price: 85.00, compareAt: 75.00, image: './assets/images/product-1.png', categorySlug: catMap['healthy-fruit'] },
			{ name: 'key Lime', slug: 'key-lime', price: 85.00, compareAt: 75.00, image: './assets/images/product-2.png', categorySlug: catMap['healthy-fruit'] },
			{ name: 'Fresh Watermelon', slug: 'fresh-watermelon', price: 85.00, compareAt: 75.00, image: './assets/images/product-3.png', categorySlug: catMap['healthy-fruit'] },
			// Removed 'Visual matches' from seed (will delete existing doc below)
			{ name: 'Pomagranate Fruit', slug: 'pomagranate-fruit', price: 85.00, compareAt: 75.00, image: './assets/images/product-5.png', categorySlug: catMap['healthy-fruit'] },
			{ name: 'Red onion', slug: 'red-onion', price: 85.00, compareAt: 75.00, image: './assets/images/product-6.png', categorySlug: catMap['fresh-vegetables'] },
			{ name: 'Lens Results Broccoli', slug: 'lens-results-broccoli', price: 85.00, compareAt: 75.00, image: './assets/images/product-7.png', categorySlug: catMap['fresh-vegetables'] },
			{ name: 'Lens Results Spinach', slug: 'lens-results-spinach', price: 85.00, compareAt: 75.00, image: './assets/images/product-8.png', categorySlug: catMap['fresh-vegetables'] },
			// Corrected images for Beef & Salmon:
			{ name: 'Beef Steak', slug: 'beef-steak', price: 120.00, compareAt: 140.00, image: './assets/images/top-product-10.png', categorySlug: catMap['fish-meat'] },
			{ name: 'Salmon Fillet', slug: 'salmon-fillet', price: 150.00, compareAt: 170.00, image: './assets/images/top-product-11.png', categorySlug: catMap['fish-meat'] },
			{ name: 'Leaf lettuce', slug: 'leaf-lettuce', price: 35.00, compareAt: 45.00, image: './assets/images/top-product-9.png', categorySlug: catMap['fresh-vegetables'] },
		].map(p => ({ ...p, status: 'active' }));

		for (const p of products) {
			await db.collection('products').updateOne(
				{ slug: p.slug },
				{ $set: { ...p, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
				{ upsert: true }
			);
		}

		// Delete legacy 'Visual matches' product if it exists
		await db.collection('products').deleteOne({ slug: 'visual-matches' });
		console.log('Mongo seed completed. Categories:', categories.length, 'Products inserted/updated:', products.length, 'Removed visual-matches if present');
		process.exit(0);
	} catch (e) {
		console.error('Mongo seed failed:', e.message);
		process.exit(1);
	} finally {
		try { await client.close(); } catch (_) {}
	}
})();
