#!/usr/bin/env python3
"""Jednokratna migracija: iz postojecih Webflow stranica vadi projekte u data/projects.json."""
import re, json, html, os, sys
from urllib.parse import unquote
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf8').read()

def parse_img(tag):
    src = re.search(r' src="([^"]*)"', tag).group(1)
    srcset = re.search(r' srcset="([^"]*)"', tag)
    f = os.path.basename(src)
    widths = []; ow = None
    if srcset:
        for part in srcset.group(1).split(', '):
            u, w = part.rsplit(' ', 1)
            w = int(w[:-1])
            if re.search(r'-p-\d+\.[A-Za-z0-9]+$', u): widths.append(w)
            else: ow = w
    return {'file': f, 'widths': widths, 'w': ow}

def items(block):
    """vrati listu stavki 'works__item' iz bloka liste"""
    out = []
    parts = re.split(r'(?=<div class="works__item[ "])', block)
    for p in parts:
        if not p.startswith('<div class="works__item'): continue
        if 'works__item-visual' not in p[:300]: continue
        visual = re.search(r'<img[^>]*class="works__item-img"[^>]*>', p).group(0)
        content = re.search(r'<img[^>]*class="works__content-img"[^>]*>', p).group(0)
        title = html.unescape(re.search(r'<div class="works__item-text text-size-small">([^<]*)</div><div class="works__services-list">', p).group(1))
        services = [html.unescape(x) for x in re.findall(r'works__services-text text-size-small">([^<]*)<', p)]
        year = re.findall(r'works__item-text text-size-small">([^<]*)</div></div></div></div>', p)
        year = re.search(r'works__item-date"><div class="works__item-text text-size-small">/</div><div class="works__item-text text-size-small">([^<]*)<', p).group(1)
        href = re.search(r'works__item-link[^"]*" href="(?:\.\./)?work/([^"]*)\.html"', p).group(1)
        out.append({'slug': href, 'title': title, 'services': services, 'year': year,
                    'cover': parse_img(visual), 'thumb': parse_img(content)})
    return out

ow = rd('our-work.html')
a = ow.find('works__list grid-main qbc-dyn-items'); 
block = ow[a:ow.find('</section>', a)]
projects = items(block)
print('our-work items:', len(projects), [p['slug'] for p in projects])

# index: prvih N
ix = rd('index.html')
a = ix.find('works__list qbc-dyn-items'); 
idx = items(ix[a:ix.find('</section>', a)])
print('index slugs:', [p['slug'] for p in idx])

for p in projects:
    s = rd(f"work/{p['slug']}.html")
    p['hero_services'] = [html.unescape(x) for x in re.findall(r'work-hero__services-text text-size-small">([^<]*)<', s)]
    p['hero'] = parse_img(re.search(r'<img[^>]*class="works-details__img"[^>]*>', s).group(0))
    rt = re.search(r'<div class="works-details__title h2 qbc-richtext">(.*?)</div><div class="works-details__showcase', s, re.S).group(1)
    p['description'] = rt
    sc = s[s.find('works-details__showcase-list'):]
    sc = sc[:sc.find('qbc-dyn-hide qbc-dyn-empty')]
    p['gallery'] = [parse_img(t) for t in re.findall(r'<img[^>]*class="works-details__showcase-img"[^>]*>', sc)]
    last = s[s.find('Check our last work'):]
    p['_last'] = [x['slug'] for x in items(last)]
    p['_hero_title'] = html.unescape(re.search(r'work-hero__title h1">([^<]*)<', s).group(1))
    # provjere
    if p['hero_services'] != p['services']: print('NOTE hero_services differs', p['slug'], p['hero_services'], p['services'])
    if p['_hero_title'] != p['title']: print('NOTE title differs', p['slug'], p['_hero_title'], p['title'])

slugs = [p['slug'] for p in projects]
for p in projects:
    print(p['slug'], '-> last work:', p['_last'], '| gallery', len(p['gallery']), '| year', p['year'])

out = {'version': 1,
       'home_count': 4,
       'last_work_count': 3,
       'projects': [{k: v for k, v in p.items() if not k.startswith('_') and k != 'hero_services'} for p in projects]}
json.dump(out, open(os.path.join(ROOT, 'data/projects.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('written data/projects.json')
