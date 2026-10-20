import type { Page, World, SiteCategory } from './types';

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'home';

export function detectCategory(url: string, pages: { url: string; title: string }[]): SiteCategory {
  const combined = (url + ' ' + pages.map(p => p.url + ' ' + p.title).join(' ')).toLowerCase();
  if (
    combined.includes('.edu') ||
    combined.includes('university') ||
    combined.includes('college') ||
    combined.includes('campus') ||
    combined.includes('admissions')
  ) {
    return 'university';
  }
  if (
    combined.includes('portfolio') ||
    combined.includes('resume') ||
    combined.includes('projects') ||
    combined.includes('about me') ||
    combined.includes('work experience')
  ) {
    return 'portfolio';
  }
  if (
    combined.includes('doc') ||
    combined.includes('tutorial') ||
    combined.includes('api') ||
    combined.includes('guide') ||
    combined.includes('manual') ||
    combined.includes('reference')
  ) {
    return 'documentation';
  }
  return 'general';
}

export function extractBrand(urlStr: string): string {
  try {
    const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const host = u.hostname.replace('www.', '').split('.')[0] || 'Site';
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return 'Site';
  }
}

export function formatSlugTitle(rawSlug: string, _isLegalOrDoc: boolean = false): string {
  if (!rawSlug) return 'Location';

  // 1. Strip machine code prefixes like "v1-", "doc-", "id-", "tr25-"
  let s = rawSlug.replace(/^(v\d+|doc\d+|page\d+|id\d+|tr\d+|tc\d+)[-_]/i, '');
  s = s.replace(/\.[a-z0-9]+$/i, '');

  // 2. Split words cleanly by hyphens and underscores
  const words = s.split(/[-_]+/).filter(Boolean);

  const formattedWords = words.map(w => {
    const upper = w.toUpperCase();
    if (['AI', 'API', 'SDK', 'UI', 'FAQ', 'CLI', 'SQL', 'CSS', 'HTML', 'URL'].includes(upper)) {
      return upper;
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return formattedWords.join(' ') || 'Location';
}

export function cleanTitle(rawTitle: string, rootUrl?: string, url?: string, index?: number): string {
  if (!rawTitle) return 'Building';

  const brand = extractBrand(rootUrl || url || '');

  // 1. Home / Root page
  if (index === 0) {
    return `${brand} HQ`;
  }

  let title = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

  // 2. Remove leading/trailing site name / brand prefixes like "Stripe | ", "YouTube - ", "React - "
  if (brand && brand.length > 2) {
    const brandRegexStart = new RegExp(`^${brand}\\s*([\\|\\:\\-\\—\\–•]\\s*)?`, 'i');
    title = title.replace(brandRegexStart, '').trim();
    const brandRegexEnd = new RegExp(`(\\s*[\\|\\:\\-\\—\\–•]\\s*)?${brand}\\s*$`, 'i');
    title = title.replace(brandRegexEnd, '').trim();
  }

  // Remove common generic brand separators e.g. "Page Name | Company"
  if (title.includes(' | ')) {
    const parts = title.split(' | ');
    title = parts[0].length >= 3 && parts[0].length < parts[1].length ? parts[0] : parts[1] || parts[0];
  }

  // Handle em-dash or en-dash subheadings like "Services Agreement—General Terms" -> "General Terms"
  if (title.includes('—') || title.includes('–')) {
    const parts = title.split(/[—–]/);
    const last = parts[parts.length - 1].trim();
    if (last.length >= 3 && last.length <= 26) {
      title = last;
    } else {
      title = parts[0].trim();
    }
  }

  // Handle hyphen subheadings like "Culture & Trends - Masthead Preview"
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    const last = parts[parts.length - 1].trim();
    if (last.length >= 3 && last.length <= 26) {
      title = last;
    } else {
      title = parts[0].trim();
    }
  }

  // Remove verbose boilerplate prefixes and parentheticals
  title = title
    .replace(/^Guide (for|to)\s+/i, '')
    .replace(/^Introduction to\s+/i, 'Intro: ')
    .replace(/^Overview of\s+/i, '')
    .replace(/^About\s+/i, 'About ')
    .replace(/\s*\((preview|beta|au|us|uk|eu)\)/gi, '')
    .trim();

  // If title is generic (e.g. "Service Terms", "Legal", "Agreement", "Page", "Home", "Overview"),
  // inspect the URL path to extract the actual distinctive feature or subtopic!
  const isGeneric = /^(service terms|services|legal|terms|agreement|page|overview|home|notice|culture & trends)$/i.test(title.trim());
  if (url && (isGeneric || title.length < 5)) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      const segments = u.pathname.split('/').filter(Boolean);
      const isLegal = /legal|terms|agreement/i.test(u.pathname);
      for (let s = segments.length - 1; s >= 0; s--) {
        const seg = segments[s].toLowerCase();
        if (!['legal', 'docs', 'en', 'in', 'us', 'index', 'page', 'about', 'ssa', 'trends', 'records'].includes(seg)) {
          const pretty = formatSlugTitle(seg, isLegal);
          if (pretty.length > 2) {
            title = pretty;
            break;
          }
        }
      }
    } catch {}
  }

  // Clean trailing punctuation
  title = title.replace(/[\-—–:,]+$/, '').trim();

  // Generous limit: up to 26 characters before clean word-boundary truncation (NEVER cut in the middle of a word!)
  if (title.length > 26) {
    const cut = title.slice(0, 25);
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 10) {
      title = cut.slice(0, lastSpace) + '…';
    } else {
      title = cut.slice(0, 24) + '…';
    }
  }

  return title || 'Building';
}

