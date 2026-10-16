#!/usr/bin/env python3
"""W02 v2 image-layer preparation. Never auto-approves candidate art.

Input: an independent 1536x1024 person-free harbor RGB PNG.
Output: far/sea/quay RGBA assets and JSON with source/output SHA-256.
The source master is intentionally NOT fabricated or baked into this script.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

EXPECTED = (1536, 1024)
SEA_EDGE = [(0, 500), (100, 492), (220, 485), (400, 470),
            (600, 449), (750, 432), (1000, 429), (1300, 439), (1535, 456)]
QUAY_EDGE = [(0, 725), (55, 711), (105, 706), (164, 720),
             (212, 715), (246, 710), (306, 736), (374, 758),
             (430, 790), (502, 806), (562, 824), (657, 852),
             (760, 881), (855, 910), (940, 945), (1005, 970), (1130, 1023)]
QUAY_RAIL_AND_TOOLS = [
    [(0, 516), (31, 514), (40, 640), (75, 718), (0, 751)],
    [(30, 572), (168, 572), (187, 750), (53, 742)],
    # The bollard top/neck and its mooring rope are a near-field dock prop.
    # Previous v2 alpha mistakenly assigned 4891 of these pixels to SEA,
    # making the bollard float if sea and dock layers animate independently.
    # Source-master pixel coordinates; do not copy, inpaint, or redraw the prop.
    [(290, 738), (294, 712), (311, 698), (323, 690), (357, 689),
     (376, 698), (389, 714), (391, 733), (377, 752), (385, 762),
     (408, 773), (402, 787), (362, 798), (316, 793), (293, 776)],
]

def checksum(path):
    return sha256(Path(path).read_bytes()).hexdigest()

def split(source_path, output_dir):
    source = Path(source_path)
    output_dir = Path(output_dir)
    if not source.is_file():
        raise FileNotFoundError(f"Source master is not checked in: {source}")
    original = Image.open(source).convert('RGB')
    if original.size != EXPECTED:
        raise ValueError(f"Input frame {original.size} differs from v2 candidate {EXPECTED}")
    w,h = original.size
    sea = Image.new('L', EXPECTED, 0)
    ImageDraw.Draw(sea).polygon(SEA_EDGE + [(w-1,h-1), (0,h-1)], fill=255)
    quay = Image.new('L', EXPECTED, 0)
    p = ImageDraw.Draw(quay)
    p.polygon(QUAY_EDGE + [(w-1,h-1), (0,h-1)], fill=255)
    for polygon in QUAY_RAIL_AND_TOOLS:
        p.polygon(polygon, fill=255)

    # Disjoint masks: pixel-exact reassembly is a stronger check than only
    # matching canvas bounds and protects against 1px unfilled black seams.
    sea.paste(0, mask=quay)
    union = ImageChops.lighter(sea,quay)
    far = ImageChops.invert(union)
    masks = {'far':far,'sea':sea,'quay':quay}
    output_dir.mkdir(parents=True, exist_ok=True)
    rebuilt = Image.new('RGB', EXPECTED)
    assets = {}
    for layer,mask in masks.items():
        # Save transparent pixels with zero RGB instead of leaving the full
        # source scene hidden under alpha=0. This prevents bilinear-color fringe
        # contamination when the layers are resampled in Phaser/WebGL.
        rgba = Image.new('RGBA', EXPECTED, (0,0,0,0))
        rgba.paste(original.convert('RGBA'), (0,0), mask)
        file = output_dir / f'{layer}.png'
        rgba.save(file,optimize=True)
        rebuilt.paste(original,(0,0),mask)
        assets[layer]={'path':file.name,'sha256':checksum(file),
                       'opaquePixels':mask.histogram()[255],
                       'alphaMode':'opaque' if layer == 'far' else 'transparent'}

    diff = ImageChops.difference(original,rebuilt)
    if diff.getbbox() is not None:
        raise AssertionError('Mask geometry lost pixels or left source holes')
    rebuilt.save(output_dir / 'reassembled.png',optimize=True)
    report = {
        'schemaVersion':1,'workUnit':'W02','candidateId':'w02-harbor-v2-split-source',
        'source':source.name,'sourceSha256':checksum(source),
        'sourceDimensions':[w,h],'exactSourceReassembly':True,
        'sourceImageCheckedIntoRepo':False,
        'artApproved':False,'productionSwitched':False,
        'fullCameraWorldCovered':False,'realGameSceneQa':False,
        'technique':'Manually authored disjoint material polygons; no clone/inpaint/stretch',
        'limitations':[
            'Semantic seams around boats, ladders and horizon need visual correction',
            '1536x1024 source is smaller than QA 2160x1800 world; cannot serve full camera travel',
            'Do not register this as a release asset or upscale the source to cover missing ocean',
            'Actor/outfit/rod/companion belong to independent W03 units'],
        'assets':assets}
    (output_dir / 'manifest.json').write_text(
        json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return report

def synthetic_test(path):
    img=Image.new('RGB',EXPECTED)
    d=ImageDraw.Draw(img)
    for y in range(EXPECTED[1]):
        d.line((0,y,EXPECTED[0],y),fill=(
            max(0, min(255, 40+y//6)),
            max(0, min(255, 110+y//9)),
            max(0, min(255, 200-y//8))))
    img.save(path)
    return path

if __name__=='__main__':
    a=argparse.ArgumentParser()
    a.add_argument('--source',type=Path)
    a.add_argument('--out',required=True,type=Path)
    a.add_argument('--synthetic',action='store_true')
    args=a.parse_args()
    source=args.source
    if args.synthetic:
        args.out.mkdir(parents=True,exist_ok=True)
        source=synthetic_test(args.out / 'qa-SYNTHETIC-NOT-ART.png')
    if source is None:
        a.error('--source is required unless --synthetic is selected')
    report=split(source,args.out)
    assert not report['artApproved'] and not report['productionSwitched']
    print(json.dumps({'sourceSha256':report['sourceSha256'],
                      'layers':list(report['assets']),
                      'pixelExact':report['exactSourceReassembly'],
                      'artApproved':report['artApproved']},ensure_ascii=False))
