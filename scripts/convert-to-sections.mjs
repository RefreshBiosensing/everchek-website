// One-time migration: src/locales/en/*.json  →  content/pages/en/*.yaml
// Every page becomes an ordered section list; all SEO copy carries over verbatim.
// Also emits content/i18n/en.yaml (nav/footer/forms dictionary).
//
// Run: node scripts/convert-to-sections.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';

const SRC = 'src/locales/en';
const OUT = 'content/pages/en';
const I18N = 'content/i18n';
mkdirSync(OUT, { recursive: true });
mkdirSync(I18N, { recursive: true });

const J = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

const home = J('home.json');
const product = J('product.json');
const productPages = J('product-pages.json');
const solutions = J('solutions.json');
const solutionPages = J('solution-pages.json');
const business = J('business.json');
const businessPages = J('business-pages.json');
const oem = J('oem.json');
const distributors = J('distributors.json');
const cases = J('cases.json');
const casePages = J('case-pages.json');
const about = J('about.json');
const contact = J('contact.json');
const common = J('common.json');
const blocksDemo = J('blocks-demo.json');

let written = 0;
const page = (id, data) => {
  writeFileSync(join(OUT, `${id}.yaml`), stringify(data, { lineWidth: 0 }));
  written++;
};

// helpers
const deepSec = (d) => d && { type: 'richtext', eyebrow: d.eyebrow, title: d.title, blocks: d.blocks, tint: true };
const faqSec = (f) => f && { type: 'faq', title: f.title, items: f.items };
const cta = () => ({ type: 'cta-banner' });
const compact = (arr) => arr.filter(Boolean);
// Old free-blocks arrays already use renderer-compatible type names; pass through.
const extraBlocks = (obj) => (Array.isArray(obj?.blocks) ? obj.blocks : []);

/* ─────────────────────────── home ─────────────────────────── */
page('home', {
  title: home.meta.title,
  description: home.meta.description,
  path: '/',
  translationKey: 'home',
  sections: compact([
    {
      type: 'hero', variant: 'split', visual: 'device-collage',
      kicker: home.hero.eyebrow,
      title: home.hero.title, sub: home.hero.sub,
      buttons: [
        { label: home.hero.primary, href: '/contact/?type=quote' },
        { label: home.hero.secondary, href: '/products/p20-wireless-thermometer/', style: 'ghost' },
      ],
      stats: home.hero.stats,
    },
    home.trustbar && { type: 'trustbar', label: home.trustbar.label, items: home.trustbar.items },
    home.ecosystem && {
      type: 'card-grid', center: true, columns: 3,
      eyebrow: home.ecosystem.eyebrow, title: home.ecosystem.title, text: home.ecosystem.sub,
      items: home.ecosystem.items.map((it, i) => ({
        icon: ['sensor', 'phone', 'terminal'][i], title: it.title, text: it.desc,
        href: it.href, linkLabel: it.linkLabel,
      })),
    },
    home.b2b && {
      type: 'card-grid', dark: true, columns: 3,
      eyebrow: home.b2b.eyebrow, title: home.b2b.title, text: home.b2b.sub,
      items: home.b2b.cards.map((it, i) => ({
        icon: ['console', 'handshake', 'factory'][i], title: it.title, text: it.desc,
        href: it.href, linkLabel: it.linkLabel,
      })),
    },
    home.solutions && {
      type: 'card-grid', columns: 4,
      eyebrow: home.solutions.eyebrow, title: home.solutions.title, text: home.solutions.sub,
      items: home.solutions.items.map((it, i) => ({
        icon: ['baby', 'heart', 'hospital', 'flower'][i], title: it.title, text: it.desc, href: it.href,
      })),
      moreLink: { label: home.solutions.linkLabel ?? 'All solutions', href: '/solutions/' },
    },
    home.cases && {
      type: 'card-grid', columns: 3, tint: true,
      eyebrow: home.cases.eyebrow, title: home.cases.title,
      items: home.cases.items.map((it, i) => ({
        icon: ['snow', 'shield', 'alert'][i], title: it.title, text: it.desc, href: it.href,
      })),
      moreLink: { label: home.cases.linkLabel ?? 'Read the case studies', href: '/resources/case-studies/' },
    },
    home.trust && {
      type: 'card-grid', columns: 3,
      eyebrow: home.trust.eyebrow, title: home.trust.title,
      items: home.trust.items.map((it, i) => ({
        icon: ['shield', 'factory', 'data'][i], title: it.title, text: it.desc,
      })),
    },
    deepSec(home.deep),
    faqSec(home.faq),
    ...extraBlocks(home),
    cta(),
  ]),
});

