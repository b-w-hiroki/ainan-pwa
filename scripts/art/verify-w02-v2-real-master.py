#!/usr/bin/env python3
"""Fail-closed admission test for W02-v2 recovered master, NOT an art approval.

The known 1536x1024 RGB original has an immutable measured SHA-256. An
arbitrary generated image with similar composition MUST NOT silently stand in
for that source. The already-committed splitter is the actual source of masks.
"""
import argparse
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
from PIL import Image, ImageChops

ORIGINAL_SHA256='0b12f339a946deb17370528b82f9623a450966db13e4727bcd50f9b1ddd7d274'
EXPECTED_DIMS=(1536,1024)
ROOT=Path(__file__).resolve().parents[2]
SCRIPT=ROOT/'scripts/art/split-w02-v2-source.py'
spec=importlib.util.spec_from_file_location('w02_v2_split',SCRIPT)
splitter=importlib.util.module_from_spec(spec)
spec.loader.exec_module(splitter)

def verify(source: Path, out: Path, *, expected_hash: str = ORIGINAL_SHA256,
           synthetic: bool = False):
    if not synthetic and expected_hash != ORIGINAL_SHA256:\n        raise ValueError('Only the canonical recorded W02-v2 SHA-256 is allowed for real art')\n    if not source.is_file():
        raise FileNotFoundError('Missing W02-v2 source original PNG: '+str(source))
    digest=sha256(source.read_bytes()).hexdigest()
    if digest != expected_hash:
        raise ValueError('W02-v2 original SHA-256 mismatch: '+digest)
    with Image.open(source) as im:
        if im.format != 'PNG' or im.size != EXPECTED_DIMS or im.mode != 'RGB':
            raise ValueError('Expected actual 1536x1024 RGB PNG master')
    report=splitter.split(source,out)
    if not report['exactSourceReassembly']:
        raise AssertionError('Source reassembly failed')
    with Image.open(source) as master:
        original=master.convert('RGB')
    merged=Image.new('RGBA',EXPECTED_DIMS,(0,0,0,0))
    fullyOpaquePixels=0
    for layer in ('far','sea','quay'):
        path=out/(layer+'.png')
        with Image.open(path) as raw:
            candidate=raw.convert('RGBA')
        if candidate.size!=EXPECTED_DIMS:raise AssertionError('Wrong dimensions '+layer)
        extrema=candidate.getchannel('A').getextrema()
        if extrema[1] != 255: raise AssertionError('Empty layer '+layer)
        fullyOpaquePixels+=candidate.getchannel('A').histogram()[255]
        merged.alpha_composite(candidate)
    if fullyOpaquePixels != EXPECTED_DIMS[0]*EXPECTED_DIMS[1]:
        raise AssertionError('Masks overlap or have missing pixels')
    if ImageChops.difference(merged.convert('RGB'),original).getbbox() is not None:
        raise AssertionError('RGBA layering is not pixel identical')
    artifact={
        'workUnit':218,
        'originalSha256':digest,'sourceDimensions':list(EXPECTED_DIMS),
        'layers':['far','sea','quay'],
        'pixelExact':True,'syntheticTest':synthetic,
        'realSourceVerified':not synthetic,
        'inGitHub':False, # Runtime caller updates only after a real binary Git commit.
        'artApproved':False,'productionSwitched':False,
        'fullWorldCovered':False,'requiredFullWorld':[2160,1800],
        'knownLimitations':[
           'Visible boats and handrails cross coarse polygon cut-lines',
           'Native source is smaller than camera world and needs authored open-sea continuation',
           'Human visual review and physical phone QA not complete',
        ]
    }
    (out/'real-source-acceptance.json').write_text(json.dumps(artifact,indent=2)+'\n')
    return artifact

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--source',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--expected-sha256',default=ORIGINAL_SHA256)
    p.add_argument('--synthetic',action='store_true',help='Explicit separate non-art fixture')
    a=p.parse_args()
    print(json.dumps(verify(a.source,a.out,expected_hash=a.expected_sha256,
                            synthetic=a.synthetic),indent=2))
