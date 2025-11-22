// Vercel serverless entry: reuse Express app from root server.js
const app = require('../server');
module.exports = app;