/* ─────────────────── product main page ─────────────────── */
page('p20-wireless-thermometer', {
  title: product.meta.title,
  description: product.meta.description,
  path: '/products/p20-wireless-thermometer/',
  translationKey: 'p20-wireless-thermometer',
  schemaType: 'product',
  sections: compact([
    {
      type: 'hero', variant: 'split', visual: 'product-tiles',
      eyebrow: product.hero.kicker,
      title: product.hero.title, sub: product.hero.sub,
      badges: product.hero.badges,
      kit: product.hero.kit,
      buttons: [
        { label: product.hero.primary, href: '/contact/?type=quote' },
        { label: product.hero.secondary, href: '/contact/', style: 'ghost' },
      ],
      note: product.hero.note,
      visualLabels: product.hero.visuals,
    },
    { type: 'stats-row', items: product.specs },
    product.night && {
      type: 'timeline', dark: true,
      title: product.night.title, sub: product.night.sub, items: product.night.items,
    },
    product.features && {
      type: 'feature-rows',
      eyebrow: product.features.eyebrow, title: product.features.title,
      items: product.features.items.map((f) => ({
        id: f.id, tag: f.tag, title: f.title, desc: f.desc, bullets: f.bullets, visual: f.visual,
      })),
    },
    product.compare && {
      type: 'compare-table', tint: true,
      title: product.compare.title,
      columns: [product.compare.colP20, product.compare.colEar, product.compare.colMercury],
      highlight: 0,
      rows: product.compare.rows.map((r) => ({
        label: r.label,
        cells: [r.p20, r.ear, r.merc].map(([state, text]) => ({ state, text })),
      })),
    },
    product.scenarios && {
      type: 'card-grid', columns: 4,
      title: product.scenarios.title,
      items: product.scenarios.items.map((it, i) => ({
        icon: ['baby', 'briefcase', 'users', 'flower'][i], kicker: it.who, title: it.title, text: it.desc,
      })),
    },
    product.howto && {
      type: 'step-flow', columns: 3, center: true, tint: true,
      title: product.howto.title,
      items: product.howto.steps.map((s, i) => ({
        icon: ['patch', 'phone', 'moon'][i], title: s.title, desc: s.desc,
      })),
    },
    product.certifications && {
      type: 'card-grid', columns: 4,
      title: product.certifications.title,
      items: product.certifications.items.map((it, i) => ({
        icon: ['shield', 'doc', 'factory', 'data'][i], title: it.title, text: it.desc,
      })),
      note: product.certifications.note,
    },
    product.b2bBanner && {
      type: 'banner-wide',
      title: product.b2bBanner.title, text: product.b2bBanner.sub,
      cta: { label: product.b2bBanner.primary, href: '/contact/' },
      cta2: { label: product.b2bBanner.secondary, href: '/business/monitoring-system/' },
    },
    deepSec(product.deep),
    faqSec(product.faq),
    ...extraBlocks(product),
    cta(),
  ]),
});

/* ─────────────────── product subpages ─────────────────── */
const sub = productPages;

