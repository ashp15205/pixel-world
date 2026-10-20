import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import ContextDev from 'context.dev';

function contextDevApiPlugin(): Plugin {
  return {
    name: 'context-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === 'POST' && (req.url === '/api/map' || req.url === '/api/scrape')) {
          let rawBody = '';
          req.on('data', chunk => {
            rawBody += chunk;
          });

          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json');

            try {
              const body = JSON.parse(rawBody || '{}');
              const keyHeader = req.headers['x-context-dev-key'];
              const apiKey = (Array.isArray(keyHeader) ? keyHeader[0] : keyHeader)?.trim();

              if (!apiKey) {
                res.statusCode = 401;
                return res.end(JSON.stringify({ error: 'Context.dev API key is required. Please enter your API key.' }));
              }

              if (!body.url) {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Please enter a valid website URL.' }));
              }

              const targetUrl = new URL(body.url.startsWith('http') ? body.url : `https://${body.url}`);
              const client = new ContextDev({ apiKey, logLevel: 'error' });

              if (req.url === '/api/map') {
                const cap = Math.min(100, Math.max(1, Number(body.cap) || 25));
                const result: any = await client.web.mapUrls({ domain: targetUrl.hostname });

                // Recursively extract URLs from result
                const candidates: string[] = [];
                const collect = (val: any, depth = 0) => {
                  if (depth > 8 || val == null) return;
                  if (typeof val === 'string' && /^https?:\/\//i.test(val)) {
                    candidates.push(val);
                    return;
                  }
                  if (Array.isArray(val)) {
                    val.forEach(v => collect(v, depth + 1));
                    return;
                  }
                  if (typeof val === 'object') {
                    for (const [k, v] of Object.entries(val)) {
                      if (typeof v === 'string' && /url|link|href/i.test(k) && /^https?:\/\//i.test(v)) candidates.push(v);
                      else if (typeof v === 'object') collect(v, depth + 1);
                    }
                  }
                };
                collect(result);

                const seen = new Set<string>();
                const urls: string[] = [];
                for (const raw of [targetUrl.href, ...candidates]) {
                  try {
                    const u = new URL(raw);
                    u.hash = '';
                    if (u.origin !== targetUrl.origin) continue;
                    if (['mailto:', 'tel:', 'javascript:'].includes(u.protocol)) continue;
                    if (!seen.has(u.href) && urls.length < cap) {
                      seen.add(u.href);
                      urls.push(u.href);
                    }
                  } catch {}
                }

                if (urls.length === 0) {
                  urls.push(targetUrl.href);
                }

                res.statusCode = 200;
                return res.end(
                  JSON.stringify({
                    urls,
                    domain: targetUrl.hostname,
                    cap,
                    discovered: urls.length,
                  })
                );
              }

              if (req.url === '/api/scrape') {
                const page: any = await client.web.scrape({
                  url: targetUrl.href,
                  formats: { markdown: true },
                  sharedParams: { mainContentOnly: true },
                });

                const markdown = page?.markdown?.data ?? page?.data?.markdown ?? page?.markdown ?? '';
                const title = String(
                  page?.metadata?.title ||
                    page?.title ||
                    page?.ogTitle ||
                    targetUrl.pathname.split('/').filter(Boolean).pop() ||
                    targetUrl.hostname
                ).slice(0, 240);

                const links = typeof markdown === 'string'
                  ? [...markdown.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1])
                  : [];
                const uniqueLinks = [...new Set(links)].slice(0, 500);

                res.statusCode = 200;
                return res.end(
                  JSON.stringify({
                    url: targetUrl.href,
                    title,
                    markdown: typeof markdown === 'string' ? markdown : '',
                    excerpt: typeof markdown === 'string'
                      ? markdown.replace(/[#>*`_\[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 420)
                      : `Content for ${title}`,
                    links: uniqueLinks,
                  })
                );
              }
            } catch (err: any) {
              const status = err.status || err.statusCode || 400;
              res.statusCode = typeof status === 'number' && status >= 400 && status < 600 ? status : 400;
              let msg = err.message || 'Context.dev request failed.';
              if (err.name === 'AuthenticationError' || status === 401) {
                msg = 'Invalid Context.dev API Key. Please verify your API key at context.dev';
              } else if (err.name === 'RateLimitError' || status === 429) {
                msg = 'Context.dev rate limit reached. Please wait a moment or check your quota.';
              } else if (status === 403) {
                msg = 'Access forbidden by Context.dev. Please check your account permissions.';
              }
              return res.end(JSON.stringify({ error: msg }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), contextDevApiPlugin()],
});