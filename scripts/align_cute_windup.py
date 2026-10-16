"""Align windup sprites using the approved idle lower body (Pillow + NumPy)."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-source/w03-cute-poses'

def process(letter):
    name = f'W03-CUTE-{letter}-cast-windup.png'
    source = OUT / 'source' / name
    source.parent.mkdir(exist_ok=True)
    if not source.exists():
        source.write_bytes((OUT / name).read_bytes())
    idle = Image.open(ROOT / f'docs/art-source/w03-cute-body/W03-CUTE-{letter}-idle-01.png').convert('RGBA')
    raw = Image.open(source).convert('RGBA')
    dst = np.array(idle)
    # Work in premultiplied alpha to avoid colored fringes during interpolation.
    src = np.array(raw).astype(float) / 255
    src[:, :, :3] *= src[:, :, 3:4]
    ref = dst.astype(float) / 255
    ref[:, :, :3] *= ref[:, :, 3:4]
    sb = raw.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    tb = idle.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
    scale = (tb[3] - tb[1]) / (sb[3] - sb[1])
    ty = tb[1] - sb[1] * scale
    tx = 60 if letter == 'B' else 0
    result = ref.copy()
    grid = np.arange(1254)
    for y in range(750):
        torso_extension = 22 * np.clip((y - 550) / 160, 0, 1) if letter == 'B' else 0
        sy = (y - ty - torso_extension) / scale
        if sy < 0 or sy >= 1253:
            row = np.zeros((1254, 4))
        else:
            iy = int(sy)
            row = src[iy] * (1 - (sy - iy)) + src[iy + 1] * (sy - iy)
        sx = (grid - tx) / scale
        # Gradually match torso silhouette near the shirt/shorts seam.
        if y >= 650:
            bounds = np.where(row[:, 3] >= .5)[0]
            target = np.where(ref[max(y, 710), :, 3] >= .5)[0]
            if len(bounds) and len(target):
                weight = min(1, (y - 650) / 60)
                mapped = bounds[0] + (grid - target[0]) * (bounds[-1] - bounds[0]) / max(1, target[-1] - target[0])
                sx = sx * (1 - weight) + mapped * weight
        sampled = np.stack([np.interp(sx, grid, row[:, c], left=0, right=0) for c in range(4)], axis=1)
        blend = np.clip((y - 710) / 40, 0, 1)
        result[y] = sampled * (1 - blend) + ref[y] * blend
    alpha = result[:, :, 3:4]
    rgb = np.divide(result[:, :, :3], alpha, out=np.zeros_like(result[:, :, :3]), where=alpha > 0)
    final = np.rint(np.clip(np.concatenate([rgb, alpha], axis=2), 0, 1) * 255).astype('uint8')
    # Preserve lower-body pixels exactly, including feet and their alpha edges.
    final[750:] = dst[750:]
    Image.fromarray(final).save(OUT / name)
    assert np.array_equal(final[750:], dst[750:])
    return {'file': name, 'size': [1254, 1254], 'lowerBodyFromRow': 750,
            'lowerBodyPixelIdenticalToIdle': True, 'idleVisibleBounds': tb,
            'sourceScale': scale, 'sourceOffsetY': ty}

if __name__ == '__main__':
    report = [process(letter) for letter in 'AB']
    (OUT / 'alignment-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