page('companion-app', {
  title: sub.app.meta.title, description: sub.app.meta.description,
  path: '/products/companion-app/', translationKey: 'companion-app',
  sections: compact([
    {
      type: 'hero', variant: 'split', visual: 'phone-panel',
      eyebrow: sub.app.hero.kicker, title: sub.app.hero.title, sub: sub.app.hero.sub,
      buttons: [
        { label: 'Request a Quote', href: '/contact/?type=quote' },
        { label: 'See the sensor', href: '/products/p20-wireless-thermometer/', style: 'ghost' },
      ],
    },
    sub.app.features && {
      type: 'card-grid', columns: 3, tint: true,
      items: sub.app.features.map((f) => ({ icon: f.icon, title: f.title, text: f.desc })),
    },
    sub.app.steps && {
      type: 'step-flow', columns: 3, center: true,
      title: sub.app.steps.title,
      items: sub.app.steps.items.map((s) => ({ title: s.title, desc: s.desc })),
    },
    deepSec(sub.app.deep),
    faqSec(sub.app.faq),
    ...extraBlocks(sub.app),
    cta(),
  ]),
});

page('bedside-terminal', {
  title: sub.terminal.meta.title, description: sub.terminal.meta.description,
  path: '/products/bedside-terminal/', translationKey: 'bedside-terminal',
  sections: compact([
    {
      type: 'hero', variant: 'split', visual: 'terminal-panel',
      eyebrow: sub.terminal.hero.kicker, title: sub.terminal.hero.title, sub: sub.terminal.hero.sub,
      buttons: [
        { label: 'Request a Quote', href: '/contact/?type=quote' },
        { label: 'See the sensor', href: '/products/p20-wireless-thermometer/', style: 'ghost' },
      ],
    },
    sub.terminal.features && {
      type: 'card-grid', columns: 2, tint: true,
      items: sub.terminal.features.map((f) => ({ icon: f.icon, title: f.title, text: f.desc })),
    },
    sub.terminal.audience && {
      type: 'card-grid', columns: 3, media: 'none', center: true,
      title: sub.terminal.audience.title,
      items: sub.terminal.audience.items.map((a) => ({ title: a.title, text: a.desc })),
    },
    deepSec(sub.terminal.deep),
    faqSec(sub.terminal.faq),
    ...extraBlocks(sub.terminal),
    cta(),
  ]),
});

page('how-it-works', {
  title: sub.howItWorks.meta.title, description: sub.howItWorks.meta.description,
  path: '/products/how-it-works/', translationKey: 'how-it-works',
  sections: compact([
    {
      type: 'hero',
      eyebrow: sub.howItWorks.hero.kicker,
      title: sub.howItWorks.hero.title, sub: sub.howItWorks.hero.sub,
    },
    sub.howItWorks.steps && {
      type: 'step-flow', columns: 4,
      items: sub.howItWorks.steps.map((s) => ({ icon: s.icon, title: s.title, desc: s.desc })),
    },
    sub.howItWorks.tech && {
      type: 'card-grid', columns: 3, media: 'none', tint: true,
      title: sub.howItWorks.tech.title,
      items: sub.howItWorks.tech.items.map((t) => ({ title: t.title, text: t.desc })),
    },
    sub.howItWorks.battery && {
      type: 'banner-wide',
      title: sub.howItWorks.battery.title, text: sub.howItWorks.battery.desc,
    },
    deepSec(sub.howItWorks.deep),
    faqSec(sub.howItWorks.faq),
    ...extraBlocks(sub.howItWorks),
    cta(),
  ]),
});

page('compare', {
  title: sub.compare.meta.title, description: sub.compare.meta.description,
  path: '/products/compare/', translationKey: 'compare',
  sections: compact([
    {
      type: 'hero',
      eyebrow: sub.compare.hero.kicker,
      title: sub.compare.hero.title, sub: sub.compare.hero.sub,
    },
    product.compare && {
      type: 'compare-table',
      columns: [product.compare.colP20, product.compare.colEar, product.compare.colMercury],
      highlight: 0,
      rows: product.compare.rows.map((r) => ({
        label: r.label,
        cells: [r.p20, r.ear, r.merc].map(([state, text]) => ({ state, text })),
      })),
    },
    sub.compare.verdict && {
      type: 'richtext', tint: true,
      title: sub.compare.verdict.title,
      blocks: [{ text: sub.compare.verdict.desc }],
    },
    { type: 'link-pills', label: 'Next', items: [
      { label: 'Explore the P20', href: '/products/p20-wireless-thermometer/' },
      { label: 'Request a Quote', href: '/contact/?type=quote' },
    ] },
    deepSec(sub.compare.deep),
    faqSec(sub.compare.faq),
    ...extraBlocks(sub.compare),
    cta(),
  ]),
});

