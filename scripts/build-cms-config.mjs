// Generates public/admin/config.yml for the section-model CMS.
//
// Content model:
//   Pages (EN)      folder collection — one YAML per page, each page is an
//                   ordered `sections` list (add / remove / drag to reorder)
//   UI Dictionary   nav / footer / forms copy per locale
//
// Adding a locale later: duplicate the two collection definitions with the
// new folder/file (e.g. content/pages/es + content/i18n/es.yaml). Pages are
// fully independent per locale — layouts and slugs can differ freely.
//
// Emitted YAML is fully expanded (no anchors): anchor-heavy configs trip the
// CMS parser's alias-count guard and the admin would fail to load.
//
// Run:  npm run cms:config    (also runs automatically before every build)
import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';

// ---------- field helpers ----------

const ICONS = [
  'alert', 'arrow', 'baby', 'battery', 'bed', 'bell', 'box', 'briefcase', 'building',
  'chart', 'check', 'clock', 'cloud', 'cog', 'console', 'curve', 'data', 'doc',
  'factory', 'flower', 'globe', 'handshake', 'heart', 'home', 'hospital', 'mail',
  'moon', 'patch', 'phone', 'pin', 'school', 'sensor', 'set', 'shield', 'snow',
  'terminal', 'users', 'whatsapp', 'wifi',
];

const str = (label, name, opts = {}) => ({ label, name, widget: 'string', ...opts });
const txt = (label, name, opts = {}) => ({ label, name, widget: 'text', ...opts });
const bool = (label, name, def = false) => ({ label, name, widget: 'boolean', required: false, default: def });
const img = (label, name, opts = {}) => ({ label, name, widget: 'image', required: false, ...opts });
const list = (label, name, fields, opts = {}) => ({ label, name, widget: 'list', fields, ...opts });
const strList = (label, name, opts = {}) => ({
  label, name, widget: 'list', field: { label: 'Item', name: 'item', widget: 'string' }, ...opts,
});
const obj = (label, name, fields, opts = {}) => ({ label, name, widget: 'object', fields, ...opts });
const sel = (label, name, options, opts = {}) => ({ label, name, widget: 'select', options, required: false, ...opts });
const iconField = (label = 'Icon', name = 'icon') => sel(label, name, ICONS);

const EYEBROW = str('Eyebrow (hidden site-wide)', 'eyebrow', { required: false });
const TINT = bool('Light blue background', 'tint');
const RATIO = (def = '4/3') => sel('Image ratio', 'ratio', ['4/3', '16/9', '1/1', '3/2'], { default: def });
const BTN = (label, name) => obj(label, name, [str('Label', 'label'), str('Link', 'href')], { required: false });

const buttonsField = () => list('Buttons', 'buttons', [
  str('Label', 'label'),
  str('Link', 'href'),
  sel('Style', 'style', ['primary', 'ghost'], { default: 'primary' }),
], { required: false });

// ---------- the 23 section types ----------