export function buildWorld(rawPages: Omit<Page, 'district' | 'x' | 'y'>[], rootUrl: string): World {
  const category = detectCategory(rootUrl, rawPages);

  const pages: Page[] = rawPages.map((p, i) => {
    let u: URL;
    try {
      u = new URL(p.url);
    } catch {
      u = new URL('https://' + p.url);
    }
    const path = u.pathname.toLowerCase();
    const titleLower = p.title.toLowerCase();

    let badgeIcon: Page['badgeIcon'] = 'doc';
    let buildingType: Page['buildingType'] = 'library';

    if (i === 0 || path === '/' || path === '') {
      if (category === 'university') {
        badgeIcon = 'campus';
        buildingType = 'quad';
      } else if (category === 'portfolio') {
        badgeIcon = 'landmark';
        buildingType = 'project';
      } else {
        badgeIcon = 'home';
        buildingType = 'home';
      }
    } else if (category === 'university') {
      if (path.includes('admission') || path.includes('visit') || path.includes('tour')) {
        badgeIcon = 'landmark';
        buildingType = 'guides';
      } else if (path.includes('course') || path.includes('class') || path.includes('curriculum')) {
        badgeIcon = 'book';
        buildingType = 'tutorials';
      } else if (path.includes('dept') || path.includes('faculty') || path.includes('academics')) {
        badgeIcon = 'campus';
        buildingType = 'quad';
      } else if (path.includes('research') || path.includes('lab')) {
        badgeIcon = 'gear';
        buildingType = 'examples';
      } else if (path.includes('library')) {
        badgeIcon = 'book';
        buildingType = 'library';
      } else if (path.includes('apply') || path.includes('portal') || path.includes('login')) {
        badgeIcon = 'external';
        buildingType = 'dock';
      } else {
        badgeIcon = 'doc';
        buildingType = 'guides';
      }
    } else if (category === 'portfolio') {
      if (path.includes('project') || path.includes('work') || path.includes('case-study')) {
        badgeIcon = 'project';
        buildingType = 'project';
      } else if (path.includes('about') || path.includes('bio') || path.includes('story')) {
        badgeIcon = 'landmark';
        buildingType = 'home';
      } else if (path.includes('skill') || path.includes('stack') || path.includes('tech')) {
        badgeIcon = 'gear';
        buildingType = 'examples';
      } else if (path.includes('blog') || path.includes('post') || path.includes('writing')) {
        badgeIcon = 'doc';
        buildingType = 'tutorials';
      } else if (
        path.includes('contact') ||
        path.includes('github') ||
        path.includes('social') ||
        path.includes('linkedin')
      ) {
        badgeIcon = 'external';
        buildingType = 'dock';
      } else {
        badgeIcon = 'bulb';
        buildingType = 'guides';
      }
    } else {
      // Documentation / General
      if (
        path.includes('tutorial') ||
        path.includes('start') ||
        path.includes('learn') ||
        titleLower.includes('start')
      ) {
        badgeIcon = 'book';
        buildingType = 'tutorials';
      } else if (
        path.includes('ref') ||
        path.includes('api') ||
        path.includes('lib') ||
        titleLower.includes('api')
      ) {
        badgeIcon = 'gear';
        buildingType = 'library';
      } else if (path.includes('example') || path.includes('code') || path.includes('sample')) {
        badgeIcon = 'code';
        buildingType = 'examples';
      } else if (path.includes('guide') || path.includes('how') || path.includes('recipe')) {
        badgeIcon = 'bulb';
        buildingType = 'guides';
      } else if (path.includes('faq') || path.includes('help') || path.includes('support')) {
        badgeIcon = 'help';
        buildingType = 'faqs';
      } else if (
        path.includes('new') ||
        path.includes('release') ||
        path.includes('changelog') ||
        path.includes('blog')
      ) {
        badgeIcon = 'doc';
        buildingType = 'whats_new';
      } else if (path.includes('external') || path.includes('link') || path.includes('github')) {
        badgeIcon = 'external';
        buildingType = 'dock';
      }
    }

    const fullTitle = (p.title || p.url).trim();
    const displayTitle = cleanTitle(fullTitle, rootUrl, p.url, i);

    return {
      ...p,
      fullTitle,
      title: displayTitle,
      id: p.id || `${slug(u.pathname)}-${i}`,
      district: districtFor(p.url, rootUrl, category),
      badgeIcon,
      buildingType,
      x: 0,
      y: 0,
    };
  });

  // Ensure 100% uniqueness among building titles:
  // Disambiguate duplicate titles with their URL path slug or counter
  const titleMap = new Map<string, number>();
  pages.forEach((p, idx) => {
    if (idx === 0) return; // Keep Home distinctive
    const t = p.title;
    if (titleMap.has(t)) {
      const count = (titleMap.get(t) || 1) + 1;
      titleMap.set(t, count);

      // Extract specific URL path slug cleanly without cutting words
      try {
        const u = new URL(p.url.startsWith('http') ? p.url : `https://${p.url}`);
        const segs = u.pathname.split('/').filter(Boolean);
        const lastSeg = segs.pop() || '';
        const isLegal = /legal|terms|agreement/i.test(u.pathname);
        if (lastSeg) {
          const pretty = formatSlugTitle(lastSeg, isLegal);
          if (pretty && pretty.length > 2 && pretty.toLowerCase() !== t.toLowerCase()) {
            p.title = pretty.slice(0, 26);
          } else {
            p.title = `${t} (${count})`.slice(0, 26);
          }
        } else {
          p.title = `${t} (${count})`.slice(0, 26);
        }
      } catch {
        p.title = `${t} (${count})`.slice(0, 26);
      }
    } else {
      titleMap.set(t, 1);
    }
  });

  // Village Planning Layout: Spacious, structured RPG village lots
  // Central Avenue runs at x = 24. Home sits at (24, 6).
  // Buildings are placed on generous lots (8 tiles horizontal, 6 tiles vertical spacing)
  // Distance between buildings = 256px, guaranteeing 140px+ clear lawn gap between signboards!
  const centerX = 24;
  const centerY = 6;

  if (pages[0]) {
    pages[0].x = centerX;
    pages[0].y = centerY;
  }

  // Pre-planned balanced village lots ordered from Town Plaza outwards
  const plannedLots: [number, number][] = [
    // Row 1 (y = 10): Flanking Town Plaza (open center)
    [16, 10],
    [32, 10],
    [8, 10],
    [40, 10],
    // Row 2 (y = 16): South Boulevard
    [24, 16],
    [16, 16],
    [32, 16],
    [8, 16],
    [40, 16],
    // Row 3 (y = 22): Central Quarter
    [24, 22],
    [16, 22],
    [32, 22],
    [8, 22],
    [40, 22],
    // Row 4 (y = 28): Harbor District
    [24, 28],
    [16, 28],
    [32, 28],
    [8, 28],
    [40, 28],
    // Row 5 (y = 34): Outer Boroughs
    [24, 34],
    [16, 34],
    [32, 34],
    [8, 34],
    [40, 34],
    // Row 6 (y = 40): Horizon Edge
    [24, 40],
    [16, 40],
    [32, 40],
    [8, 40],
    [40, 40],
  ];

  const otherPages = pages.slice(1);
  otherPages.forEach((p, idx) => {
    if (idx < plannedLots.length) {
      p.x = plannedLots[idx][0];
      p.y = plannedLots[idx][1];
    } else {
      // Dynamic fallback for very large sites (30+ pages)
      const extraRow = 40 + Math.floor((idx - plannedLots.length) / 5) * 6;
      const colIdx = (idx - plannedLots.length) % 5;
      const colX = [8, 16, 24, 32, 40][colIdx];
      p.x = colX;
      p.y = extraRow;
    }
  });

  // Build edges: discovered links + structural district connections
  const edges: { from: string; to: string }[] = [];
  const byUrl = new Map(pages.map(p => [normalize(p.url), p]));

  for (const p of pages) {
    for (const link of p.links || []) {
      try {
        const target = byUrl.get(normalize(new URL(link, p.url).href));
        if (target && target.id !== p.id && !edges.some(e => e.from === p.id && e.to === target.id)) {
          edges.push({ from: p.id, to: target.id });
        }
      } catch {}
    }
  }

  // Ensure traversability by connecting each page to the main hub or nearest neighbor
  const home = pages[0];
  if (home) {
    for (let i = 1; i < pages.length; i++) {
      const p = pages[i];
      if (!edges.some(e => (e.from === p.id && e.to === home.id) || (e.from === home.id && e.to === p.id))) {
        edges.push({ from: home.id, to: p.id });
      }
    }
  }

  let host = 'website';
  try {
    host = new URL(rootUrl).hostname.replace('www.', '');
  } catch {
    host = rootUrl;
  }

  let titleBanner = `${capitalize(host.split('.')[0])} World`;
  let subtitleBanner = 'Explore • Learn • Discover';

  if (category === 'university') {
    titleBanner = `${capitalize(host.split('.')[0])} Campus World`;
    subtitleBanner = 'Academics • Departments • Campus Life';
  } else if (category === 'portfolio') {
    titleBanner = `${capitalize(host.split('.')[0])} Portfolio World`;
    subtitleBanner = 'Projects • Skills • Experience';
  } else if (category === 'documentation') {
    titleBanner = `${capitalize(host.split('.')[0])} Documentation Realm`;
    subtitleBanner = 'Tutorials • References • Code Examples';
  }

  const maxX = Math.max(54, ...pages.map(p => p.x + 8));
  const maxY = Math.max(48, ...pages.map(p => p.y + 8));

  return {
    version: 1,
    name: host,
    category,
    titleBanner,
    subtitleBanner,
    rootUrl,
    createdAt: new Date().toISOString(),
    pages,
    edges,
    width: maxX,
    height: maxY,
  };
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function normalize(value: string) {
  try {
    const u = new URL(value);
    u.hash = '';
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/$/, '');
    return u.href;
  } catch {
    return value;
  }
}

