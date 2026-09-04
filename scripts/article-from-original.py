#!/usr/bin/env python3
"""Rebuild a blog article's YAML body from the original ever-chek.com page.

The three articles were converted into marketing sections (cards, step tiles,
side-by-side figures). The originals are plain documents: h2/h3/h4/p/ul/figure.
This reads the original HTML and emits the `prose` section verbatim, so the
rebuilt article has the same document structure and the same words.
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

MIRROR = '/private/tmp/claude-501/-Users-yanhuarong-Desktop-everchek/fa296c9c-c22c-4394-9355-776ac96e1dff/scratchpad/mirror'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BLOCKS = {'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'figure', 'hr', 'blockquote'}
INLINE_KEEP = {'strong', 'em', 'b', 'i', 'a', 'mark', 'sup', 'sub', 'br', 'code'}
VOID = {'br', 'img', 'hr'}

# Old .html URLs → the rebuilt site's paths.
URLMAP = {
    'cgm-oem': '/cgm-oem/', 'cgm-skd': '/cgm-skd/', 'contact': '/contact/',
    'certifications': '/certifications/', 'cgm-distribution': '/cgm-distribution/',
    'cgm-patient-app': '/cgm-patient-app/', 'cgm-skd-tenders': '/cgm-skd-tenders/',
    'continuous-glucose-monitor': '/continuous-glucose-monitor/', 'about-us': '/about-us/',
    'cgm-blogs': '/blog/', 'index': '/',
    'oem': '/cgm-oem/', 'skd': '/cgm-skd/',
}


def fix_href(href):
    if href.startswith('http'):
        m = re.match(r'https?://(?:www\.)?ever-chek\.com/?(.*)$', href)
        if not m:
            return href                      # genuine external citation, keep it
        rest = m.group(1).strip('/')
        return URLMAP.get(rest, '/' + rest + '/' if rest else '/')
    rest = re.sub(r'^\.\./|\.html$|[#?].*$', '', href)
    return URLMAP.get(rest, href)


class Body(HTMLParser):
    """Collect top-level block elements of the article body, in order."""

    def __init__(self, imgmap):
        super().__init__(convert_charrefs=False)
        self.imgmap = imgmap
        self.blocks = []
        self.attrs = {}
        self.depth = 0          # nesting depth inside the block we are capturing
        self.tag = None         # block tag being captured
        self.buf = []
        self.fig = None

    # -- capture helpers ---------------------------------------------------
    def emit_raw(self, s):
        if self.tag:
            self.buf.append(s)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if self.tag is None:
            if tag in BLOCKS:
                self.tag, self.buf, self.depth = tag, [], 0
                self.attrs = a
                if tag == 'hr':
                    self.blocks.append({'hr': True})
                    self.tag = None
            return
        # inside a block
        if tag == self.tag:
            self.depth += 1
        if tag == 'img' and self.tag == 'figure':
            src = a.get('src', '')
            self.fig = {
                'src': self.imgmap.get(os.path.basename(src), '/blog/' + src),
                'alt': a.get('alt', ''),
                'width': a.get('width'), 'height': a.get('height'),
            }
            return
        if tag in INLINE_KEEP:
            if tag == 'a':
                self.emit_raw('<a href="%s"%s>' % (
                    html.escape(fix_href(a.get('href', ''))),
                    ' target="_blank" rel="noopener"' if a.get('href', '').startswith('http')
                    and 'ever-chek.com' not in a.get('href', '') else ''))
            elif tag == 'br':
                self.emit_raw('<br>')
            else:
                self.emit_raw('<%s>' % tag)
        elif tag == 'li':
            self.emit_raw('\x00LI\x00')

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if self.tag is None:
            return
        if tag == self.tag and self.depth == 0:
            self.close_block()
            return
        if tag == self.tag:
            self.depth -= 1
        if tag in INLINE_KEEP and tag not in VOID:
            self.emit_raw('</%s>' % tag)

    def handle_data(self, d):
        self.emit_raw(d)

    def handle_entityref(self, name):
        # The originals contain bare ampersands ("R&D"). HTMLParser reports
        # those as an entity ref; unescape leaves unknown ones untouched, which
        # would invent a semicolon. Emit the literal text instead.
        dec = html.unescape('&%s;' % name)
        self.emit_raw(dec if dec != '&%s;' % name else '&' + name)

    def handle_charref(self, name):
        self.emit_raw(html.unescape('&#%s;' % name))

    def close_block(self):
        raw = ''.join(self.buf)
        tag = self.tag
        self.tag, self.buf = None, []
        if tag == 'figure':
            if self.fig:
                cap = ' '.join(raw.split())
                b = {'figure': self.fig['src'], 'alt': self.fig['alt']}
                if self.attrs.get('data-cover'):
                    b['cover'] = True
                if self.fig['width']:
                    b['width'] = int(self.fig['width'])
                if self.fig['height']:
                    b['height'] = int(self.fig['height'])
                if cap:
                    b['caption'] = cap
                self.blocks.append(b)
            self.fig = None
            return
        if tag in ('ul', 'ol'):
            items = [' '.join(x.split()) for x in raw.split('\x00LI\x00')[1:]]
            items = [re.sub(r'</li>\s*$', '', i).strip() for i in items if i.strip()]
            if items:
                self.blocks.append({tag: items})
            return
        text = ' '.join(raw.replace('\x00LI\x00', '').split())
        if text:
            b = {tag: text}
            # The originals put explicit ids on some headings; keep them so old
            # in-page anchors and the contents list still resolve.
            if tag in ('h2', 'h3', 'h4') and self.attrs.get('id'):
                b['id'] = self.attrs['id']
            self.blocks.append(b)


def yaml_str(s):
    """Emit a YAML double-quoted scalar; safe for any inline HTML we keep."""
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


def build(src_name, out_name, img_dir):
    src = open(os.path.join(MIRROR, 'blog', src_name), encoding='utf-8-sig',
               errors='replace').read()
    src = re.sub(r'(?is)<script.*?</script>|<style.*?</style>|<!--.*?-->', '', src)
    i = src.find('<div class="article-body"')
    if i < 0:
        raise SystemExit('cannot locate article body in ' + src_name)
    ends = [x for x in (src.find('<div class="faq-section"'),
                        src.find('<nav class="article-nav"'),
                        src.find('<div id="article-nav"')) if x > i]
    body = src[i:min(ends)] if ends else src[i:]
    # Some pages wrap the cover image in a styled div rather than a <figure>.
    # Normalise it so the parser sees one figure, flagged as a cropped cover.
    body = re.sub(r'(?is)<div[^>]*aspect-ratio[^>]*>\s*(<img[^>]*>)\s*</div>',
                  r'<figure data-cover="1">\1</figure>', body)

    if img_dir is None:
        # Cover images live in /images and are already webp.
        site = os.listdir(os.path.join(ROOT, 'public', 'images'))
        imgmap = {n: '/images/' + os.path.splitext(n)[0] + '.webp'
                  for n in set(re.findall(r'(?i)src="([^"/]+\.(?:png|jpe?g|webp))"', body))
                  if os.path.splitext(n)[0] + '.webp' in site}
        p = Body(imgmap)
        p.feed(body)
        p.close()
        return p.blocks

    # original filename (with its stray spaces) → the webp we actually ship
    webps = sorted(os.listdir(os.path.join(ROOT, 'public', 'blog', img_dir)))
    def norm(n):
        return re.sub(r'[^a-z0-9]', '', os.path.splitext(n)[0].lower())
    imgmap = {}
    for orig in os.listdir(os.path.join(MIRROR, 'blog', img_dir)):
        for w in webps:
            if norm(w).startswith(norm(orig)[:14]):
                imgmap[orig] = '/blog/%s/%s' % (img_dir, w)
                break
    p = Body(imgmap)
    p.feed(body)
    p.close()
    return p.blocks


if __name__ == '__main__':
    spec = [
        ('private-label-cgm.html', 'private-label-cgm', 'private-label-cgm-images'),
        ('what-is-cgm-skd.html', 'what-is-cgm-skd', 'cgm-skd-b2b-guide-images'),
        ('cgm-vs-bgm.html', 'cgm-vs-bgm', 'cgm-vs-bgm-images'),
        ('../cgm-manufacturing-models.html', 'cgm-manufacturing-models', None),
        ('../cgm-skd-tenders.html', 'cgm-skd-tenders', None),
        ('../cgm-technology-guide-2026.html', 'cgm-technology-guide-2026', None),
    ]
    out = {}
    for s, n, d in spec:
        out[n] = build(s, n, d)
        c = {}
        for b in out[n]:
            k = next(iter(b))
            c[k] = c.get(k, 0) + 1
        print(n, c)
    json.dump(out, open(os.path.join(ROOT, 'scripts', '.article-blocks.json'), 'w'),
              ensure_ascii=False, indent=1)