const SECTION_TYPES = [
  {
    label: '🏔 Hero (page top, owns the H1)', name: 'hero', widget: 'object',
    summary: 'Hero: {{fields.title}}',
    fields: [
      sel('Variant', 'variant', [
        { label: 'Standard (left copy)', value: 'standard' },
        { label: 'Centered', value: 'centered' },
        { label: 'Dark banner', value: 'dark' },
        { label: 'Split (copy + visual)', value: 'split' },
        { label: 'Copy + enquiry form', value: 'form' },
      ], { default: 'standard' }),
      EYEBROW,
      str('Kicker pill (visible)', 'kicker', { required: false }),
      str('Headline (H1) — must contain the page keyword', 'title'),
      txt('Subheading', 'sub', { required: false }),
      buttonsField(),
      list('Stats strip', 'stats', [str('Value', 'value'), str('Label', 'label')], { required: false }),
      strList('Badges (pills)', 'badges', { required: false }),
      obj('Kit strip', 'kit', [str('Label', 'label'), strList('Items', 'items')], { required: false }),
      txt('Small print under buttons', 'note', { required: false }),
      sel('Visual (split variant only)', 'visual', [
        { label: 'Device collage (home style)', value: 'device-collage' },
        { label: 'Product 4-tile grid', value: 'product-tiles' },
        { label: 'Ward dashboard mock', value: 'ward-dashboard' },
        { label: 'App phone mock', value: 'phone-panel' },
        { label: 'Terminal mock', value: 'terminal-panel' },
        { label: 'Image', value: 'image' },
      ]),
      obj('Visual captions (product tiles)', 'visualLabels', [
        str('Device', 'device', { required: false }), str('App', 'app', { required: false }),
        str('Patches', 'patch1', { required: false }), str('Battery', 'patch2', { required: false }),
        str('Terminal', 'terminal', { required: false }),
      ], { required: false, collapsed: true }),
      img('Image (visual = image)', 'image'),
      str('Image alt (SEO)', 'imageAlt', { required: false }),
      str('Placeholder note', 'imageNote', { required: false }),
      RATIO(),
    ],
  },
  {
    label: '✅ Trust bar', name: 'trustbar', widget: 'object',
    summary: 'Trust bar: {{fields.label}}',
    fields: [
      str('Label', 'label', { required: false }),
      strList('Items', 'items'),
      bool('Dark background', 'dark'),
    ],
  },
  {
    label: '🖼 Image + text', name: 'image-text', widget: 'object',
    summary: 'Image+text: {{fields.title}}',
    fields: [
      sel('Variant', 'variant', [
        { label: 'Image top, text below', value: 'top' },
        { label: 'Image left, text right', value: 'left' },
        { label: 'Image right, text left', value: 'right' },
      ], { default: 'left' }),
      EYEBROW,
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      strList('Tick list', 'bullets', { required: false }),
      img('Image', 'image', { hint: 'Leave empty for a labelled placeholder' }),
      str('Image alt (SEO)', 'imageAlt', { required: false }),
      str('Placeholder note', 'imageNote', { required: false }),
      RATIO(),
      BTN('Button', 'cta'),
      TINT,
    ],
  },
  {
    label: '🌆 Full-width banner', name: 'banner-wide', widget: 'object',
    summary: 'Banner: {{fields.title}}',
    fields: [
      img('Background image', 'image', { hint: 'Empty = dark brand gradient' }),
      str('Image alt (SEO)', 'imageAlt', { required: false }),
      str('Placeholder note', 'imageNote', { required: false }),
      EYEBROW,
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      BTN('Primary button', 'cta'),
      BTN('Secondary button', 'cta2'),
      sel('Alignment', 'align', ['left', 'center'], { default: 'left' }),
      sel('Height', 'height', ['short', 'tall'], { default: 'short' }),
    ],
  },
  {
    label: '🖼 Gallery', name: 'gallery', widget: 'object',
    summary: 'Gallery: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      sel('Columns', 'columns', [2, 3, 4], { default: 3 }),
      RATIO(),
      list('Images', 'items', [
        img('Image', 'image'),
        str('Alt (SEO)', 'alt', { required: false }),
        str('Caption', 'caption', { required: false }),
        str('Placeholder note', 'note', { required: false }),
      ]),
      TINT,
    ],
  },
  {
    label: '🃏 Card grid', name: 'card-grid', widget: 'object',
    summary: 'Cards: {{fields.title}}',
    fields: [
      EYEBROW,
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      sel('Columns', 'columns', [2, 3, 4], { default: 3 }),
      sel('Card media', 'media', ['icon', 'image', 'none'], { default: 'icon' }),
      RATIO(),
      list('Cards', 'items', [
        iconField(),
        img('Image', 'image'),
        str('Placeholder note', 'imageNote', { required: false }),
        str('Kicker (small overline)', 'kicker', { required: false }),
        str('Title', 'title', { required: false }),
        txt('Body', 'text', { required: false }),
        str('Link', 'href', { required: false }),
        str('Link label', 'linkLabel', { required: false }),
      ]),
      bool('Center the heading', 'center'),
      TINT,
      bool('Dark background', 'dark'),
      txt('Footnote', 'note', { required: false }),
      BTN('"See all" link', 'moreLink'),
    ],
  },
  {
    label: '🔢 Stats row', name: 'stats-row', widget: 'object',
    summary: 'Stats: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      list('Stats', 'items', [str('Value', 'value'), str('Label', 'label')]),
      bool('Dark background', 'dark'),
      TINT,
    ],
  },
  {
    label: '☑️ Checklist', name: 'checklist', widget: 'object',
    summary: 'Checklist: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      strList('Items', 'items'),
      sel('Columns', 'columns', [1, 2], { default: 1 }),
      bool('Wrap in a white panel', 'panel'),
      TINT,
    ],
  },
  {
    label: '📝 Text + checks panel', name: 'text-checks', widget: 'object',
    summary: 'Text+checks: {{fields.title}}',
    fields: [
      EYEBROW,
      str('Heading (H2)', 'title'),
      txt('Body', 'text', { required: false }),
      strList('Points', 'points'),
      bool('Panel on the left', 'flip'),
      TINT,
    ],
  },
  {
    label: '➡️ Step flow', name: 'step-flow', widget: 'object',
    summary: 'Steps: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      list('Steps', 'items', [iconField(), str('Title', 'title'), txt('Body', 'desc', { required: false })]),
      sel('Columns', 'columns', [3, 4], { default: 4 }),
      bool('Show arrows', 'arrows', true),
      bool('Center the heading', 'center'),
      TINT,
    ],
  },
  {
    label: '🔁 Feature rows (alternating)', name: 'feature-rows', widget: 'object',
    summary: 'Features: {{fields.title}}',
    fields: [
      EYEBROW,
      str('Heading (H2)', 'title', { required: false }),
      list('Rows', 'items', [
        str('Anchor id', 'id', { required: false }),
        str('Tag pill', 'tag', { required: false }),
        str('Title', 'title'),
        txt('Body', 'desc', { required: false }),
        strList('Bullets', 'bullets', { required: false }),
        sel('Visual', 'visual', [...ICONS, 'phone', 'terminal', 'image']),
        img('Image (visual = image)', 'image'),
        str('Placeholder note', 'imageNote', { required: false }),
      ]),
    ],
  },
  {
    label: '📊 Comparison table', name: 'compare-table', widget: 'object',
    summary: 'Table: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      { label: 'Column names (left to right)', name: 'columns', widget: 'list', field: { label: 'Column', name: 'col', widget: 'string' } },
      { label: 'Highlight which column (0 = first)', name: 'highlight', widget: 'number', required: false, default: 0, value_type: 'int', min: 0 },
      list('Rows', 'rows', [
        str('Row label', 'label'),
        list('Cells (same order as columns)', 'cells', [
          sel('State', 'state', [
            { label: '✓ Yes (green)', value: 'yes' },
            { label: '✗ No (red)', value: 'no' },
            { label: '△ Partial (amber)', value: 'mid' },
            { label: 'Plain text (grey)', value: 'plain' },
          ], { default: 'yes', required: true }),
          str('Text', 'text'),
        ]),
      ]),
      TINT,
    ],
  },
  {
    label: '🕐 Timeline', name: 'timeline', widget: 'object',
    summary: 'Timeline: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'sub', { required: false }),
      list('Events', 'items', [
        str('Time', 'time'),
        str('Event title', 'event'),
        txt('Event detail', 'detail', { required: false }),
        str('Tag', 'tag', { required: false }),
        sel('Colour', 'tone', [
          { label: 'Blue (normal)', value: 'blue' },
          { label: 'Red (alert)', value: 'red' },
          { label: 'Green (resolving)', value: 'green' },
        ], { default: 'blue' }),
      ]),
      bool('Dark background', 'dark', true),
    ],
  },
  {
    label: '🎚 Image compare slider', name: 'image-compare', widget: 'object',
    summary: 'Compare: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      img('Left image (before)', 'beforeImage'),
      str('Left label', 'beforeLabel', { required: false, default: 'Before' }),
      str('Left placeholder note', 'beforeNote', { required: false }),
      img('Right image (after)', 'afterImage'),
      str('Right label', 'afterLabel', { required: false, default: 'After' }),
      str('Right placeholder note', 'afterNote', { required: false }),
      sel('Image ratio', 'ratio', ['16/9', '4/3', '1/1'], { default: '16/9' }),
      { label: 'Starting position %', name: 'start', widget: 'number', required: false, default: 50, value_type: 'int', min: 0, max: 100 },
      TINT,
    ],
  },
  {
    label: '💬 Quote / testimonial', name: 'quote', widget: 'object',
    summary: 'Quote: {{fields.author}}',
    fields: [
      txt('Quote', 'quote'),
      str('Author', 'author', { required: false }),
      str('Role / company', 'role', { required: false }),
      img('Avatar', 'avatar'),
      bool('Dark background', 'dark'),
      TINT,
    ],
  },
  {
    label: '🏢 Logo wall', name: 'logo-wall', widget: 'object',
    summary: 'Logos: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      sel('Columns', 'columns', [3, 4, 5, 6], { default: 5 }),
      list('Logos', 'items', [img('Logo image', 'image'), str('Name (shown if no image)', 'name')]),
      bool('Light blue background', 'tint', true),
    ],
  },
  {
    label: '🎬 Video', name: 'video', widget: 'object',
    summary: 'Video: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      txt('Body', 'text', { required: false }),
      str('YouTube ID', 'youtubeId', { required: false, hint: 'The part after v= in the URL' }),
      str('Vimeo ID', 'vimeoId', { required: false }),
      { label: 'Or upload an mp4', name: 'mp4', widget: 'file', required: false },
      img('Poster image', 'poster'),
      sel('Ratio', 'ratio', ['16/9', '4/3', '1/1'], { default: '16/9' }),
      TINT,
    ],
  },
  {
    label: '📖 SEO long-form', name: 'richtext', widget: 'object',
    summary: 'Long-form: {{fields.title}}',
    fields: [
      EYEBROW,
      str('Heading (H2)', 'title'),
      list('Paragraphs', 'blocks', [
        str('Subheading (H3) — put a keyword here', 'heading', { required: false }),
        txt('Body (90–140 words)', 'text'),
      ]),
      TINT,
    ],
  },
  {
    label: '❓ FAQ accordion', name: 'faq', widget: 'object',
    summary: 'FAQ: {{fields.title}}',
    fields: [
      str('Heading (H2)', 'title', { required: false }),
      list('Questions', 'items', [
        str('Question — write it the way people search', 'q'),
        txt('Answer (50–90 words)', 'a'),
      ]),
    ],
  },
  {
    label: '🔗 Link pills', name: 'link-pills', widget: 'object',
    summary: 'Links: {{fields.label}}',
    fields: [
      str('Strip label', 'label', { required: false, default: 'Explore' }),
      list('Links', 'items', [str('Label', 'label'), str('URL', 'href')]),
    ],
  },
  {
    label: '📮 Contact form (full)', name: 'contact-form', widget: 'object',
    summary: 'Full enquiry form',
    fields: [
      { label: 'Note', name: '_note', widget: 'hidden', required: false,
        hint: 'Labels come from the UI Dictionary (contactForm / direct).' },
    ],
  },
  {
    label: '📣 CTA banner (mini enquiry form)', name: 'cta-banner', widget: 'object',
    summary: 'CTA banner + mini form',
    fields: [
      { label: 'Note', name: '_note', widget: 'hidden', required: false,
        hint: 'Copy comes from the UI Dictionary (ctaBanner).' },
    ],
  },
  {
    label: '🛠 Custom HTML (escape hatch)', name: 'custom-html', widget: 'object',
    summary: 'Custom HTML',
    fields: [
      { label: 'HTML', name: 'html', widget: 'code', default_language: 'html', allow_language_selection: false,
        hint: '整段替换，不要做字符串手术。Inline <style> 有效。' },
      bool('Wrap in page container', 'contained', true),
      TINT,
    ],
  },
];