function districtFor(value: string, root: string, category: SiteCategory): string {
  try {
    const u = new URL(value);
    if (u.pathname === '/' || u.pathname === '') {
      if (category === 'university') return 'Campus Quad';
      if (category === 'portfolio') return 'Main Plaza';
      return 'Home District';
    }
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first ? first.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Central';
  } catch {
    return 'District';
  }
}

// Generate world dynamically for any user URL
export function simulateWorldFromUrl(targetUrl: string, cap = 20): World {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
  } catch {
    parsed = new URL('https://' + targetUrl);
  }

  const hostname = parsed.hostname.replace('www.', '');
  const root = parsed.origin;
  const category = detectCategory(targetUrl, [{ url: targetUrl, title: hostname }]);

  const raw: Omit<Page, 'district' | 'x' | 'y'>[] = [
    {
      id: 'home',
      url: root + '/',
      title: `${capitalize(hostname.split('.')[0])} Home`,
      excerpt: `Main portal and landing page for ${hostname}. Explore connected sections and buildings.`,
      links: [],
    },
  ];

  let sectionNames: string[] = [];
  if (category === 'university') {
    sectionNames = [
      'Admissions',
      'Academics',
      'Departments',
      'Research & Labs',
      'Campus Life',
      'Library & Archives',
      'Alumni Portal',
      'Athletics',
    ];
  } else if (category === 'portfolio') {
    sectionNames = [
      'Projects Showcase',
      'Tech Stack & Skills',
      'Work Experience',
      'Case Studies',
      'Blog & Articles',
      'Contact & Socials',
      'Portals',
    ];
  } else if (category === 'documentation') {
    sectionNames = [
      'Getting Started',
      'Core Architecture',
      'API Reference',
      'Code Examples',
      'Tutorials',
      'HOWTO Guides',
      'Community & FAQ',
    ];
  } else {
    sectionNames = [
      'Products',
      'Features',
      'Pricing',
      'Documentation',
      'About Us',
      'Blog & News',
      'Support Center',
      'Community',
    ];
  }

  const numPages = Math.min(cap, sectionNames.length + 1);
  for (let i = 1; i < numPages; i++) {
    const sec = sectionNames[i - 1];
    const pSlug = sec.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    raw.push({
      id: pSlug,
      url: `${root}/${pSlug}`,
      title: sec,
      excerpt: `Explore the ${sec} section of ${hostname}. Interactive content and discovered resources.`,
      links: [raw[0].url],
    });
    raw[0].links.push(`${root}/${pSlug}`);
  }

  return buildWorld(raw, root);
}