page('certifications', {
  title: sub.certifications.meta.title, description: sub.certifications.meta.description,
  path: '/products/certifications/', translationKey: 'certifications',
  sections: compact([
    {
      type: 'hero',
      eyebrow: sub.certifications.hero.kicker,
      title: sub.certifications.hero.title, sub: sub.certifications.hero.sub,
    },
    product.certifications && {
      type: 'card-grid', columns: 4,
      items: product.certifications.items.map((c, i) => ({
        icon: ['shield', 'doc', 'factory', 'data'][i], title: c.title, text: c.desc,
      })),
    },
    sub.certifications.quality && {
      type: 'card-grid', columns: 3, media: 'none', tint: true,
      title: sub.certifications.quality.title,
      items: sub.certifications.quality.items.map((q) => ({ title: q.title, text: q.desc })),
    },
    sub.certifications.regulatory && {
      type: 'banner-wide',
      title: sub.certifications.regulatory.title, text: sub.certifications.regulatory.desc,
      cta: { label: 'Contact our team', href: '/contact/' },
    },
    deepSec(sub.certifications.deep),
    faqSec(sub.certifications.faq),
    ...extraBlocks(sub.certifications),
    cta(),
  ]),
});

/* ─────────────────── solutions hub + 7 pages ─────────────────── */
page('solutions', {
  title: solutions.meta.title, description: solutions.meta.description,
  path: '/solutions/', translationKey: 'solutions',
  sections: compact([
    { type: 'hero', eyebrow: solutions.hero.eyebrow, title: solutions.hero.title, sub: solutions.hero.sub },
    solutions.byUser && {
      type: 'card-grid', columns: 3,
      title: solutions.byUser.title,
      items: solutions.byUser.items.map((it, i) => ({
        icon: ['baby', 'heart', 'flower'][i], kicker: it.who, title: it.title, text: it.desc,
        href: `/solutions/${{ baby: 'baby-child-fever', elderly: 'elderly-care', 'womens-health': 'womens-health-fertility' }[it.id] ?? it.id}/`,
        linkLabel: 'Explore this solution',
      })),
    },
    solutions.bySetting && {
      type: 'card-grid', columns: 4, tint: true,
      title: solutions.bySetting.title,
      items: solutions.bySetting.items.map((it, i) => ({
        icon: ['home', 'hospital', 'school', 'building'][i], kicker: it.who, title: it.title, text: it.desc,
        href: `/solutions/${{ home: 'home-monitoring', hospital: 'hospital-clinic', school: 'school-workplace', 'senior-living': 'senior-living' }[it.id] ?? it.id}/`,
        linkLabel: 'Explore this solution',
      })),
    },
    deepSec(solutions.deep),
    faqSec(solutions.faq),
    ...extraBlocks(solutions),
    cta(),
  ]),
});

for (const p of solutionPages.pages) {
  page(p.slug, {
    title: p.meta.title, description: p.meta.description,
    path: `/solutions/${p.slug}/`, translationKey: p.slug,
    sections: compact([
      {
        type: 'hero',
        eyebrow: `Solutions · ${p.category}`,
        title: p.hero.title, sub: p.hero.sub,
        buttons: [
          { label: solutionPages.shared.primaryCta, href: '/contact/?type=quote' },
          { label: solutionPages.shared.secondaryCta, href: '/contact/', style: 'ghost' },
        ],
      },
      p.problem && { type: 'text-checks', title: p.problem.title, text: p.problem.desc, points: p.problem.points },
      p.helps && {
        type: 'card-grid', columns: 3, tint: true, center: true,
        title: p.helpsTitle,
        items: p.helps.map((h) => ({ icon: h.icon, title: h.title, text: h.desc })),
      },
      p.extra && { type: 'checklist', title: p.extra.title, items: p.extra.points },
      deepSec(p.deep),
      faqSec(p.faq),
      p.related && { type: 'link-pills', label: solutionPages.shared.relatedTitle, items: p.related },
      ...extraBlocks(p),
      cta(),
    ]),
  });
}

