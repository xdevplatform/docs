'use strict';
// Vercel serverless entry. vercel.json rewrites every dynamic route here
// (original path is passed as ?__path=...).
const { handler } = require('../lib/app');

module.exports = handler;
