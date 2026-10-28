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
        if tag=='script' and a.get('src'): self.scripts.append(urlsplit(a['src']).path)
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
                        if u.fragment and target.suffix=='.html':
                            self.assertIn(u.fragment,Page(target).ids,ref)
                    elif ref.startswith('#'):
                        self.assertIn(u.fragment,page.ids,ref)
    def test_one_complete_experience_and_legacy_routes(self):
        source=(DIST/'proyecto/index.html').read_text()
        page=Page(DIST/'proyecto/index.html');data=json.loads(page.feed)
        self.assertTrue(data['sample']);self.assertEqual(len(data['project']['units']),72)
        for id in ('architecture','floor','bedrooms','available','unit-list','selected-home','enquire'):
            self.assertIn(id,page.ids)
        self.assertEqual(source.count('data-step='),4)
        for alias in ('pixel','comparar'):
            self.assertEqual((DIST/alias/'index.html').read_text(),source)
        self.assertLess(page.scripts.index('/viewer-controls.js'),page.scripts.index('/architecture.js'))
        self.assertLess(page.scripts.index('/architecture.js'),page.scripts.index('/premium.js'))
        self.assertNotIn('/vendor/three.min.js',page.scripts)

    def test_no_raster_images_or_tier_interfaces_are_published(self):
        self.assertFalse([p for p in DIST.rglob('*') if p.suffix in ('.png','.jpg','.jpeg','.webp','.gif')])
        for path in list(DIST.rglob('*.html'))+list(DIST.glob('*.js')):
            source=path.read_text().lower()
            for term in ('<img','textureloader','data-tier','data-direction','compare options','comparar opciones','tres niveles','three tiers'):
                self.assertNotIn(term,source,str(path))

    def test_management_retains_three_projects_and_feed(self):
        page=Page(DIST/'demo/index.html')
        self.assertEqual(len(json.loads(page.feed)['projects']),3)
        for id in ('cms','out-card','out-feed','wa-form'):
            self.assertIn(id,page.ids)
        self.assertIn('/management.js',page.scripts)

    def test_reusable_demo_has_no_client_brand_or_commercial_quote(self):
        forbidden=('alpha builders','alphabuilders','pixel.com.ec','contacto@pixel','41.990','46.990','49.990','zolutium','16 sitios','15 sitios','data-price=','RUC 17')
        for path in list(DIST.rglob('*.html'))+list(DIST.glob('*.js'))+list(DIST.rglob('*.json')):
            text=path.read_text().lower()
            for term in forbidden:
                self.assertNotIn(term.lower(),text,str(path))
        for path in DIST.rglob('*.html'):
            for ref in Page(path).references:
                self.assertNotIn('.example',urlsplit(ref).netloc,ref)
        self.assertEqual((DIST/'demo/index.html').read_text(),(DIST/'proforma/index.html').read_text())
        self.assertIn('alvaroipazr@gmail.com',(DIST/'contacto/index.html').read_text())

if __name__=='__main__': unittest.main()