const sectionsField = () => ({
  label: 'Sections (drag to reorder · + to add)',
  name: 'sections',
  widget: 'list',
  label_singular: 'Section',
  types: structuredClone(SECTION_TYPES),
});

// ---------- collections per locale ----------
// To add a locale: append pagesCollection('es', 'Pages (ES)') and
// dictCollection('es', 'UI Dictionary (ES)') below, create the folder/file,
// done. Pages are fully independent per locale.

const pagesCollection = (locale, label) => ({
  name: `pages_${locale}`,
  label,
  icon: 'article',
  folder: `content/pages/${locale}`,
  extension: 'yaml',
  format: 'yaml',
  create: true,
  slug: '{{slug}}',
  summary: '{{title}} — {{path}}',
  editor: { preview: false },
  fields: [
    str('Title tag', 'title', { hint: '≤60 chars · keyword first · end with | EverChek' }),
    txt('Meta description', 'description', { hint: '140–160 chars · keyword + a reason to click' }),
    str('URL path (改了会断链，慎改)', 'path', { hint: `e.g. /products/x/ — localised slugs welcome` }),
    str('Translation key (links locales for hreflang)', 'translationKey', { required: false, hint: 'Same key across locales = same page in different languages' }),
    bool('Hide from search engines (noindex)', 'noindex'),
    sel('Structured data', 'schemaType', [{ label: 'Product page', value: 'product' }]),
    sectionsField(),
  ],
});

