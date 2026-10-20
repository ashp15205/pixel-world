import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, getClient, sendError, validPublicUrl } from './_shared';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(req,res); if (req.method === 'OPTIONS') return res.status(204).end(); if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const url = validPublicUrl(req.body?.url); const client = getClient(req);
    const page: any = await client.web.scrape({ url: url.href, formats: { markdown: true }, sharedParams: { mainContentOnly: true } });
    const markdown = page?.markdown?.data ?? page?.data?.markdown ?? '';
    const title = String(page?.metadata?.title || page?.title || page?.ogTitle || url.pathname.split('/').filter(Boolean).pop() || url.hostname).slice(0,240);
    if (!markdown || typeof markdown !== 'string') throw new Error('The page returned no Markdown content. Try another URL.');
    const links = [...markdown.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(m=>m[1]);
    const uniqueLinks = [...new Set(links)].slice(0,500);
    return res.status(200).json({ url: url.href, title, markdown, excerpt: markdown.replace(/[#>*`_\[\]]/g,' ').replace(/\s+/g,' ').trim().slice(0,420), links: uniqueLinks });
  } catch (e) { return sendError(res,e); }
}
