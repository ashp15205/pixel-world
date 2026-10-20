import { useMemo, useState, useEffect } from 'react';
import Game from './Game';
import { buildWorld } from './world';
import { parsePageData } from './pageParser';
import type { Page, World } from './types';

export default function App() {
  // Persist World in localStorage so page refresh doesn't waste Context.dev credits!
  const [world, setWorld] = useState<World | null>(() => {
    try {
      const savedWorldStr = localStorage.getItem('pixelworld_saved_world');
      if (savedWorldStr) {
        const parsed = JSON.parse(savedWorldStr);
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [selected, setSelected] = useState<Page | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'overview' | 'reader' | 'links' | 'code'>('overview');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const parsedSelected = useMemo(() => {
    return selected ? parsePageData(selected) : null;
  }, [selected]);

  useEffect(() => {
    if (selected) {
      setInspectorTab('overview');
      setCopiedUrl(false);
    }
  }, [selected]);

  const [url, setUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('pixelworld_saved_url') || '';
    } catch {
      return '';
    }
  });
  
  // Persist Context.dev API key in localStorage
  const [key, setKey] = useState<string>(() => {
    try {
      return localStorage.getItem('pixelworld_api_key') || '';
    } catch {
      return '';
    }
  });

  const [savedKey, setSavedKey] = useState<string>(() => {
    try {
      return localStorage.getItem('pixelworld_api_key') || '';
    } catch {
      return '';
    }
  });

  const [keyJustSaved, setKeyJustSaved] = useState(false);

  const [cap, setCap] = useState(25);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const [stage, setStage] = useState<'idle' | 'loading' | 'generating' | 'success' | 'error'>(() => {
    try {
      const savedWorldStr = localStorage.getItem('pixelworld_saved_world');
      if (savedWorldStr) return 'success';
    } catch {}
    return 'idle';
  });

  const [errorInfo, setErrorInfo] = useState<{ title: string; cause: string; tip?: string } | null>(null);

  const [status, setStatus] = useState<string>(() => {
    try {
      const savedWorldStr = localStorage.getItem('pixelworld_saved_world');
      if (savedWorldStr) {
        const parsed = JSON.parse(savedWorldStr);
        if (parsed && parsed.name) {
          return `Loaded saved map for ${parsed.name} from local storage (0 credits used).`;
        }
      }
    } catch {}
    return 'Enter a website URL and your mandatory Context.dev API key to generate the world.';
  });

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [zoom, setZoom] = useState(1.15);

  const isKeySaved = Boolean(key.trim() && savedKey && savedKey === key.trim());

  const handleKeyChange = (val: string) => {
    setKey(val);
    if (keyJustSaved) setKeyJustSaved(false);
  };

  const handleSaveKey = () => {
    const trimmed = key.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('pixelworld_api_key', trimmed);
      setSavedKey(trimmed);
      setKeyJustSaved(true);
      setTimeout(() => setKeyJustSaved(false), 2500);
    } catch {}
  };

  const handleClearKey = () => {
    setKey('');
    setSavedKey('');
    try {
      localStorage.removeItem('pixelworld_api_key');
    } catch {}
  };

  const handleZoomIn = () => setZoom(z => Math.min(1.85, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const handleZoomReset = () => setZoom(1.15);

  const handleClearWorld = () => {
    if (window.confirm('Reset this world map and start fresh? (Your cached map will be cleared from browser storage, allowing you to enter a new website)')) {
      setWorld(null);
      setSelected(null);
      setStage('idle');
      setStatus('Map reset. Enter a website URL to generate a new world.');
      try {
        localStorage.removeItem('pixelworld_saved_world');
        localStorage.removeItem('pixelworld_saved_url');
      } catch {}
    }
  };

  function exportMapPNG() {
    if (!world) return;
    window.dispatchEvent(new CustomEvent('pixelworld:export-png'));
  }

  const handleFocusCharacter = () => {
    window.dispatchEvent(new CustomEvent('pixelworld:focus-character'));
  };

  const handleViewWholeMap = () => {
    window.dispatchEvent(new CustomEvent('pixelworld:view-whole-map'));
  };

  const matches = useMemo(
    () =>
      world
        ? world.pages.filter(
            p =>
              p.title.toLowerCase().includes(query.toLowerCase()) ||
              p.url.toLowerCase().includes(query.toLowerCase()) ||
              p.district.toLowerCase().includes(query.toLowerCase())
          )
        : [],
    [world, query]
  );

  // Global shortcut for search (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        if (world) setSearchOpen(prev => !prev);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setSelected(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [world]);

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorInfo(null);

    if (!url.trim()) {
      setStage('error');
      setErrorInfo({
        title: 'Missing Website URL',
        cause: 'Please enter a website URL to explore (e.g. documentation, university, or portfolio).',
        tip: 'Example: https://docs.stripe.com or https://stanford.edu',
      });
      setStatus('Please enter a website URL.');
      return;
    }

    // MANDATORY API KEY: Do not load without API key
    if (!key.trim()) {
      setStage('error');
      setErrorInfo({
        title: 'Missing Context.dev API Key',
        cause: 'Context.dev API key is required to crawl web pages, extract markdown, and discover connected links.',
        tip: 'Get your free API key at https://context.dev and paste it above.',
      });
      setStatus('Context.dev API key is mandatory. Please enter your API key to discover pages and build the world.');
      return;
    }

    let cleanInput = url.trim();
    if (!cleanInput.startsWith('http://') && !cleanInput.startsWith('https://')) {
      cleanInput = `https://${cleanInput}`;
    }

    let parsed: URL;
    try {
      parsed = new URL(cleanInput);
    } catch {
      setStage('error');
      setErrorInfo({
        title: 'Invalid URL Format',
        cause: `The input "${url}" is not a valid web URL.`,
        tip: 'Ensure the URL starts with https:// or http:// (e.g. https://example.com)',
      });
      setStatus('Please enter a valid website URL (e.g. https://docs.stripe.com or https://example.com).');
      return;
    }

    setBusy(true);
    setStage('loading');
    setProgress(15);
    setStatus(`Connecting to Context.dev… discovering pages for ${parsed.hostname}…`);

    try {
      const headers = { 'Content-Type': 'application/json', 'x-context-dev-key': key.trim() };
      const mapRes = await fetch('/api/map', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url: parsed.href, cap }),
      });

      const mapText = await mapRes.text();
      let mapped: any = null;
      try {
        mapped = JSON.parse(mapText);
      } catch {
        // If not JSON, mapText will be used in error diagnostic
      }

      if (!mapRes.ok) {
        const errorMsg = mapped?.error || mapText.slice(0, 300) || `Server returned status ${mapRes.status}`;
        let title = 'Failed to Map Website';
        let cause = errorMsg;
        let tip = 'Verify your Context.dev API key and ensure the website is accessible.';

        if (mapRes.status === 401 || errorMsg.toLowerCase().includes('key') || errorMsg.toLowerCase().includes('unauthorized')) {
          title = 'Invalid Context.dev API Key (401)';
          cause = 'Context.dev rejected the API key you entered. The key is either invalid, mistyped, or expired.';
          tip = 'Log in to https://context.dev and copy your active API key.';
        } else if (mapRes.status === 429 || errorMsg.toLowerCase().includes('rate limit')) {
          title = 'Rate Limit Exceeded (429)';
          cause = 'Context.dev request quota has been reached for this API key.';
          tip = 'Wait a few moments before trying again, or check your quota on context.dev.';
        } else if (mapRes.status === 403) {
          title = 'Access Forbidden (403)';
          cause = 'Context.dev could not access or crawl this domain due to permissions or robots.txt restrictions.';
          tip = 'Try another public documentation site or personal website.';
        }

        throw { title, cause, tip, message: cause };
      }

      const urls: string[] = mapped.urls || [parsed.href];
      const raw: Omit<Page, 'district' | 'x' | 'y'>[] = [];
      let done = 0;

      setStage('generating');
      setProgress(25);
      setStatus(`Discovered ${urls.length} pages. Scraping markdown content…`);

      for (let i = 0; i < urls.length; i += 2) {
        const batch = urls.slice(i, i + 2);
        const results = await Promise.all(
          batch.map(async u => {
            try {
              const r = await fetch('/api/scrape', {
                method: 'POST',
                headers,
                body: JSON.stringify({ url: u }),
              });
              const scrapeText = await r.text();
              let data: any = null;
              try {
                data = JSON.parse(scrapeText);
              } catch {}

              if (!r.ok || !data) return null;
              return {
                id: '',
                url: data.url,
                title: data.title,
                excerpt: data.excerpt,
                markdown: data.markdown,
                links: data.links || [],
              };
            } catch {
              return null;
            }
          })
        );
        raw.push(...(results.filter(Boolean) as any));
        done += batch.length;
        setProgress(Math.round(25 + (done / urls.length) * 65));
        setStatus(`Scraping pages · ${Math.min(done, urls.length)} / ${urls.length}`);
      }

      if (!raw.length) {
        throw {
          title: 'Zero Pages Extracted',
          cause: `Context.dev could not extract readable content from ${parsed.hostname}.`,
          tip: 'Ensure the site has accessible text/markdown content and is not behind a login barrier.',
          message: 'No pages could be scraped.',
        };
      }

      setStatus(`Synthesizing 2D Minecraft village & road network for ${parsed.hostname}…`);
      setProgress(95);

      const next = buildWorld(raw, parsed.href);
      setWorld(next);
      setSelected(null);
      setStage('success');
      setProgress(100);
      setStatus(`Generated world for ${next.name}: ${next.pages.length} buildings · ${next.edges.length} connected paths.`);

      // Persist in localStorage so accidental page refresh doesn't waste credits
      try {
        localStorage.setItem('pixelworld_saved_world', JSON.stringify(next));
        localStorage.setItem('pixelworld_saved_url', parsed.href);
      } catch (e) {
        console.warn('Could not save world to localStorage:', e);
      }
    } catch (err: any) {
      setStage('error');
      if (err && typeof err === 'object' && 'title' in err) {
        setErrorInfo(err);
        setStatus(`Error: ${err.cause}`);
      } else {
        const rawMsg = err instanceof Error ? err.message : String(err);
        let title = 'Failed to Load World';
        let cause = rawMsg;
        let tip = 'Check your Context.dev API key, URL, and network connection.';

        if (rawMsg.includes('Unexpected end of JSON') || rawMsg.includes('JSON')) {
          title = 'Server Response Error';
          cause = 'Received an invalid response from the server.';
          tip = 'Ensure the local dev server is running and retry.';
        } else if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError')) {
          title = 'Network Error';
          cause = 'Could not communicate with the local server or Context.dev API.';
          tip = 'Check your internet connection and ensure your local server is active.';
        }

        setErrorInfo({ title, cause, tip });
        setStatus(`Failed to generate world: ${cause}`);
      }
    } finally {
      setBusy(false);
    }
  }

  function exportWorld() {
    if (!world) return;
    const blob = new Blob([JSON.stringify(world, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${world.name.replace(/[^a-z0-9-]/gi, '-')}-pixelworld.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function jumpTo(p: Page) {
    setSelected(p);
    setSearchOpen(false);
    window.dispatchEvent(new CustomEvent('pixelworld:jump', { detail: p.id }));
  }

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-icon">🎮</span>
          <span>
            pixel<span className="brand-light">world</span>
          </span>
        </a>

        <nav className="top-nav-links">
          <a href="#use-cases">Use Cases</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#architecture">Architecture</a>
        </nav>
      </header>

      {/* Main Content Area: ALL DETAILS & CONTROLS ARE ABOVE THE WORLD */}
      <main id="top">
        {/* Hero Banner */}
        <section className="hero-banner">
          <div className="eyebrow-pill">
            <span className="eyebrow-dot" />
            <span>AI-POWERED WEBSITE-TO-WORLD CONVERSION ENGINE</span>
          </div>
          <h1 className="hero-title">
            Turn any website into a <span className="gradient-text">playable 2D RPG world</span>.
          </h1>
          <p className="hero-description">
            Transform an existing website and its connected webpages into a vibrant, explorable 2D pixel-art realm
            inspired by Minecraft and classic RPG games. Buildings represent webpages, districts represent website
            sections, and roads connect related topics.
          </p>
        </section>

        {/* Website Generator Form (URL, Mandatory Context.dev API Key, Generate Button) */}
        <section className="generator-card" aria-label="Generate World">
          {/* Deck Header Bar */}
          <div className="deck-header">
            <div className="deck-header-left">
              <span className="deck-pulse-live" />
              <span className="deck-title">WORLD SYNTHESIZER CONSOLE</span>
              <span className="deck-badge-byok">BYOK ARCHITECTURE</span>
            </div>
            <div className="deck-header-right">
              <span className="deck-security-tag">
                <span className="security-icon">🔒</span> Stored in local browser storage
              </span>
              <a
                href="https://context.dev/"
                target="_blank"
                rel="noreferrer"
                className="deck-api-link"
              >
                Get Context.dev API Key ↗
              </a>
            </div>
          </div>

          <form className="generator-form" onSubmit={handleGenerate}>
            <div className="form-fields-row">
              {/* 01. URL Input */}
              <div className="field-group url-group">
                <label htmlFor="input-url">
                  <span className="col-step-tag">01</span>
                  <span className="col-title">Target Website</span>
                </label>
                <div className="input-box">
                  <span className="field-icon">🔗</span>
                  <input
                    id="input-url"
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://docs.stripe.com or https://stanford.edu"
                    required
                  />
                  {url && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      onClick={() => setUrl('')}
                      title="Clear URL"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="field-sub-meta">
                  <span className="field-helper">e.g. docs, campus, portfolio, wiki</span>
                </div>
              </div>

              {/* 02. Context.dev Key Input (Mandatory, with localStorage persistence) */}
              <div className="field-group key-group">
                <label htmlFor="input-key">
                  <span className="col-step-tag">02</span>
                  <span className="col-title">Context.dev API Key</span>
                  <span className="required-pill">Mandatory</span>
                </label>
                <div className="input-box">
                  <span className="field-icon">🔑</span>
                  <input
                    id="input-key"
                    type={showKey ? 'text' : 'password'}
                    value={key}
                    onChange={e => handleKeyChange(e.target.value)}
                    placeholder="Paste Context.dev key (sk-...)"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-vis-btn"
                    onClick={() => setShowKey(v => !v)}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Explicit Save button below the API key to save and keep it there */}
                <div className="key-save-action-bar">
                  <button
                    type="button"
                    className={`btn-save-key ${isKeySaved ? 'is-saved' : 'is-unsaved'}`}
                    onClick={handleSaveKey}
                    disabled={!key.trim()}
                    title={isKeySaved ? 'API key is kept permanently in browser localStorage' : 'Click to save key in browser permanently'}
                  >
                    {keyJustSaved ? (
                      <>✓ Saved to Browser!</>
                    ) : isKeySaved ? (
                      <>
                        <span className="status-dot-emerald" />
                        Key Saved & Kept
                      </>
                    ) : (
                      <>
                        <span className="save-icon">💾</span>
                        Save API Key
                      </>
                    )}
                  </button>

                  {isKeySaved && (
                    <span className="key-persisted-badge">
                      ✓ Kept in browser
                    </span>
                  )}

                  {key.trim() && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="btn-clear-key"
                      title="Clear saved key from browser"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* 03. Page Cap */}
              <div className="field-group cap-group">
                <label htmlFor="input-cap">
                  <span className="col-step-tag">03</span>
                  <span className="col-title">Crawl Depth</span>
                </label>
                <div className="select-wrapper">
                  <select
                    id="input-cap"
                    value={cap}
                    onChange={e => setCap(Number(e.target.value))}
                  >
                    <option value={10}>10 pages</option>
                    <option value={25}>25 pages</option>
                    <option value={50}>50 pages</option>
                  </select>
                  <span className="select-arrow">▼</span>
                </div>
                <div className="field-sub-meta">
                  <span className="field-helper">Depth crawl limit</span>
                </div>
              </div>

              {/* 04. Generate Button */}
              <div className="field-group submit-group">
                <label className="action-label">
                  <span className="col-step-tag">04</span>
                  <span className="col-title">RPG Synthesis</span>
                </label>
                <button
                  type="submit"
                  className={`btn-generate ${busy ? 'btn-busy' : ''}`}
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <span className="cyber-spinner" /> Generating…
                    </>
                  ) : (
                    <>
                      <span className="btn-lightning">⚡</span>
                      <span>Generate World</span>
                      <span className="btn-kbd">↵</span>
                    </>
                  )}
                </button>
                <div className="field-sub-meta">
                  <span className="field-helper">Press Enter to explore</span>
                </div>
              </div>
            </div>

            {/* Error Diagnostic Banner: Displays proper cause of failure */}
            {stage === 'error' && errorInfo && (
              <div className="error-diagnostic-banner" role="alert">
                <div className="error-diag-left">
                  <span className="error-diag-icon">⚠️</span>
                  <div className="error-diag-body">
                    <h4 className="error-diag-title">{errorInfo.title}</h4>
                    <p className="error-diag-cause"><b>Reason:</b> {errorInfo.cause}</p>
                    {errorInfo.tip && (
                      <p className="error-diag-tip">💡 <b>Suggestion:</b> {errorInfo.tip}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="error-diag-close"
                  onClick={() => { setStage('idle'); setErrorInfo(null); }}
                  aria-label="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Multi-Stage Animated Progress Bar when busy */}
            {busy && (
              <div className="gen-progress-wrapper">
                <div className="gen-stages-row">
                  <div className={`gen-stage-item ${stage === 'loading' ? 'active' : 'done'}`}>
                    <span className="stage-num">1</span>
                    <span className="stage-name">Connecting & Mapping</span>
                  </div>
                  <div className="gen-stage-divider" />
                  <div className={`gen-stage-item ${stage === 'generating' ? 'active' : stage === 'success' ? 'done' : ''}`}>
                    <span className="stage-num">2</span>
                    <span className="stage-name">Scraping Pages</span>
                  </div>
                  <div className="gen-stage-divider" />
                  <div className={`gen-stage-item ${progress >= 90 ? 'active' : ''}`}>
                    <span className="stage-num">3</span>
                    <span className="stage-name">Synthesizing World</span>
                  </div>
                </div>

                <div className="gen-progress-track">
                  <div className="gen-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="gen-status-subline">
                  <span className="gen-status-text">
                    <span className="gen-spin-icon" /> {status}
                  </span>
                  <span className="gen-pct-text">{progress}%</span>
                </div>
              </div>
            )}
          </form>

          {/* Status bar */}
          <div className={`status-strip ${stage}`}>
            <div className="status-strip-left">
              <span className={`status-dot ${stage === 'error' ? 'error' : stage === 'success' || world ? 'active' : busy ? 'busy' : ''}`} />
              <span className="status-msg">{status}</span>
            </div>
            <div className="status-strip-right">
              <span className="status-feature-pill">🕹️ Minecraft 2D Canvas</span>
              <span className="status-feature-pill">🗺️ Procedural Village</span>
              <span className="status-feature-pill">📸 PNG Export</span>
            </div>
          </div>
        </section>

        {/* Map Header Bar & Controls: SEARCH & EXPORT JSON RIGHT ON THE MAP */}
        <section className="world-header-bar" aria-label="Map Controls">
          <div className="world-meta">
            {world ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="world-badge">● ACTIVE WORLD</span>
                  <span className="world-storage-badge" title="Map is safely cached in localStorage and will not be lost on refresh">
                    💾 SAVED IN STORAGE (0 CREDITS ON REFRESH)
                  </span>
                </div>
                <h2 className="world-heading">{world.titleBanner}</h2>
                <span className="world-stats">
                  {world.pages.length} Buildings <b>·</b> {world.edges.length} Connected Roads <b>·</b> {world.name}
                </span>
              </>
            ) : (
              <>
                <span className="world-badge awaiting">○ MAP CANVAS</span>
                <h2 className="world-heading">Minecraft 2D Pixel World Canvas</h2>
                <span className="world-stats">
                  Enter website URL and mandatory Context.dev key above to explore
                </span>
              </>
            )}
          </div>

          <div className="map-controls-group">
            {/* Zoom Controls with proper min/max limits */}
            <div className="zoom-controls-group" title="Adjust Map Zoom (50% - 185%)">
              <button
                type="button"
                className="zoom-btn"
                onClick={handleZoomOut}
                disabled={!world || zoom <= 0.5}
                title="Zoom Out (−)"
              >
                −
              </button>
              <button
                type="button"
                className="zoom-display-btn"
                onClick={handleZoomReset}
                disabled={!world}
                title="Click to reset zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="zoom-btn"
                onClick={handleZoomIn}
                disabled={!world || zoom >= 1.85}
                title="Zoom In (+)"
              >
                +
              </button>
            </div>

            <button
              className="map-action-btn"
              onClick={() => world && setSearchOpen(true)}
              disabled={!world}
              title={world ? 'Search pages (/)' : 'Enter URL and API key to generate world first'}
            >
              🔍 Search Pages <kbd>/</kbd>
            </button>
            <button
              className="map-action-btn export-map-btn"
              onClick={exportMapPNG}
              disabled={!world}
              title={world ? 'Export entire world map as high-resolution PNG' : 'Enter URL and API key to generate world first'}
            >
              📸 Export Map PNG
            </button>
            <button
              type="button"
              className="map-action-btn focus-char-btn"
              onClick={handleFocusCharacter}
              disabled={!world}
              title="Focus camera closely on your character and nearby area (Space)"
            >
              🎯 Focus Character
            </button>
            <button
              type="button"
              className="map-action-btn view-map-btn"
              onClick={handleViewWholeMap}
              disabled={!world}
              title="Fit and center the entire island in the middle of the screen"
            >
              🗺️ Whole Map
            </button>
            <button
              className="map-action-btn export-btn"
              onClick={exportWorld}
              disabled={!world}
              title={world ? 'Export world as JSON' : 'Enter URL and API key to generate world first'}
            >
              ↓ Export JSON
            </button>
            {world && (
              <button
                type="button"
                className="map-action-btn map-clear-btn"
                onClick={handleClearWorld}
                title="Clear saved map from local storage and start fresh"
              >
                🗑️ Reset Map
              </button>
            )}
          </div>
        </section>

        {/* Single-Line Map Instructions & Controls Bar */}
        <div className="map-instructions-bar" aria-label="Map Navigation Instructions">
          <span className="inst-badge">🎮 CONTROLS</span>
          <span className="inst-item">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> Move Character
          </span>
          <span className="inst-sep">·</span>
          <span className="inst-item">
            Click Building or <kbd>E</kbd> / <kbd>Space</kbd> View Details
          </span>
          <span className="inst-sep">·</span>
          <span className="inst-item">
            Pinch or <kbd>+</kbd><kbd>−</kbd> Zoom
          </span>
          <span className="inst-sep">·</span>
          <span className="inst-item"><kbd>/</kbd> Quick Search</span>
          <span className="inst-sep">·</span>
          <span className="inst-item"><kbd>Space</kbd> / <b>[🎯 Focus Character]</b></span>
          <span className="inst-sep">·</span>
          <span className="inst-item">Click <b>[🗺️ Whole Map]</b> to Center Overview</span>
        </div>

        {/* Minecraft 2D Pixel World Canvas: COMPLETELY UNOBSTRUCTED (Nothing overlapping!) */}
        <section className="canvas-wrapper" aria-label="Interactive Minecraft-style Pixel World">
          {world ? (
            <Game
              world={world}
              onSelect={setSelected}
              selectedId={selected?.id}
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomChange={setZoom}
            />
          ) : busy ? (
            <div className="canvas-generating-state">
              <div className="generating-radar-pulse">
                <span className="radar-icon">⚡</span>
              </div>
              <h3 className="generating-title">Synthesizing 2D Minecraft World…</h3>
              <p className="generating-desc">{status}</p>
              <div className="generating-bar-track">
                <div className="generating-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="generating-percentage">{progress}% Complete</span>
            </div>
          ) : stage === 'error' && errorInfo ? (
            <div className="canvas-empty-state error-canvas">
              <div className="empty-state-badge error-badge">⚠️ GENERATION FAILED</div>
              <span className="empty-state-icon">⛔</span>
              <h3>{errorInfo.title}</h3>
              <p className="error-cause-lead">{errorInfo.cause}</p>
              {errorInfo.tip && <div className="canvas-tip-bubble">💡 <b>Suggestion:</b> {errorInfo.tip}</div>}
              <button
                type="button"
                className="canvas-retry-btn"
                onClick={() => {
                  const input = document.getElementById('input-url');
                  input?.focus();
                }}
              >
                Edit URL / API Key ↗
              </button>
            </div>
          ) : (
            <div className="canvas-empty-state">
              <div className="empty-state-badge">🔒 AWAITING API KEY & URL</div>
              <span className="empty-state-icon">🎮</span>
              <h3>No World Generated Yet</h3>
              <p>
                Enter any website URL and your mandatory Context.dev API key above, then click <b>Generate World 🚀</b> to discover pages and explore your custom 2D Minecraft-style pixel-art world.
              </p>
            </div>
          )}
        </section>

        {/* Selected Building Details Panel (Opens when walking up to a building & pressing E/Space or clicking) */}
        {selected && parsedSelected && (
          <aside className="building-inspector-modal" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
            <div className="inspector-card" onClick={e => e.stopPropagation()}>
              <div className="inspector-head">
                <div className="inspector-title">
                  <span className="inspector-icon">🏛️</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3>{selected.title}</h3>
                      <span className="district-pill">{selected.district} District</span>
                    </div>
                    {selected.fullTitle && selected.fullTitle !== selected.title && (
                      <span className="inspector-subtitle">{selected.fullTitle}</span>
                    )}
                  </div>
                </div>
                <button
                  className="close-btn"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Inspector Navigation Tabs */}
              <div className="inspector-nav-tabs">
                <button
                  type="button"
                  className={`tab-btn ${inspectorTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('overview')}
                >
                  📋 Highlights &amp; Overview
                </button>
                <button
                  type="button"
                  className={`tab-btn ${inspectorTab === 'reader' ? 'active' : ''}`}
                  onClick={() => setInspectorTab('reader')}
                >
                  📖 Read Content
                </button>
                {parsedSelected.links.length > 0 && (
                  <button
                    type="button"
                    className={`tab-btn ${inspectorTab === 'links' ? 'active' : ''}`}
                    onClick={() => setInspectorTab('links')}
                  >
                    🔗 Discovered Links ({parsedSelected.links.length})
                  </button>
                )}
                {parsedSelected.codeBlock && (
                  <button
                    type="button"
                    className={`tab-btn ${inspectorTab === 'code' ? 'active' : ''}`}
                    onClick={() => setInspectorTab('code')}
                  >
                    💻 Code Snippet
                  </button>
                )}
              </div>

              <div className="inspector-body">
                {inspectorTab === 'overview' && (
                  <>
                    {/* Detected Pricing & Plans Pills */}
                    {parsedSelected.pricingBadges.length > 0 && (
                      <div className="pricing-badges-strip">
                        <span className="badges-label">Detected Pricing &amp; Plans:</span>
                        <div className="badges-wrap">
                          {parsedSelected.pricingBadges.map((badge, idx) => (
                            <span key={idx} className="pricing-tag-pill">
                              💎 {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Executive Clean Summary */}
                    <div className="clean-summary-box">
                      <label>Page Overview:</label>
                      <p>{parsedSelected.cleanSummary || 'No summary extracted for this page.'}</p>
                    </div>

                    {/* Structured Key Highlights */}
                    {parsedSelected.highlights.length > 0 && (
                      <div className="highlights-box">
                        <label>Key Features &amp; Highlights:</label>
                        <ul className="highlights-list">
                          {parsedSelected.highlights.map((hl, idx) => (
                            <li key={idx}>
                              <span className="hl-icon">{hl.icon}</span>
                              <span className="hl-text">{hl.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {inspectorTab === 'reader' && (
                  <div className="reader-prose-box">
                    <label>Formatted Content Reader:</label>
                    <div className="prose-content">
                      {parsedSelected.renderedMarkdown.split('\n\n').map((block, idx) => {
                        const trimmed = block.trim();
                        if (!trimmed) return null;
                        if (trimmed.startsWith('# ')) {
                          return <h4 key={idx} className="prose-h1">{trimmed.replace(/^#\s+/, '')}</h4>;
                        }
                        if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
                          return <h5 key={idx} className="prose-h2">{trimmed.replace(/^#+\s+/, '')}</h5>;
                        }
                        if (/^[-*•]\s+/.test(trimmed)) {
                          const items = trimmed.split('\n').filter(Boolean);
                          return (
                            <ul key={idx} className="prose-list">
                              {items.map((it, i) => (
                                <li key={i}>{it.replace(/^[-*•]\s+/, '')}</li>
                              ))}
                            </ul>
                          );
                        }
                        return <p key={idx}>{trimmed}</p>;
                      })}
                    </div>
                  </div>
                )}

                {inspectorTab === 'links' && (
                  <div className="discovered-links-box">
                    <label>Discovered Sub-Pages &amp; Outgoing Links:</label>
                    <div className="links-grid">
                      {parsedSelected.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="discovered-link-card"
                        >
                          <span className="link-title">🔗 {link.label}</span>
                          <span className="link-url">{link.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {inspectorTab === 'code' && parsedSelected.codeBlock && (
                  <div className="code-viewer-box">
                    <div className="code-viewer-head">
                      <span>Syntax: {parsedSelected.codeBlock.language.toUpperCase()}</span>
                      <button
                        type="button"
                        className="copy-code-btn"
                        onClick={() => {
                          if (parsedSelected.codeBlock) {
                            navigator.clipboard.writeText(parsedSelected.codeBlock.code);
                          }
                        }}
                      >
                        📋 Copy Code
                      </button>
                    </div>
                    <pre>
                      <code>{parsedSelected.codeBlock.code}</code>
                    </pre>
                  </div>
                )}
              </div>

              <div className="inspector-foot">
                <div className="foot-left">
                  <a
                    className="open-url-btn"
                    href={selected.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Original Webpage <span>↗</span>
                  </a>
                  <button
                    type="button"
                    className="walk-here-btn"
                    onClick={() => jumpTo(selected)}
                    title="Teleport player directly to this building's front door"
                  >
                    🚶 Walk Character Here
                  </button>
                  <button
                    type="button"
                    className="copy-url-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(selected.url);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                  >
                    {copiedUrl ? '✓ Copied!' : '📋 Copy URL'}
                  </button>
                </div>
                <button className="dismiss-btn" onClick={() => setSelected(null)}>
                  Continue Exploring
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* In-World Search Modal (Activated with / or clicking Search on the map bar) */}
        {searchOpen && (
          <div className="search-modal-backdrop" onClick={() => setSearchOpen(false)}>
            <div className="search-modal" onClick={e => e.stopPropagation()}>
              <div className="search-modal-head">
                <span>🔍</span>
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pages and districts (press Esc to close)..."
                />
                <button className="close-btn" onClick={() => setSearchOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="search-modal-results">
                {matches.map(p => (
                  <button key={p.id} className="search-row" onClick={() => jumpTo(p)}>
                    <span className="row-icon">🏛️</span>
                    <div className="row-text">
                      <b>{p.title}</b>
                      <small>{p.district} District · {p.url}</small>
                    </div>
                    <span className="row-arrow">Walk to ↗</span>
                  </button>
                ))}
                {!matches.length && (
                  <div className="empty-results">No pages found matching "{query}".</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* World Directory Grid (Rendered when a world is active) */}
        {world && (
          <section className="directory-section">
            <div className="section-title-wrap">
              <div className="eyebrow">WORLD DIRECTORY</div>
              <h3>Discovered Pages & Buildings ({world.pages.length})</h3>
              <p>Click any location to center your character and inspect its content.</p>
            </div>

            <div className="directory-grid">
              {world.pages.map(p => (
                <div
                  key={p.id}
                  className={`directory-item ${selected?.id === p.id ? 'active' : ''}`}
                  onClick={() => jumpTo(p)}
                >
                  <div className="dir-icon">🏛️</div>
                  <div className="dir-info">
                    <h4>{p.title}</h4>
                    <span className="dir-district">{p.district}</span>
                    <p className="dir-excerpt">{p.excerpt}</p>
                  </div>
                  <span className="dir-jump">Jump ↗</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PixelWorld — Use Cases Section */}
        <section className="use-cases-section" id="use-cases">
          <div className="eyebrow">PIXELWORLD — USE CASES 🎮</div>
          <h2>Explore Any Website as a World</h2>
          <p className="use-cases-intro">
            PixelWorld transforms a website and its connected webpages into an explorable 2D pixel-art world.
            Its use cases fall into two categories: fun, creative exploration and practical navigation of information-heavy websites.
          </p>

          <div className="use-cases-grid">
            {/* 1. Explore any website as a game */}
            <article className="use-case-card">
              <div className="use-case-head">
                <span className="case-num">1</span>
                <h3>Explore any website as a game</h3>
              </div>
              <div className="case-for"><b>For:</b> Everyday internet users and gamers.</div>
              <p className="case-desc">
                Turn a website into a virtual world where users walk between buildings, discover pages, and open content by interacting with locations.
              </p>
              <div className="case-example">
                <b>Example:</b> Transform a favorite gaming website into an explorable pixel-art village.
              </div>
            </article>

            {/* 2. Navigate large documentation websites */}
            <article className="use-case-card">
              <div className="use-case-head">
                <span className="case-num">2</span>
                <h3>Navigate large documentation websites</h3>
              </div>
              <div className="case-for"><b>For:</b> Developers and technical learners.</div>
              <p className="case-desc">
                Represent tutorials, APIs, modules, and guides as connected locations, making large documentation websites easier to explore visually.
              </p>
              <div className="case-example">
                <b>Example:</b> Convert Python documentation into a world containing tutorial districts, libraries, and module workshops.
              </div>
            </article>

            {/* 3. Explore educational resources */}
            <article className="use-case-card">
              <div className="use-case-head">
                <span className="case-num">3</span>
                <h3>Explore educational resources</h3>
              </div>
              <div className="case-for"><b>For:</b> Students and educators.</div>
              <p className="case-desc">
                Turn course websites, learning portals, and online educational resources into explorable campuses, with buildings representing subjects and lessons.
              </p>
              <div className="case-example">
                <b>Example:</b> A programming course becomes a campus where each building contains a different lesson.
              </div>
            </article>

            {/* 4. Interactive portfolios */}
            <article className="use-case-card">
              <div className="use-case-head">
                <span className="case-num">4</span>
                <h3>Interactive portfolios</h3>
              </div>
              <div className="case-for"><b>For:</b> Developers, designers, artists, and creators.</div>
              <p className="case-desc">
                Transform a personal portfolio into a virtual environment where projects become buildings and external links become portals.
              </p>
              <div className="case-example">
                <b>Example:</b> A developer's portfolio becomes a world visitors can walk through to discover projects and GitHub repositories.
              </div>
            </article>

            {/* 5. Explore community websites and fan wikis */}
            <article className="use-case-card">
              <div className="use-case-head">
                <span className="case-num">5</span>
                <h3>Explore community websites and fan wikis</h3>
              </div>
              <div className="case-for"><b>For:</b> Gaming communities, fandoms, and hobby groups.</div>
              <p className="case-desc">
                Convert connected wiki pages, guides, character profiles, and community resources into a navigable world.
              </p>
              <div className="case-example">
                <b>Example:</b> A game wiki becomes a world where different regions represent characters, quests, items, and game mechanics.
              </div>
            </article>

            {/* 6. Interactive website experiences */}
            <article className="use-case-card">
              <div className="use-case-head">
                <span className="case-num">6</span>
                <h3>Interactive website experiences</h3>
              </div>
              <div className="case-for"><b>For:</b> Website owners, event organizers, and content creators.</div>
              <p className="case-desc">
                Use generated worlds for exploration challenges, digital scavenger hunts, and interactive content discovery.
              </p>
              <div className="case-example">
                <b>Example:</b> An event website becomes a map where attendees discover speakers, sessions, and resources.
              </div>
            </article>
          </div>
        </section>

        {/* Section 1: How a User Uses PixelWorld (The 5 Steps) */}
        <section className="guide-section" id="how-it-works">
          <div className="eyebrow">1. HOW A USER USES PIXELWORLD</div>
          <h2>From URL to Explorable Adventure in 5 Steps</h2>

          <div className="five-steps-grid">
            <div className="step-card">
              <span className="step-badge">1</span>
              <h4>Enter a website URL</h4>
              <p>
                Open PixelWorld and paste any website URL—such as a programming documentation site,
                university campus, or personal portfolio.
              </p>
            </div>

            <div className="step-card">
              <span className="step-badge">2</span>
              <h4>Connect Context.dev</h4>
              <p>
                Provide your own Context.dev API key (BYOK). PixelWorld uses it to discover pages,
                extract clean content, and identify links between webpages.
              </p>
            </div>

            <div className="step-card">
              <span className="step-badge">3</span>
              <h4>Generate the world</h4>
              <p>
                PixelWorld builds a graph of discovered pages and converts it into a connected map.
                Related pages are grouped into districts, and buildings represent individual webpages.
              </p>
            </div>

            <div className="step-card">
              <span className="step-badge">4</span>
              <h4>Explore and interact</h4>
              <p>
                Move a character using WASD or arrow keys. Walking up to a building and pressing E
                opens a panel showing page title, short excerpt, and a link to the original webpage.
              </p>
            </div>

            <div className="step-card">
              <span className="step-badge">5</span>
              <h4>Save and share</h4>
              <p>
                Search for pages instantly, export your generated world as JSON,
                and share worlds with other people.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: What We Are Actually Building */}
        <section className="architecture-section" id="architecture">
          <div className="eyebrow">2. WHAT WE ARE ACTUALLY BUILDING</div>
          <h2>Website-to-World Conversion Engine</h2>
          <p className="arch-intro">
            PixelWorld is not a website builder or a chatbot. It is a website-to-world conversion engine
            with four core components:
          </p>

          <div className="components-grid">
            <div className="comp-card">
              <span className="comp-num">01</span>
              <h4>Website Ingestion</h4>
              <p>Context.dev discovers and extracts permitted website content and markdown.</p>
            </div>

            <div className="comp-card">
              <span className="comp-num">02</span>
              <h4>Graph Engine</h4>
              <p>Our code identifies pages, sections, and relationships between hyperlinks.</p>
            </div>

            <div className="comp-card">
              <span className="comp-num">03</span>
              <h4>World Generator</h4>
              <p>Our algorithms place buildings, create districts, and generate road networks.</p>
            </div>

            <div className="comp-card">
              <span className="comp-num">04</span>
              <h4>Playable Interface</h4>
              <p>A browser-based 2D Minecraft-inspired game lets users explore and access original content.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer>
        <div className="footer-top">
          <a className="brand" href="#top">
            <span className="brand-icon">🎮</span>
            <span>
              pixel<span className="brand-light">world</span>
            </span>
          </a>
          <span>Make the internet feel like a world you can explore. Procedural 2D worlds powered by Phaser 3 &amp; Context.dev.</span>
          <div className="footer-links">
            <a href="https://docs.context.dev" target="_blank" rel="noreferrer">
              Context.dev Documentation ↗
            </a>
          </div>
        </div>

        {/* Operational & Legal Disclaimer */}
        <div className="footer-disclaimer">
          <p>
            <strong>Disclaimer &amp; Responsible Use:</strong> PixelWorld is an independent visualization experiment. All third-party trademarks, service marks, logos, brand names, and website contents displayed or represented as in-game buildings belong exclusively to their respective copyright holders. Website mapping and content scraping are executed via the Context.dev API using user-provided credentials (BYOK). Users are solely responsible for ensuring they have appropriate rights and authorization to crawl and visualize target URLs in compliance with website Terms of Service, robots.txt directives, and applicable data privacy regulations. PixelWorld does not host, mirror, or claim ownership over scraped external content.
          </p>
        </div>
      </footer>
    </div>
  );
}