/* ─────────────────── business ─────────────────── */
page('monitoring-system', {
  title: business.meta.title, description: business.meta.description,
  path: '/business/monitoring-system/', translationKey: 'monitoring-system',
  sections: compact([
    {
      type: 'hero', variant: 'split', visual: 'ward-dashboard',
      eyebrow: business.hero.eyebrow,
      title: business.hero.title, sub: business.hero.sub,
      buttons: [{ label: business.hero.primary, href: '/contact/?type=deployment' }],
      stats: business.hero.stats,
    },
    business.how && {
      type: 'step-flow', columns: 4, center: true,
      title: business.how.title,
      items: business.how.steps.map((s, i) => ({
        icon: ['sensor', 'wifi', 'cloud', 'console'][i], title: s.title, desc: s.desc,
      })),
    },
    business.benefits && {
      type: 'card-grid', columns: 4, tint: true,
      title: business.benefits.title,
      items: business.benefits.items.map((it, i) => ({
        icon: ['clock', 'curve', 'doc', 'shield'][i], title: it.title, text: it.desc,
      })),
    },
    business.clinical && {
      type: 'text-checks', title: business.clinical.title, text: business.clinical.sub, points: business.clinical.points,
    },
    business.cta && {
      type: 'banner-wide', title: business.cta.title, text: business.cta.sub,
      cta: { label: business.cta.primary, href: '/contact/?type=deployment' },
    },
    deepSec(business.deep),
    faqSec(business.faq),
    ...extraBlocks(business),
    cta(),
  ]),
});

for (const p of businessPages.pages) {
  const secs = (p.sections ?? []).map((sec) => {
    if (sec.type === 'steps') {
      return { type: 'step-flow', columns: 4, title: sec.title, items: sec.items.map((i) => ({ title: i.title, desc: i.desc })) };
    }
    if (sec.type === 'cards') {
      return { type: 'card-grid', columns: sec.items.length === 3 ? 3 : 4, tint: true, title: sec.title, items: sec.items.map((i) => ({ icon: i.icon, title: i.title, text: i.desc })) };
    }
    if (sec.type === 'checks') {
      return { type: 'checklist', title: sec.title, items: sec.items.map((i) => i.desc) };
    }
    return null;
  });
  page(p.slug, {
    title: p.meta.title, description: p.meta.description,
    path: `/business/${p.slug}/`, translationKey: p.slug,
    sections: compact([
      {
        type: 'hero',
        eyebrow: p.category,
        title: p.hero.title, sub: p.hero.sub,
        buttons: [
          { label: businessPages.shared.primaryCta, href: '/contact/' },
          { label: businessPages.shared.secondaryCta, href: '/contact/?type=quote', style: 'ghost' },
        ],
      },
      ...secs,
      deepSec(p.deep),
      faqSec(p.faq),
      p.related && { type: 'link-pills', items: p.related },
      ...extraBlocks(p),
      cta(),
    ]),
  });
}

