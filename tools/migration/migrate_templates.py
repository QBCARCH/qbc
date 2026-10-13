#!/usr/bin/env python3
"""Jednokratna migracija: pravi sablon work stranice i ubacuje markere u index.html i our-work.html."""
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf8').read()
def wr(p, s): open(os.path.join(ROOT, p), 'w', encoding='utf8').write(s)

# ---------- work sablon ----------
s = rd('work/villa-dve-koracica-kosmaj.html')
s = s.replace('data-wf-item-slug="villa-dve-koracica-kosmaj"', 'data-wf-item-slug="{{SLUG}}"')
s = re.sub(r'(<meta content=")https://cdn\.prod\.website-files\.com/[^"]*("[^>]*property="og:image"/>)', r'\1{{OG_IMAGE}}\2', s)
s = re.sub(r'(<meta content=")https://cdn\.prod\.website-files\.com/[^"]*("[^>]*name="twitter:image"/>)', r'\1{{OG_IMAGE}}\2', s)
s = s.replace('<title>QBCarchitects</title>', '<title>{{TITLE_TEXT}} | QBCarchitects</title>', 1)
s = re.sub(r'(<meta content=")QBCarchitects("[^>]*property="og:title"/>)', r'\1{{TITLE_ATTR}} | QBCarchitects\2', s)
s = re.sub(r'(<meta content=")QBCarchitects("[^>]*name="twitter:title"/>)', r'\1{{TITLE_ATTR}} | QBCarchitects\2', s)
# opis: prvi paragraf projekta
s = re.sub(r'(<meta content=")Welcome to QBCarchitects[^"]*("[^>]*name="description"/>)', r'\1{{DESC_ATTR}}\2', s)
s = re.sub(r'(<meta content=")Welcome to QBCarchitects[^"]*("[^>]*property="og:description"/>)', r'\1{{DESC_ATTR}}\2', s)
s = re.sub(r'(<meta content=")Welcome to QBCarchitects[^"]*("[^>]*name="twitter:description"/>)', r'\1{{DESC_ATTR}}\2', s)
# hero naslov
s = re.sub(r'(<h1 class="work-hero__title h1">)[^<]*(</h1>)', r'\1{{TITLE_TEXT}}\2', s)
# hero servisi
a = s.find('<div class="work-hero__services-list qbc-dyn-items" role="list">') + len('<div class="work-hero__services-list qbc-dyn-items" role="list">')
b = s.find('</div></div></div></div></header>', a)
s = s[:a] + '{{HERO_SERVICES}}' + s[b:]
# hero slika
s = re.sub(r'<img alt="" class="works-details__img"[^>]*/>', '{{HERO_IMG}}', s, count=1)
# opis
s = re.sub(r'(<div class="works-details__title h2 qbc-richtext">).*?(</div><div class="works-details__showcase)', r'\1{{DESCRIPTION}}\2', s, flags=re.S)
# wf-template skripta
s = re.sub(r'<script id="wf-template-[^>]*type="text/x-wf-template">[^<]*</script>', '', s)
# galerija
a = s.find('<div class="works-details__showcase-list grid-main qbc-dyn-items" role="list">') + len('<div class="works-details__showcase-list grid-main qbc-dyn-items" role="list">')
b = s.find('</div><div class="qbc-dyn-hide qbc-dyn-empty">', a)
s = s[:a] + '{{GALLERY}}' + s[b:]
# last work
a = s.find('<div class="works__list qbc-dyn-items" role="list">', s.find('Check our last work')) + len('<div class="works__list qbc-dyn-items" role="list">')
b = s.find('</div></div></div></div></section></main>', a)
s = s[:a] + '{{LAST_WORK}}' + s[b:]
wr('tools/templates/work.html', s)
print('token count:', sorted(set(re.findall(r'\{\{[A-Z_]+\}\}', s))))

# ---------- markeri u index / our-work ----------
def mark(path, list_open, end_marker_text, name):
    t = rd(path)
    a = t.find(list_open) + len(list_open)
    b = t.find(end_marker_text, a)
    assert a > len(list_open) and b > a, path
    if '<!--QBC:' + name in t: print('vec markirano', path); return
    t = t[:a] + '<!--QBC:' + name + ':START-->' + '<!--QBC:' + name + ':END-->' + t[b:]
    wr(path, t)

# our-work: lista zavrsava pre zatvaranja wrappera
t = rd('our-work.html')
lo = '<div class="works__list grid-main qbc-dyn-items" role="list">'
a = t.find(lo) + len(lo)
b = t.find('</div></div></section>', a)
t = t[:a] + '<!--QBC:LIST:START-->' + '<!--QBC:LIST:END-->' + t[b:]
wr('our-work.html', t)
t = rd('index.html')
lo = '<div class="works__list qbc-dyn-items" role="list">'
a = t.find(lo) + len(lo)
b = t.find('</div></div></div></div></section><section class="services section">', a)
assert b > a
t = t[:a] + '<!--QBC:LIST:START-->' + '<!--QBC:LIST:END-->' + t[b:]
wr('index.html', t)
print('markeri ubaceni')
