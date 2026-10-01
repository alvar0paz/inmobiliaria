"""Static route, asset and viewer integration checks. Run after build.py."""
import json
import unittest
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

DIST=Path(__file__).resolve().parents[1]/'dist'

class Page(HTMLParser):
    def __init__(self,path):
        super().__init__();self.ids=[];self.references=[];self.scripts=[];self.directions=[]
        self.feed='';self.in_feed=False;self.feed_id=None
        self.feed_content(path.read_text())
    def feed_content(self,text): super().feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if a.get('data-direction'): self.directions.append(a['data-direction'])
        if tag=='script' and a.get('src'): self.scripts.append(a['src'])
        if tag=='script' and a.get('id')=='demo-data': self.in_feed=True
        for key in ('src','href'):
            if key in a: self.references.append(a[key])
    def handle_endtag(self,tag):
        if tag=='script': self.in_feed=False
    def handle_data(self,text):
        if self.in_feed: self.feed+=text

class SiteStructure(unittest.TestCase):
    def test_routes_assets_and_fragment_targets(self):
        for path in DIST.rglob('*.html'):
            with self.subTest(route=str(path.relative_to(DIST))):
                page=Page(path);self.assertEqual(len(page.ids),len(set(page.ids)))
                for ref in page.references:
                    u=urlsplit(ref)
                    if u.scheme or u.netloc: continue
                    if u.path.startswith('/'):
                        target=DIST/unquote(u.path.lstrip('/'))
                        if target.is_dir(): target=target/'index.html'
                        self.assertTrue(target.exists(),ref)
                    elif ref.startswith('#'):
                        self.assertIn(u.fragment,page.ids,ref)
    def test_three_distinct_directions_on_both_buyer_pages(self):
        for path in (DIST/'index.html',DIST/'pixel/index.html'):
            self.assertEqual(set(Page(path).directions),{'essential','editorial','immersive'})
    def test_pixel_reuses_viewers_with_only_its_own_inventory(self):
        page=Page(DIST/'pixel/index.html');data=json.loads(page.feed)
        self.assertEqual([p['slug'] for p in data['projects']],['pixel'])
        self.assertTrue(data['sample'])
        for id in ('project-explorer','demo-medio','demo-alto','elev','scene3d','tour3d','unit3d-select'):
            self.assertIn(id,page.ids)
        self.assertLess(page.scripts.index('/viewer-controls.js'),page.scripts.index('/proforma.js'))
    def test_proforma_keeps_all_three_projects(self):
        self.assertEqual(len(json.loads(Page(DIST/'proforma/index.html').feed)['projects']),3)

if __name__=='__main__': unittest.main()
