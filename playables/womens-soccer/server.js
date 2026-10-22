'use strict';
// Local / generic Node host entry point. On Vercel, api/index.js is used instead.
const http = require('http');
const { handler } = require('./lib/app');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

http.createServer(handler).listen(PORT, HOST, () => {
  const pub = process.env.PUBLIC_URL;
  console.log(`womens-soccer listening on http://${HOST}:${PORT}${pub ? ` (public ${pub})` : ''}`);
});
