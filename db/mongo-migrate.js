// Migrate MongoDB data from local to Atlas (or any target)
// Usage: set env vars then run `npm run migrate:mongo`
// Env:
// - MONGO_LOCAL_URL (source, default: mongodb://localhost:27017)
// - MONGO_URL or ATLAS_URL (target)
// - DB_NAME (default: organica)

require('dotenv').config();
const { MongoClient } = require('mongodb');

const SOURCE_URL = process.env.MONGO_LOCAL_URL || 'mongodb://localhost:27017';
const TARGET_URL = process.env.MONGO_URL || process.env.ATLAS_URL;
const DB_NAME = process.env.DB_NAME || 'organica';

if (!TARGET_URL) {
  console.error('TARGET_URL missing. Set MONGO_URL (preferred) or ATLAS_URL to your Atlas connection string.');
  process.exit(1);
}

const collectionsToCopy = ['categories', 'products', 'orders'];

async function copyIndexes(sourceDb, targetDb, collName) {
  try {
    const sourceColl = sourceDb.collection(collName);
    const targetColl = targetDb.collection(collName);
    const idx = await sourceColl.listIndexes().toArray();
    const createSpecs = idx
      .filter(i => i.name !== '_id_')
      .map(i => {
        const { key, name, unique, sparse, expireAfterSeconds, partialFilterExpression, collation } = i;
        return { key, name, unique, sparse, expireAfterSeconds, partialFilterExpression, collation };
      });
    if (createSpecs.length) {
      await targetColl.createIndexes(createSpecs);
    }
  } catch (e) {
    console.warn(`Warning: could not copy indexes for ${collName}:`, e.message);
  }
}

async function copyCollection(sourceDb, targetDb, collName) {
  const sourceColl = sourceDb.collection(collName);
  const targetColl = targetDb.collection(collName);

  await copyIndexes(sourceDb, targetDb, collName);

  const cursor = sourceColl.find({}, { noCursorTimeout: true });
  let batch = [];
  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: doc },
        upsert: true,
      }
    });
    if (batch.length >= 1000) {
      const res = await targetColl.bulkWrite(batch, { ordered: false });
      count += res.upsertedCount + res.modifiedCount + (res.matchedCount || 0);
      batch = [];
    }
  }
  if (batch.length) {
    const res = await targetColl.bulkWrite(batch, { ordered: false });
    count += res.upsertedCount + res.modifiedCount + (res.matchedCount || 0);
  }
  return count;
}

async function run() {
  console.log('Starting Mongo migration');
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Target: ${TARGET_URL}`);
  console.log(`DB    : ${DB_NAME}`);

  const sourceClient = new MongoClient(SOURCE_URL);
  const targetClient = new MongoClient(TARGET_URL);
  await sourceClient.connect();
  await targetClient.connect();
  const sourceDb = sourceClient.db(DB_NAME);
  const targetDb = targetClient.db(DB_NAME);

  const results = {};
  for (const name of collectionsToCopy) {
    process.stdout.write(`Copying ${name}... `);
    const n = await copyCollection(sourceDb, targetDb, name);
    results[name] = n;
    console.log('done');
  }

  console.log('Migration complete:', results);
  await sourceClient.close();
  await targetClient.close();
}

run().catch(err => { console.error(err); process.exit(1); });
