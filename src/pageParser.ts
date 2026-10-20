import type { Page } from './types';

export interface PageHighlight {
  icon: string;
  text: string;
}

export interface ParsedPageData {
  cleanSummary: string;
  highlights: PageHighlight[];
  pricingBadges: string[];
  codeBlock?: { code: string; language: string };
  links: { url: string; label: string }[];
  renderedMarkdown: string;
}

/**
 * Cleans messy raw text from Context.dev crawls, removing escaped newlines (\\ \\),
 * raw markdown links, and unformatted syntax, extracting structured highlights,
 * pricing pills, and clean paragraphs.
 */
export function parsePageData(page: Page): ParsedPageData {
  const rawExcerpt = page.excerpt || '';
  const rawMarkdown = page.markdown || '';

  // 1. Clean backslashes & escaped markdown artifacts
  const cleanText = (rawExcerpt || rawMarkdown)
    .replace(/\\\\\s*\\\\/g, '\n\n')
    .replace(/\\\\/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();

  // 2. Extract Pricing & Tiers if available
  const pricingBadges: string[] = [];
  const priceMatches = cleanText.match(/(\$[0-9]+(\/[a-z]+)?|Free(\s+For\s+[A-Za-z]+)?|[0-9]+%\s+discount|Monthly|Annual|Enterprise|Pro Plan)/gi);
  if (priceMatches) {
    const seen = new Set<string>();
    for (const p of priceMatches) {
      const normalized = p.trim();
      const lower = normalized.toLowerCase();
      if (!seen.has(lower) && seen.size < 5) {
        seen.add(lower);
        pricingBadges.push(normalized);
      }
    }
  }

  // 3. Extract Code Blocks (```lang ... ```)
  let codeBlock: { code: string; language: string } | undefined;
  if (page.codeSnippet) {
    codeBlock = { code: page.codeSnippet.trim(), language: 'typescript' };
  } else if (rawMarkdown.includes('```')) {
    const match = rawMarkdown.match(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
    if (match) {
      codeBlock = {
        language: match[1] || 'text',
        code: match[2].trim(),
      };
    }
  }

  // 4. Extract Key Highlights & Features
  const highlights: PageHighlight[] = [];
  const seenHighlights = new Set<string>();

  const addHighlight = (text: string, icon = '✓') => {
    const cleaned = text
      .replace(/^[-*•\d.]+\s*/, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\(https?:\/\/[^\s\)]+\)/g, '')
      .trim();

    if (cleaned.length >= 6 && cleaned.length <= 140 && !seenHighlights.has(cleaned.toLowerCase())) {
      seenHighlights.add(cleaned.toLowerCase());
      highlights.push({ icon, text: cleaned });
    }
  };

  // Check markdown bullet points first
  if (rawMarkdown) {
    const listLines = rawMarkdown.split('\n');
    for (const line of listLines) {
      const trimmed = line.trim();
      if (/^[-*•]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
        addHighlight(trimmed, '✓');
        if (highlights.length >= 6) break;
      }
    }
  }

  // If no markdown bullets or few, parse "Includes:", "Features:", or comma-separated lists in excerpt
  if (highlights.length < 3 && cleanText) {
    const featureIdx = cleanText.search(/includes:|features:|key benefits:|highlights:/i);
    if (featureIdx !== -1) {
      const featureSegment = cleanText.slice(featureIdx).replace(/^(includes:|features:|key benefits:|highlights:)\s*/i, '');
      const parts = featureSegment.split(/[,;\n]/).filter(s => s.trim().length > 3);
      for (const part of parts) {
        addHighlight(part, '✓');
        if (highlights.length >= 6) break;
      }
    }
  }

  // Fallback: Split sentences into clear key takeaway bullet points
  if (highlights.length < 2 && cleanText) {
    const sentences = cleanText
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\(https?:\/\/[^\s\)]+\)/g, '')
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 15 && s.trim().length < 160);

    for (const s of sentences.slice(0, 4)) {
      addHighlight(s, '◆');
    }
  }

  // 5. Clean Executive Summary
  const summary = cleanText
    // Remove raw markdown links [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove bare URLs in parentheses
    .replace(/\(https?:\/\/[^\s\)]+\)/g, '')
    // Normalize spaces and clean line breaks
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If the summary is long, take the first 2-3 readable paragraphs
  const paragraphs = summary.split('\n\n').filter(p => p.trim().length > 0);
  const cleanSummary = paragraphs.slice(0, 2).join('\n\n') || summary.slice(0, 320);

  // 6. Clean Discovered Sublinks
  const cleanLinks: { url: string; label: string }[] = [];
  const rawLinks = page.links || [];
  const seenLinks = new Set<string>();

  for (const l of rawLinks) {
    if (!l || seenLinks.has(l) || seenLinks.size >= 12) continue;
    seenLinks.add(l);
    try {
      const u = new URL(l.startsWith('http') ? l : `https://${l}`);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      const segs = u.pathname.split('/').filter(Boolean);
      const label = segs.length > 0
        ? segs[segs.length - 1].replace(/[-_]/g, ' ').replace(/\.[a-z0-9]+$/i, '')
        : u.hostname;
      cleanLinks.push({
        url: u.href,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      });
    } catch {
      // Ignore unparseable or malformed URLs
    }
  }

  return {
    cleanSummary,
    highlights,
    pricingBadges,
    codeBlock,
    links: cleanLinks,
    renderedMarkdown: rawMarkdown || cleanText,
  };
}
