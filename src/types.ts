export type SiteCategory = 'documentation' | 'university' | 'portfolio' | 'general';

export type Page = {
  id: string;
  url: string;
  title: string;
  fullTitle?: string;
  excerpt: string;
  markdown?: string;
  links: string[];
  district: string;
  x: number;
  y: number;
  failed?: boolean;
  badgeIcon?: 'book' | 'gear' | 'code' | 'bulb' | 'help' | 'doc' | 'external' | 'home' | 'landmark' | 'project' | 'campus';
  buildingType?: 'home' | 'tutorials' | 'library' | 'examples' | 'whats_new' | 'guides' | 'faqs' | 'dock' | 'quad' | 'project';
  codeSnippet?: string;
  subtopics?: string[];
  quest?: {
    title: string;
    objective: string;
    reward: string;
    completed?: boolean;
  };
  visited?: boolean;
};

export type World = {
  version: 1;
  name: string;
  category: SiteCategory;
  titleBanner: string;
  subtitleBanner: string;
  rootUrl: string;
  createdAt: string;
  pages: Page[];
  edges: { from: string; to: string }[];
  width: number;
  height: number;
};
