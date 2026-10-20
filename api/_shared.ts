import ContextDev from 'context.dev';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function cors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  // Same-origin deployment is the default. Configure allowed origins at the platform if needed.
  if (origin && process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-context-dev-key');
}
export function getClient(req: VercelRequest) {
  const keyHeader = req.headers['x-context-dev-key'];
  const userKey = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
  const apiKey = userKey?.trim() || process.env.CONTEXT_DEV_API_KEY;
  if (!apiKey) throw new Error('Add your Context.dev API key to continue.');
  return new ContextDev({ apiKey, logLevel: 'error' });
}
export function validPublicUrl(value: unknown): URL {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Enter a valid website URL.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Enter a complete URL, such as https://example.com.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '::1') throw new Error('Private and local network URLs are not supported.');
  url.hash = '';
  return url;
}
export function sendError(res: VercelResponse, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected error';
  res.status(400).json({ error: message.slice(0, 500) });
}
