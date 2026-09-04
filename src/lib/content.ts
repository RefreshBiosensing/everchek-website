// Content engine: every page is an ordered section list in a YAML file.
//
//   content/pages/<locale>/<name>.yaml   — one page per file, fully independent
//                                          per locale (count/order/variants free)
//   content/i18n/<locale>.yaml           — UI dictionary (nav/footer/forms);
//                                          components must never hardcode copy
//
// Pages across locales are linked by `translationKey`, which drives hreflang.
// Localised slugs: each page carries its own `path` (e.g. /es/lavado-de-.../).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const CONTENT_DIR = join(process.cwd(), 'content');

export interface PageEntry {
  /** Locale folder the file came from, e.g. "en" */
  locale: string;
  /** File name without extension — the CMS entry id, not the URL */
  id: string;
  /** URL path, localised, always with leading + trailing slash, e.g. "/products/x/" */
  path: string;
  title: string;
  description: string;
  /** Links this page to its siblings in other locales (drives hreflang) */
  translationKey?: string;
  noindex?: boolean;
  /** "product" adds Product JSON-LD */
  schemaType?: string;
  sections: any[];
}

export interface Alternate {
  locale: string;
  path: string;
}

const normalisePath = (p: string): string => {
  if (!p) return '/';
  let out = p.trim();
  if (!out.startsWith('/')) out = '/' + out;
  if (!out.endsWith('/')) out += '/';
  return out;
};

// Sveltia/Netlify-style YAML is edited by humans. Natural SEO prose often uses
// an English colon followed by a space ("story: continuous monitoring"), which
// is invalid in an unquoted YAML plain scalar. Instead of letting one missed
// quote break the whole Cloudflare deploy, retry parsing after quoting only
// simple one-line scalar values that contain prose colons. URLs such as
// https://example.com are unaffected because they do not contain ": ".
const quotePlainScalarsWithProseColons = (raw: string): string =>
  raw
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*[A-Za-z0-9_-]+:\s+)(.+)$/);
      if (!match) return line;
      const [, prefix, value] = match;
      const trimmed = value.trim();
      if (!trimmed.includes(': ')) return line;
      if (/^['"|>{}\[\]&*!@`]/.test(trimmed)) return line;
      return `${prefix}${JSON.stringify(trimmed)}`;
    })
    .join('\n');

const parseContentYaml = (raw: string, label: string): any => {
  try {
    return parse(raw);
  } catch (firstError) {
    const repaired = quotePlainScalarsWithProseColons(raw);
    if (repaired !== raw) {
      try {
        return parse(repaired);
      } catch {
        // Fall through to the original, more useful parser location.
      }
    }
    throw new Error(`YAML 解析失败: ${label} — ${(firstError as Error).message}`);
  }
};

let pagesCache: PageEntry[] | null = null;

/** All pages across all locales. Cached per build. */
export function loadAllPages(): PageEntry[] {
  if (pagesCache) return pagesCache;
  const pagesRoot = join(CONTENT_DIR, 'pages');
  const out: PageEntry[] = [];
  if (!existsSync(pagesRoot)) return (pagesCache = out);

  // Pages may sit in sub-folders (content/pages/en/blog/*.yaml), so walk the tree.
  // The entry id keeps the sub-path ("blog/cgm-vs-bgm") to stay unique and to
  // match the folder the CMS writes back to.
  const walk = (dir: string, prefix = ''): string[] => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return []; // not a directory
    }
    const found: string[] = [];
    for (const e of entries) {
      if (e.isDirectory()) found.push(...walk(join(dir, e.name), `${prefix}${e.name}/`));
      else if (e.name.endsWith('.yaml') || e.name.endsWith('.yml')) found.push(prefix + e.name);
    }
    return found;
  };

  for (const locale of readdirSync(pagesRoot)) {
    const dir = join(pagesRoot, locale);
    const files = walk(dir);
    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf8');
      const data = parseContentYaml(raw, `content/pages/${locale}/${file}`);
      if (!data || typeof data !== 'object') continue;
      out.push({
        locale,
        id: file.replace(/\.ya?ml$/, ''),
        path: normalisePath(data.path),
        title: data.title ?? '',
        description: data.description ?? '',
        translationKey: data.translationKey,
        noindex: !!data.noindex,
        schemaType: data.schemaType,
        sections: Array.isArray(data.sections) ? data.sections : [],
      });
    }
  }

  // Duplicate paths are a build error — two pages can't own one URL.
  const seen = new Map<string, string>();
  for (const p of out) {
    const prev = seen.get(p.path);
    if (prev) throw new Error(`路径冲突: ${p.path} 同时出现在 ${prev} 和 ${p.locale}/${p.id}`);
    seen.set(p.path, `${p.locale}/${p.id}`);
  }

  return (pagesCache = out);
}

export interface ArticleNeighbours {
  /** The next article down the list — older. */
  prev?: { title: string; href: string };
  /** The next article up the list — newer. */
  next?: { title: string; href: string };
}

/**
 * Previous/next article for the foot of an article page.
 *
 * The order is the blog index's own `posts` list, exactly as the original site
 * drove its article nav from blog-data.json — so adding a post in the CMS moves
 * the links on every neighbouring article without touching them.
 */
export function articleNeighbours(path: string, locale: string): ArticleNeighbours {
  const index = loadAllPages().find(
    (p) => p.locale === locale && p.sections.some((s: any) => s?.type === 'blog-index'),
  );
  const posts: any[] = index?.sections.find((s: any) => s?.type === 'blog-index')?.posts ?? [];
  const i = posts.findIndex((post) => normalisePath(post?.href) === normalisePath(path));
  if (i < 0) return {};
  const link = (post: any) => (post ? { title: String(post.title), href: normalisePath(post.href) } : undefined);
  return { prev: link(posts[i + 1]), next: link(posts[i - 1]) };
}

/** Sibling pages in other locales that share this page's translationKey. */
export function alternatesFor(page: PageEntry): Alternate[] {
  if (!page.translationKey) return [];
  return loadAllPages()
    .filter((p) => p.translationKey === page.translationKey)
    .map((p) => ({ locale: p.locale, path: p.path }));
}

const dictCache = new Map<string, any>();

/** UI dictionary for a locale; falls back to en for missing files. */
export function loadDict(locale: string): any {
  if (dictCache.has(locale)) return dictCache.get(locale);
  const tryFiles = [
    join(CONTENT_DIR, 'i18n', `${locale}.yaml`),
    join(CONTENT_DIR, 'i18n', 'en.yaml'),
  ];
  for (const f of tryFiles) {
    if (existsSync(f)) {
      const dict = parseContentYaml(readFileSync(f, 'utf8'), f.replace(`${CONTENT_DIR}/`, 'content/'));
      dictCache.set(locale, dict);
      return dict;
    }
  }
  throw new Error(`缺少 UI 词典: content/i18n/${locale}.yaml（en.yaml 兜底也不存在）`);
}
