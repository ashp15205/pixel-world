# Deployment checklist

## Vercel

- [ ] Import repository from GitHub.
- [ ] Framework preset Vite; build `npm run build`; output `dist`.
- [ ] Ensure `api/` serverless functions are deployed.
- [ ] Use user-supplied keys; do not set a shared production key unless you explicitly intend to pay for users.
- [ ] Configure abuse controls and request rate limits before public launch.
- [ ] Test `POST /api/map` and `POST /api/scrape` with a low page cap.
- [ ] Check provider response fields against current Context.dev docs.
- [ ] Confirm logs do not contain API keys.

## GitHub

```bash
git init
git add .
git commit -m "Initial PixelWorld MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pixelworld.git
git push -u origin main
```