page('oem-odm', {
  title: oem.meta.title, description: oem.meta.description,
  path: '/business/oem-odm/', translationKey: 'oem-odm',
  sections: compact([
    {
      type: 'hero',
      eyebrow: oem.hero.eyebrow, title: oem.hero.title, sub: oem.hero.sub,
      buttons: [
        { label: oem.hero.primary, href: '/contact/?type=oem' },
        { label: oem.hero.secondary, href: '/contact/', style: 'ghost' },
      ],
    },
    oem.offerings && {
      type: 'feature-rows',
      title: oem.offerings.title,
      items: oem.offerings.items.map((it, i) => ({
        id: it.id, title: it.title, desc: it.desc, bullets: it.points,
        visual: ['box', 'cog', 'phone', 'factory'][i],
      })),
    },
    oem.capability && { type: 'checklist', title: oem.capability.title, items: oem.capability.points, panel: true, tint: true },
    oem.process && {
      type: 'step-flow', columns: 4,
      title: oem.process.title,
      items: oem.process.steps.map((s) => ({ title: s.title, desc: s.desc })),
    },
    oem.cta && {
      type: 'banner-wide', title: oem.cta.title, text: oem.cta.sub,
      cta: { label: oem.cta.primary, href: '/contact/?type=oem' },
    },
    deepSec(oem.deep),
    faqSec(oem.faq),
    ...extraBlocks(oem),
    cta(),
  ]),
});

page('distributors', {
  title: distributors.meta.title, description: distributors.meta.description,
  path: '/business/distributors/', translationKey: 'distributors',
  sections: compact([
    {
      type: 'hero',
      eyebrow: distributors.hero.eyebrow, title: distributors.hero.title, sub: distributors.hero.sub,
      buttons: [
        { label: distributors.hero.primary ?? 'Business Enquiry', href: '/contact/?type=distribution' },
        { label: distributors.hero.secondary ?? 'Request a Quote', href: '/contact/?type=quote', style: 'ghost' },
      ],
    },
    distributors.why && {
      type: 'card-grid', columns: 4,
      title: distributors.why.title,
      items: distributors.why.items.map((it, i) => ({
        icon: ['globe', 'chart', 'handshake', 'box'][i], title: it.title, text: it.desc,
      })),
    },
    distributors.model && { type: 'checklist', title: distributors.model.title, items: distributors.model.points, panel: true, tint: true },
    distributors.fit && { type: 'checklist', title: distributors.fit.title, items: distributors.fit.points },
    distributors.cta && {
      type: 'banner-wide', title: distributors.cta.title, text: distributors.cta.sub,
      cta: { label: distributors.cta.primary, href: '/contact/?type=distribution' },
    },
    deepSec(distributors.deep),
    faqSec(distributors.faq),
    ...extraBlocks(distributors),
    cta(),
  ]),
});

/* ─────────────────── cases hub + 3 pages ─────────────────── */
const caseLinks = {
  'winter-olympics': '/resources/case-studies/winter-olympics-2022/',
  shenzhen: '/resources/case-studies/shenzhen-covid-quarantine/',
  'guangzhou-nanjing': '/resources/case-studies/guangzhou-nanjing-outbreak/',
};

page('case-studies', {
  title: cases.meta.title, description: cases.meta.description,
  path: '/resources/case-studies/', translationKey: 'case-studies',
  sections: compact([
    { type: 'hero', eyebrow: cases.hero.eyebrow, title: cases.hero.title, sub: cases.hero.sub },
    ...cases.cases.map((c, i) => ({
      type: 'image-text',
      variant: i % 2 === 0 ? 'left' : 'right',
      tint: i % 2 === 1,
      eyebrow: c.tag,
      title: c.title,
      text: c.challenge,
      bullets: c.points,
      imageNote: `${c.title} 场景图`,
      cta: { label: 'Read the full case study', href: caseLinks[c.id] ?? '#' },
    })),
    cases.dataNote && {
      type: 'banner-wide', align: 'center',
      title: cases.dataNote.title, text: cases.dataNote.desc,
    },
    ...extraBlocks(cases),
    cta(),
  ]),
});