const dictCollection = (locale, label) => ({
  name: `i18n_${locale}`,
  label,
  icon: 'translate',
  editor: { preview: false },
  files: [
    {
      name: `dict_${locale}`,
      label: `${label} — nav / footer / forms`,
      file: `content/i18n/${locale}.yaml`,
      fields: [
        str('Brand name', 'brand'),
        str('Brand tagline', 'brandTagline'),
        obj('Navigation', 'nav', ['product', 'solutions', 'business', 'resources'].map((key) =>
          obj(key, key, [
            str('Menu name', 'label'),
            str('Active URL prefix', 'root', { required: false }),
            list('Columns', 'columns', [
              str('Column heading', 'heading'),
              list('Links', 'links', [str('Label', 'label'), str('URL', 'href')]),
            ]),
          ]),
        ), { collapsed: true }),
        obj('Header buttons', 'cta', [str('Enquiry button', 'enquiry'), str('Quote button', 'quote')]),
        obj('CTA banner (bottom mini form)', 'ctaBanner', [
          str('Heading', 'title'), txt('Body', 'sub'),
          str('Email label', 'emailLabel'), str('Email placeholder', 'emailPlaceholder'),
          str('Country label', 'countryLabel'), str('Country placeholder', 'countryPlaceholder'),
          str('Message label', 'messageLabel'), str('Message placeholder', 'messagePlaceholder'),
          str('Submit button', 'submit'), str('Sending label', 'sending'),
          txt('Success message', 'success'), txt('Error message', 'error'), txt('Privacy note', 'privacy'),
          str('Full-form link label', 'fullFormLink'), str('Full-form link URL', 'fullFormHref', { required: false }),
        ], { collapsed: true }),
        obj('Contact form labels', 'contactForm', [
          str('Name', 'name'), str('Company', 'company'), str('Email', 'email'), str('Country', 'country'),
          str('Enquiry type', 'type'), strList('Type options', 'types'), str('Quantity', 'quantity'),
          str('Message', 'message'), str('Message placeholder', 'messagePlaceholder'),
          str('Submit button', 'submit'), str('Sending label', 'sending'),
          txt('Success message', 'success'), txt('Error message', 'error'), txt('Privacy note', 'privacy'),
        ], { collapsed: true }),
        obj('Direct contact card', 'direct', [
          str('Heading', 'title'), txt('Body', 'desc'),
          str('Email label', 'emailLabel'), str('Email', 'email'),
          str('WhatsApp label', 'whatsappLabel'), str('WhatsApp number', 'whatsapp'), str('WhatsApp link', 'whatsappLink'),
          str('Address label', 'addressLabel'), txt('Address', 'address'), str('Response note', 'responseNote'),
        ], { collapsed: true }),
        obj('Footer', 'footer', [
          txt('Blurb', 'blurb'),
          list('Columns', 'columns', [
            str('Column heading', 'heading'),
            list('Links', 'links', [str('Label', 'label'), str('URL', 'href')]),
          ]),
          str('Contact heading', 'contactHeading'), str('Email', 'email'),
          str('WhatsApp number', 'whatsapp'), str('WhatsApp link', 'whatsappLink'),
          txt('Address', 'address'), str('Copyright', 'legal'), txt('Disclaimer', 'disclaimer'),
        ], { collapsed: true }),
      ],
    },
  ],
});

