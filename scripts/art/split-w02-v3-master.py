#!/usr/bin/env python3
"""W02 v3: split the single approved-for-evaluation harbor master into
far / sea / quay layers by hard-edged masks. Source pixels are copied, never
redrawn, so the three layers re-assemble to the source exactly.
Does not approve art or switch production."""
import argparse, json
from hashlib import sha256
from pathlib import Path
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SIZE = (1536, 1024)
HORIZON = [(1535, 162), (700, 162), (500, 170), (430, 196), (300, 203),
           (115, 200), (70, 215), (0, 215)]

def sha(p): return sha256(Path(p).read_bytes()).hexdigest()

def masks(src):
    a = np.asarray(src).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    stone = ((R > B + 15) & (R >= G - 5))
    region = np.zeros(stone.shape, bool); region[560:, :460] = True
    q = Image.fromarray(((stone & region) * 255).astype('uint8'))
    q = q.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))   # close grass/crack gaps
    q = q.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))   # drop specks
    q = q.point(lambda v: 255 if v > 127 else 0)
    qa = np.asarray(q) > 0                      # the quay is one solid wedge: fill each row up to its stone edge
    for y in range(qa.shape[0]):
        xs = np.where(qa[y])[0]
        if len(xs): qa[y, :xs.max() + 1] = True
    q = Image.fromarray((qa * 255).astype('uint8'))
    far = Image.new('L', SIZE, 0)
    ImageDraw.Draw(far).polygon([(0, 0), (1535, 0)] + HORIZON, fill=255)
    far.paste(0, mask=q)
    sea = ImageChops.invert(ImageChops.lighter(far, q))
    return {'far': far, 'sea': sea, 'quay': q}

def split(source, out):
    src = Image.open(source).convert('RGB')
    if src.size != SIZE: raise ValueError(f'unexpected size {src.size}')
    out.mkdir(parents=True, exist_ok=True)
    rebuilt = Image.new('RGB', SIZE); assets = {}
    for name, m in masks(src).items():
        rgba = Image.new('RGBA', SIZE, (0, 0, 0, 0))
        rgba.paste(src.convert('RGBA'), (0, 0), m)
        f = out / f'{name}.png'; rgba.save(f, optimize=True)
        rebuilt.paste(src, (0, 0), m)
        assets[name] = {'path': f.name, 'sha256': sha(f), 'opaquePixels': m.histogram()[255]}
    if ImageChops.difference(src, rebuilt).getbbox() is not None:
        raise AssertionError('layers do not reassemble to the source')
    rep = {'workUnit': 'W02', 'candidateId': 'w02-harbor-v3-split',
           'source': Path(source).name, 'sourceSha256': sha(source), 'sourceDimensions': list(SIZE),
           'exactSourceReassembly': True, 'artApproved': False, 'productionSwitched': False,
           'limitations': ['1536x1024 is half the requested 3072x2048; needs human size/quality review',
                           'edges are hard masks and need visual review on town/breakwater seams',
                           'props (decor) and FX are not separated from this master'],
           'assets': assets}
    (out / 'manifest.json').write_text(json.dumps(rep, indent=2) + '\n')
    return rep

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--source', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True); a = ap.parse_args()
    r = split(a.source, a.out)
    print(json.dumps({k: v['opaquePixels'] for k, v in r['assets'].items()}))
