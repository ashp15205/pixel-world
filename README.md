# PixelWorld 🌍🎮

> **Turn any website into a playable, explorable 2D pixel-art universe.**  
> Paste a URL, explore pages as interactive buildings, walk down roads connecting hyperlinks, and inspect full page markdown in a retro RPG world.

[![Live Demo](https://img.shields.io/badge/🎮%20Play%20Online-pixel--world--rho.vercel.app-00c853?style=for-the-badge&logo=vercel)](https://pixel-world-rho.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev/)
[![Phaser](https://img.shields.io/badge/Phaser-3.90-red.svg?logo=phaser)](https://phaser.io/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

### 🚀 **Live Application:** [https://pixel-world-rho.vercel.app/](https://pixel-world-rho.vercel.app/)
*No installation needed! Jump straight in, test the built-in demo world, or paste any website to generate your own pixel island.*

---

## 📸 Showcase

### Full Procedural Island Map (Wispr Flow Example: 52 Pages)
![PixelWorld Full Island Map](public/screenshots/fullmap-showcase.png)

### In-Game Building Inspector & Formatted Reader
![PixelWorld Building Inspector Modal](public/screenshots/modal-inspector.png)

---

## 🌟 What is PixelWorld?

PixelWorld bridges web intelligence and retro video games. By integrating with **Context.dev**'s web mapping and scraping engine, PixelWorld crawls a target website, analyzes its hierarchy, extracts clean Markdown and hyperlink topologies, and procedurally generates a living 2D island in **Phaser 3**.

Every webpage becomes a unique physical building categorized into architectural districts (e.g. *Docs, Blog, Product, Pricing, Company*). Hyperlinks between pages become paved cobblestone paths. You can walk around using WASD or arrow keys, discover relationships between content, and press **E** (or click) to read structured highlights, pricing plans, and code snippets.

---

## 🕹️ How to Play & Controls

| Action | Controls |
| :--- | :--- |
| **Move Character** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Inspect / Read Page** | Approach any building and press `E`, or **Click** on it |
| **Pan Camera** | Click & Drag anywhere on map, or **2-Finger Swipe** on trackpad |
| **Zoom In / Out** | Mouse scroll wheel or trackpad pinch (0.15x to 2.5x) |
| **Recenter Character** | Click the **🎯 Recenter** button in bottom HUD |
| **Fit Entire Island** | Click the **🗺️ View Whole Map** button in bottom HUD |
| **Quick Search** | Press `/` key to search all page titles, URLs, and summaries |
| **Download Map** | Click **📸 Screenshot** in top bar to save a high-res PNG of the full island |

---

## ✨ Features

- **🌐 Any Public Website**: Turn documentation portals, SaaS landing pages, engineering blogs, or knowledge bases into explorable islands.
- **🏝️ Procedural World Generation**:
  - Deterministic procedural island generator with coastlines, beaches, deep water, and flora.
  - Pathfinding algorithms that pave cobblestone roads between inter-linked pages.
  - URL-derived district zoning with distinct color codes and architectural styles.
- **🎮 Phaser 3 Game Engine**:
  - Crisp retro pixel art with high-contrast, scalable text labels.
  - Smooth player avatar with 8-directional movement.
  - Day/night ambiance lighting and organic scenery (trees, lanterns, water shorelines).
  - Approach proximity triggers (`[E] Read Page` tooltip).
- **🕹️ Intuitive Map Camera & Navigation**:
  - **Pan & Zoom**: Smooth mouse drag, 2-finger trackpad panning, and mouse wheel zooming.
  - **Recenter View (`🎯 Recenter`)**: Instantly re-anchors the camera onto your character at 1.0x scale.
  - **Fit Whole Map (`🗺️ View Whole Map`)**: Mathematically calculates the bounding box and centers the entire island within your viewport in one click.
- **🔍 Quick In-World Search (`/`)**:
  - Press `/` anywhere to trigger a fuzzy search across all page titles, URLs, and summaries.
  - Click any search result to auto-navigate and open its inspector.
- **📖 Deep Content Inspector**:
  - **Highlights & Overview**: AI-parsed key takeaways, clean page summaries, and detected pricing/tier badges.
  - **Markdown Reader**: Formatted prose reader supporting headings, bullet lists, and code blocks.
  - **Syntax-Highlighted Code Snippets**: With one-click copy to clipboard.
  - **Outgoing Link Graph**: Explore sub-pages and external destinations directly.
- **💾 Zero-Credit Local Caching**:
  - Automatically caches the currently mapped world in browser `localStorage`.
  - Accidental page refreshes or tab reloads instantly restore your map without consuming new API credits.
  - Option to securely remember your Context.dev API key locally.
- **📸 High-Res Map Export**:
  - Export a full, pixel-crisp PNG screenshot of the entire procedural canvas (`{domain}-pixelworld-fullmap.png`).
- **📦 JSON Export / Import**:
  - Save world topologies into portable, versioned JSON files (`v1` schema) and reload them offline anytime.

---

## 🛠️ Architecture & Tech Stack

```mermaid
flowchart LR
    A[User Input URL] --> B[Vercel Serverless API]
    B -->|mapUrls| C[Context.dev SDK]
    B -->|scrape| C
    C -->|Markdown & Topology| B
    B --> D[Frontend World Generator]
    D -->|Graph & Tile Matrix| E[Phaser 3 Game Canvas]
    D -->|Local Storage Cache| F[Browser Storage]
    E <--> G[React 19 HUD & Reader Modal]
```

- **Frontend**: React 19, TypeScript, Vanilla CSS (Design tokens, modern glassmorphism).
- **Game Engine**: Phaser 3 (Canvas / WebGL renderer, Arcade physics, tilemaps).
- **Web Intelligence**: Context.dev TypeScript SDK (`@context.dev/sdk`).
- **Serverless API**: Vercel Serverless Functions (Node.js runtime in `api/`).
- **Validation**: Strict URL protocol checking & SSRF filtering in `api/_shared.ts`.

---

## 🔒 Security & Vulnerability Analysis

PixelWorld is engineered with defensive security principles:

### 1. Bring-Your-Own-Key (BYOK) Isolation
- **No Server Persistence**: API keys are passed on a per-request basis in the `x-context-dev-key` HTTP header directly to the stateless serverless function.
- **Never Logged**: The serverless functions never log request headers or raw API keys to cloud observability platforms.
- **Browser-Side Isolation**: The key is stored only in the user's local browser `localStorage` (if "Remember Key" is selected) and never transmitted to any third-party domain other than your deployment's `/api/*` endpoints.

### 2. SSRF (Server-Side Request Forgery) Defense
- All URLs submitted to `/api/map` and `/api/scrape` pass through `validPublicUrl()` in `api/_shared.ts`:
  - Enforces `http:` or `https:` protocols only.
  - Rejects embedded user credentials (`http://user:pass@host`).
  - Explicitly blocks internal network ranges: `localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` (cloud metadata service), and `::1`.
  - Crawling and page fetching are delegated to Context.dev's cloud infrastructure, isolating your serverless runtime from raw socket connections.

### 3. Cross-Site Scripting (XSS) Prevention
- External web content, page titles, and Markdown are parsed safely:
  - PixelWorld **never** uses `dangerouslySetInnerHTML`.
  - All extracted text, headings, and excerpts are rendered via React's native virtual DOM elements, which automatically escape HTML entities.
  - Discovered sub-links strictly enforce `http:` and `https:` schemes, preventing `javascript:` or `data:` URL execution vulnerabilities.
  - All outgoing anchor links include `target="_blank" rel="noreferrer"` to prevent window opener hijacking.

### 4. Denial of Wallet / Resource Caps
- To prevent accidental credit exhaustion or provider rate-limiting:
  - Page mapping has a strict user-configurable cap (`cap` clamped between 10 and 100).
  - Page scraping runs with a controlled concurrency limit of 2 concurrent workers.
  - Mapped worlds are stored in `localStorage`, guaranteeing that browser reloads or accidental page refreshes consume **0 additional credits**.

---

## 📜 Disclaimer & Responsible Use

> **Disclaimer**: PixelWorld is an independent, open-source visualization experiment. All third-party trademarks, service marks, logos, brand names, and website contents displayed or represented as in-game buildings belong exclusively to their respective copyright holders.  
> 
> Website mapping and scraping are executed via the Context.dev API using user-provided credentials (BYOK). Users are solely responsible for ensuring they have appropriate rights and authorization to crawl and visualize target URLs in compliance with website Terms of Service, `robots.txt` directives, and applicable data privacy regulations. PixelWorld does not host, mirror, or claim ownership over scraped external content.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<p align="center">
  Built with ❤️ using <strong>Phaser 3</strong>, <strong>React 19</strong>, and <strong>Context.dev</strong>.
</p>
