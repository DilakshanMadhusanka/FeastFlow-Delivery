import { createApp } from './apps/api/src/app';

const app = createApp();

// Support both CommonJS and ES Module imports for Vercel Serverless Function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
  module.exports.default = app;
}

export default app;
