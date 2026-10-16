#!/usr/bin/env python3
"""Validate structural alpha readiness of W03 body-only 320x420 sprites.

This cannot evaluate aesthetic quality, detect clothing semantics, or certify
ownership of accessories. It explicitly rejects normal opaque game/UI images.
"""
import argparse
import json
from pathlib import Path
from PIL import Image

FRAME = (320, 420)
MIN_OPAQUE = 1500
MAX_OPAQUE_FRACTION = 0.68
BODY_VARIANTS = ('body-a','body-b')
PHASES = ('idle','castWindup','castRelease','retrieve','fightMid','joyHold','sadSlump')

def inspect_body(path, variant, phase, *, synthetic=False):
    if variant not in BODY_VARIANTS:raise ValueError('Unknown W03 body variant')
    if phase not in PHASES:raise ValueError('Unknown W03 body pose')
    path = Path(path)
    if not path.is_file():raise FileNotFoundError(f'W03 sprite file missing: {path}')
    with Image.open(path) as src:
        if src.format != 'PNG' or src.mode != 'RGBA' or src.size != FRAME:
            raise ValueError('W03 body-only source must be 320x420 RGBA PNG')
        alpha = src.getchannel('A')
        hist = alpha.histogram()
        fully_opaque = hist[255]
        total = FRAME[0]*FRAME[1]
        if fully_opaque < MIN_OPAQUE:
            raise ValueError('W03 sprite contains no substantial body pixels')
        if fully_opaque/total > MAX_OPAQUE_FRACTION:
            raise ValueError('W03 source is mostly opaque; game screenshot/UI likely baked in')
        # A true independent pose must not bleed scenery around its edges.
        for crop in ((0,0,FRAME[0],2),(0,FRAME[1]-2,FRAME[0],FRAME[1]),
                     (0,0,2,FRAME[1]),(FRAME[0]-2,0,FRAME[0],FRAME[1])):
            if alpha.crop(crop).getextrema()[1] > 0:
                raise ValueError('W03 pose is clipped or baked into its outer canvas')
        bbox = alpha.getbbox()
        if bbox is None:raise AssertionError('Empty W03 pose')
        if not (45 < bbox[0] and bbox[2] < FRAME[0]-15
                and 20 < bbox[1] and bbox[3] > 345):
            raise ValueError('Body silhouette not grounded near central feet socket')
        # Refuse entirely opaque interior background; bbox opacity alone cannot
        # guarantee body-only, so these are necessary but not sufficient checks.
        return {
            'variant':variant,'phase':phase,'sourceFile':path.name,'size':[320,420],
            'fullyOpaquePixels':fully_opaque,'alphaFraction':round(fully_opaque/total,5),
            'bbox':list(bbox),'syntheticFixture':synthetic,
            'independentAlphaStructurallyReady':True,'artApproved':False,
            'gameplayIntegrated':False,'sourceReviewed':False,
        }

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--file',type=Path,required=True)
    p.add_argument('--variant',choices=BODY_VARIANTS,required=True)
    p.add_argument('--phase',choices=PHASES,required=True)
    p.add_argument('--synthetic',action='store_true')
    a=p.parse_args()
    print(json.dumps(inspect_body(a.file,a.variant,a.phase,synthetic=a.synthetic),indent=2))
