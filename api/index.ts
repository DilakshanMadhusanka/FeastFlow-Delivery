import { createApp } from '../apps/api/src/app';

const app = createApp();

export default function handler(req: any, res: any) {
  // If Vercel rewrites route to /api, req.url may be rewritten to '/api'.
  // Restore the original request URL from req.originalUrl so Express routes match correctly.
  if (req.originalUrl && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  }
  return app(req, res);
}
