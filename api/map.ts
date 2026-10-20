import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, getClient, sendError, validPublicUrl } from './_shared';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req,res); if (req.method === 'OPTIONS') return res.status(204).end(); if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const url = validPublicUrl(req.body?.url); const cap = Math.min(100, Math.max(1, Number(req.body?.cap) || 50));
    const client = getClient(req);
    const result: any = await client.web.mapUrls({ domain: url.hostname });
    const candidates = collectUrls(result).map((s) => { try { return new URL(s, url).href; } catch { return ''; } }).filter(Boolean);
    const seen = new Set<string>(); const urls: string[] = [];
    for (const raw of [url.href, ...candidates]) {
      try { const u = new URL(raw); u.hash=''; if (u.origin !== url.origin) continue; if (['mailto:','tel:','javascript:'].includes(u.protocol)) continue; if (!seen.has(u.href) && urls.length < cap) { seen.add(u.href); urls.push(u.href); } } catch { /* skip malformed result */ }
    }
    return res.status(200).json({ urls, domain: url.hostname, cap, discovered: candidates.length });
  } catch (e) { return sendError(res,e); }
}
function collectUrls(value: any, out: string[] = [], depth=0): string[] {
  if (depth > 8 || value == null) return out;
  if (typeof value === 'string') { if (/^https?:\/\//i.test(value)) out.push(value); return out; }
  if (Array.isArray(value)) { for (const item of value) collectUrls(item,out,depth+1); return out; }
  if (typeof value === 'object') { for (const [key,v] of Object.entries(value)) { if (typeof v === 'string' && /url|link|href/i.test(key) && /^https?:\/\//i.test(v)) out.push(v); else if (typeof v === 'object') collectUrls(v,out,depth+1); } }
  return out;
}