for (const p of casePages.pages) {
  const nextPage = casePages.pages.find((x) => x.slug === p.next);
  page(p.slug, {
    title: p.meta.title, description: p.meta.description,
    path: `/resources/case-studies/${p.slug}/`, translationKey: p.slug,
    sections: compact([
      { type: 'hero', eyebrow: p.category, title: p.hero.title, sub: p.hero.sub },
      p.glance && { type: 'stats-row', items: p.glance.map((g) => ({ value: g.value, label: g.label })) },
      p.challenge && {
        type: 'richtext',
        eyebrow: casePages.shared.challengeEyebrow, title: p.challenge.title,
        blocks: [{ text: p.challenge.body }],
      },
      p.deployment && { type: 'checklist', title: p.deployment.title, items: p.deployment.points, panel: true, tint: true },
      p.outcome && {
        type: 'richtext',
        eyebrow: casePages.shared.outcomeEyebrow, title: p.outcome.title,
        blocks: [{ text: p.outcome.body }],
      },
      p.outcome?.points && { type: 'checklist', items: p.outcome.points, panel: true },
      deepSec(p.deep),
      faqSec(p.faq),
      { type: 'link-pills', label: casePages.shared.nextLabel, items: compact([
        nextPage && { label: nextPage.hero.title, href: `/resources/case-studies/${nextPage.slug}/` },
        { label: casePages.shared.backLabel, href: '/resources/case-studies/' },
      ]) },
      ...extraBlocks(p),
      cta(),
    ]),
  });
}

/* ─────────────────── about + contact ─────────────────── */
page('about', {
  title: about.meta.title, description: about.meta.description,
  path: '/company/about/', translationKey: 'about',
  sections: compact([
    { type: 'hero', eyebrow: about.hero.eyebrow, title: about.hero.title, sub: about.hero.sub },
    about.story && {
      type: 'richtext', title: about.story.title,
      blocks: about.story.paragraphs.map((t) => ({ text: t })),
    },
    about.milestones && {
      type: 'card-grid', columns: 4, tint: true,
      title: about.milestones.title,
      items: about.milestones.items.map((it, i) => ({
        icon: ['hospital', 'shield', 'alert', 'snow'][i], title: it.title, text: it.desc,
      })),
    },
    about.facts && { type: 'stats-row', title: about.facts.title, items: about.facts.items },
    about.cta && {
      type: 'banner-wide', title: about.cta.title, text: about.cta.sub,
      cta: { label: about.cta.primary, href: '/contact/' },
    },
    deepSec(about.deep),
    faqSec(about.faq),
    ...extraBlocks(about),
    cta(),
  ]),
});

page('contact', {
  title: contact.meta.title, description: contact.meta.description,
  path: '/contact/', translationKey: 'contact',
  sections: compact([
    { type: 'hero', eyebrow: contact.hero.eyebrow, title: contact.hero.title, sub: contact.hero.sub },
    { type: 'contact-form' },
    faqSec(contact.faq),
    ...extraBlocks(contact),
  ]),
});

/* ─────────────────── blocks demo (internal) ─────────────────── */
page('blocks-demo', {
  title: blocksDemo.meta.title, description: blocksDemo.meta.description,
  path: '/blocks-demo/', translationKey: 'blocks-demo',
  noindex: true,
  sections: compact([
    {
      type: 'hero', variant: 'centered',
      title: '区块库总览', sub: '全部板块类型，每种渲染一次。看中哪个版式，告诉我 type 名即可。此页 noindex，不会被搜索引擎收录。',
    },
    ...blocksDemo.blocks,
  ]),
});

/* ─────────────────── i18n dictionary ─────────────────── */
const dict = {
  brand: common.brand,
  brandTagline: common.brandTagline,
  nav: {
    product: { ...common.nav.product, root: '/products/' },
    solutions: { ...common.nav.solutions, root: '/solutions/' },
    business: { ...common.nav.business, root: '/business/' },
    resources: { ...common.nav.resources, root: '/resources/' },
  },
  cta: common.cta,
  ctaBanner: { ...common.ctaBanner, fullFormHref: '/contact/' },
  footer: common.footer,
  contactForm: contact.form,
  direct: contact.direct,
};
writeFileSync(join(I18N, 'en.yaml'), stringify(dict, { lineWidth: 0 }));

console.log(`✓ ${written} 页已转换到 content/pages/en/ + i18n 词典已生成`);
