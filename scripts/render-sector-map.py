"""Render the no-WebGL fallback from Three.js geometry using a software depth buffer.
Requires Node, Pillow and NumPy. No browser or network access is used.
"""
import json
import subprocess
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as tmp:
    data_path = Path(tmp) / 'scene.json'
    subprocess.run(['node', str(ROOT / 'scripts/render-sector-map.cjs'), str(data_path)], check=True)
    data = json.loads(data_path.read_text())
w, h = data['width'], data['height']
y, x = np.mgrid[0:h, 0:w]
distance = np.minimum(1, np.sqrt(((x-w*.5)/(w*.65))**2 + ((y-h*.46)/(h*.65))**2))[..., None]
pixels = (np.array([52,85,75]) * (1-distance) + np.array([16,30,32]) * distance).astype(np.uint8)
depth = np.full((h,w), np.inf)
for face in data['faces']:
    a,b,c = np.array(face['points'])
    x0=max(0,int(min(a[0],b[0],c[0])));x1=min(w-1,int(max(a[0],b[0],c[0]))+1)
    y0=max(0,int(min(a[1],b[1],c[1])));y1=min(h-1,int(max(a[1],b[1],c[1]))+1)
    if x1<x0 or y1<y0: continue
    yy,xx=np.mgrid[y0:y1+1,x0:x1+1];xx=xx+.5;yy=yy+.5
    denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(denominator)<1e-8: continue
    aa=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/denominator
    bb=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/denominator
    cc=1-aa-bb
    zz=aa*a[2]+bb*b[2]+cc*c[2]
    mask=(aa>=-.001)&(bb>=-.001)&(cc>=-.001)&(zz<depth[y0:y1+1,x0:x1+1])
    depth[y0:y1+1,x0:x1+1][mask]=zz[mask]
    colour=tuple(int(face['colour'][i:i+2],16) for i in (1,3,5))
    pixels[y0:y1+1,x0:x1+1][mask]=colour
im=Image.fromarray(pixels).convert('RGBA')
# Transparent surroundings let each of the three CSS themes frame the same model.
alpha=np.where(np.isfinite(depth),255,0).astype(np.uint8)
im.putalpha(Image.fromarray(alpha))
draw=ImageDraw.Draw(im)
try: font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',18)
except OSError: font=ImageFont.load_default()
for i,(key,(x,y,_)) in enumerate(data['places'].items()):
    width=190 if key=='pixel' else 140
    left=x-width/2;top=y-54
    draw.line([(x,top+38),(x,y)],fill='#dce7ad',width=2)
    draw.rounded_rectangle((left,top,left+width,top+38),radius=3,fill='#e0ebae' if i==0 else '#192e2d',outline='#91a18c')
    draw.text((x,top+20),f'0{i+1} · '+{'pixel':'Residencia 01','metro':'Transporte','coral':'Comercio'}[key],anchor='mm',font=font,fill='#192e2d' if i==0 else '#eeeede')
output=ROOT/'dist/assets/sector-map.png'
im.save(output,optimize=True)
print(f'Rendered {output.name} ({output.stat().st_size//1024} KB)')