// ---------- config ----------

const config = {
  backend: {
    name: 'github',
    repo: 'RefreshBiosensing/everchek-website',
    branch: 'main',
    base_url: 'https://sveltia-cms-auth.yanhuarong.workers.dev',
  },
  media_folder: 'public/images',
  public_folder: '/images',
  // Editorial workflow: saves go to a draft branch; Cloudflare Pages builds a
  // real preview URL per branch; the Check-preview button opens it. Publish
  // merges to main.
  publish_mode: 'editorial_workflow',
  // Sveltia's built-in preview pane is not a real render — hide it, edit full-width.
  editor: { preview: false },
  collections: [
    pagesCollection('en', 'Pages (EN)'),
    dictCollection('en', 'UI Dictionary (EN)'),
  ],
};

const header = `# ⚠️ Generated file — do not edit by hand.
# Edit scripts/build-cms-config.mjs, then run: npm run cms:config
#
# base_url must point at the deployed sveltia-cms-auth Worker, or sign-in fails.
`;

const yaml = stringify(config, { aliasDuplicateObjects: false, lineWidth: 0 });
writeFileSync('public/admin/config.yml', header + yaml);

console.log(
  `✓ config.yml generated: ${config.collections.length} collections / ${SECTION_TYPES.length} section types / editorial workflow on`,
);
