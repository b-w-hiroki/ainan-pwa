#!/usr/bin/env python3
"""W03 QA: place the independent body PNGs (docs/art-source/harbor-character-v2) into
640x840 pose frames (same 320:420 aspect as the existing animation-v1 frames) so the
live GameScene can show them. Pixels are only cropped/scaled uniformly and moved;
nothing is redrawn. Same scale for both poses of a body, feet-centre aligned.
Never approves art or switches production."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path('docs/art-source/harbor-character-v2')
FRAME = (640, 840)
FEET_X, FEET_Y = 320, 828          # feet centre inside the frame
TARGET_H = 760                      # person height inside the frame
# Fist (grip) position measured on the 1254px source images.
GRIP_SRC = {'a': {'idle': (815, 468), 'castWindup': (440, 205)},
            'b': {'idle': (815, 468), 'castWindup': (440, 205)}}

def feet_center(a):
    ys, xs = np.where(a > 20)
    y1 = ys.max(); band = np.where((a > 20) & (np.arange(a.shape[0])[:, None] > y1 - 0.05 * (y1 - ys.min())))
    return float(band[1].mean()), int(y1), int(ys.min())

def build(body, out):
    out.mkdir(parents=True, exist_ok=True)
    names = {'idle': f'W03-BODY-{body.upper()}-idle-v2.png', 'castWindup': f'W03-BODY-{body.upper()}-windup-v2.png'}
    idle = Image.open(SRC / names['idle']).convert('RGBA')
    fx, y1, y0 = feet_center(np.asarray(idle)[..., 3])
    scale = TARGET_H / (y1 - y0)
    info = {'body': body, 'scale': scale, 'poses': {}}
    for pose, name in names.items():
        im = Image.open(SRC / name).convert('RGBA')
        fcx, fy1, _ = feet_center(np.asarray(im)[..., 3])
        w, h = round(im.width * scale), round(im.height * scale)
        im2 = im.resize((w, h), Image.LANCZOS)
        ox, oy = round(FEET_X - fcx * scale), round(FEET_Y - fy1 * scale)
        frame = Image.new('RGBA', FRAME, (0, 0, 0, 0))
        frame.alpha_composite(im2, (ox, oy)) if ox >= 0 and oy >= 0 else frame.paste(im2, (ox, oy), im2)
        gx, gy = GRIP_SRC[body][pose]
        grip = [round((gx * scale + ox) / 2, 1), round((gy * scale + oy) / 2, 1)]   # 320x420 frame units
        file = 'idle.png' if pose == 'idle' else 'cast-windup.png'
        frame.save(out / file, optimize=True)
        info['poses'][pose] = {'file': file, 'grip': grip, 'offset': [ox, oy]}
    (out / 'poses.json').write_text(json.dumps(info, indent=2) + '\n')
    return info

CUTE = Path('docs/art-source/w03-cute-body')
CUTE_VARIANTS = {
    'cute-a-01': 'W03-CUTE-A-idle-01.png', 'cute-a-02': 'W03-CUTE-A-idle-02.png', 'cute-a-03': 'W03-CUTE-A-idle-03.png',
    'cute-b-01': 'W03-CUTE-B-idle-01.png', 'cute-b-02': 'W03-CUTE-B-idle-02.png', 'cute-b-03': 'W03-CUTE-B-idle-03.png',
    'cute-b-01-v2': 'W03-CUTE-B-idle-01-v2.png', 'cute-b-02-v2': 'W03-CUTE-B-idle-02-v2.png', 'cute-b-03-v2': 'W03-CUTE-B-idle-03-v2.png',
}

def hand_point(a):
    # The held fist is the right-most opaque part of the arm band at 38-62% of the body height.
    ys, xs = np.where(a > 20); y0, y1 = ys.min(), ys.max(); h = y1 - y0
    band = (np.arange(a.shape[0])[:, None] >= y0 + .38 * h) & (np.arange(a.shape[0])[:, None] <= y0 + .62 * h)
    cols = np.where(((a > 20) & band).any(axis=0))[0]; xr = cols.max()
    near = np.where((a > 20) & band & (np.arange(a.shape[1])[None, :] >= xr - 45))
    return float(xr - 28), float(near[0].mean())

CUTE_WINDUP = {'cute-a-01': 'W03-CUTE-A-cast-windup.png', 'cute-b-01': 'W03-CUTE-B-cast-windup.png'}
POSES_DIR = Path('docs/art-source/w03-cute-poses')

def windup_point(a):
    # The raised fist is the left-most opaque part of the upper half of the body.
    ys, xs = np.where(a > 20); y0, y1 = ys.min(), ys.max(); h = y1 - y0
    band = (np.arange(a.shape[0])[:, None] <= y0 + .5 * h)
    cols = np.where(((a > 20) & band).any(axis=0))[0]; xl = cols.min()
    near = np.where((a > 20) & band & (np.arange(a.shape[1])[None, :] <= xl + 70))
    top = near[0].min()          # fist = the topmost blob among the left-most pixels
    fist = near[0] <= top + 70
    return float(near[1][fist].mean()), float(near[0][fist].mean())

def build_cute(vid, name, out):
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(CUTE / name).convert('RGBA'); a = np.asarray(im)[..., 3]
    fcx, fy1, fy0 = feet_center(a); scale = TARGET_H / (fy1 - fy0)
    w, h = round(im.width * scale), round(im.height * scale)
    im2 = im.resize((w, h), Image.LANCZOS)
    ox, oy = round(FEET_X - fcx * scale), round(FEET_Y - fy1 * scale)
    frame = Image.new('RGBA', FRAME, (0, 0, 0, 0)); frame.paste(im2, (ox, oy), im2)
    gx, gy = hand_point(a)
    grip = [round((gx * scale + ox) / 2, 1), round((gy * scale + oy) / 2, 1)]
    frame.save(out / 'idle.png', optimize=True)
    info = {'body': vid, 'scale': scale, 'source': name, 'poses': {'idle': {'file': 'idle.png', 'grip': grip, 'offset': [ox, oy]}}}
    if vid in CUTE_WINDUP:   # same scale/offset as idle: the windup sprite shares the idle canvas and feet
        wi = Image.open(POSES_DIR / CUTE_WINDUP[vid]).convert('RGBA')
        wf = Image.new('RGBA', FRAME, (0, 0, 0, 0)); wf.paste(wi.resize((w, h), Image.LANCZOS), (ox, oy), wi.resize((w, h), Image.LANCZOS))
        wx, wy = windup_point(np.asarray(wi)[..., 3])
        wf.save(out / 'cast-windup.png', optimize=True)
        info['poses']['castWindup'] = {'file': 'cast-windup.png', 'source': CUTE_WINDUP[vid],
                                       'grip': [round((wx * scale + ox) / 2, 1), round((wy * scale + oy) / 2, 1)], 'offset': [ox, oy]}
    (out / 'poses.json').write_text(json.dumps(info, indent=2) + '\n')
    return info

if __name__ == '__main__':
    for vid, name in CUTE_VARIANTS.items():
        print(json.dumps(build_cute(vid, name, Path(f'fishing-game/assets/candidates/w03-body-{vid}'))))
    for b in ('a', 'b'):
        print(json.dumps(build(b, Path(f'fishing-game/assets/candidates/w03-body-{b}'))))
