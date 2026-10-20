# Contributing

1. Fork the repository and create a feature branch.
2. Install dependencies with `npm install`.
3. Run `npm run dev` for the frontend and `npx vercel dev` to test serverless routes locally.
4. Run `npm run build` before opening a pull request.
5. Do not commit API keys, `.env` files, private datasets, or licensed assets without permission.

Keep the game engine, graph construction, and provider integration separate. For changes to the Context.dev integration, verify behavior against the current official SDK docs and add tests for response variations.
