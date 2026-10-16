#!/usr/bin/env python3
"""W03 body alpha structural contract: synthetic positive + false-approval negatives."""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('w03_body', ROOT/'scripts/art/validate-w03-body-alpha.py')
check=importlib.util.module_from_spec(spec);spec.loader.exec_module(check)

def fails(source,variant='body-a',phase='idle'):
    try:check.inspect_body(source,variant,phase)
    except (ValueError, FileNotFoundError):return
    raise AssertionError('Body-only checker accepted invalid source: '+str(source))

with TemporaryDirectory() as root:
    p=Path(root)
    # Procedural mannequin is NOT production art. It exists only to test
    # coordinate/alpha rules without accidentally approving a new sprite.
    img=Image.new('RGBA',(320,420),(0,0,0,0))
    d=ImageDraw.Draw(img)
    d.ellipse((130,71,184,132),fill=(170,124,91,255))
    d.rounded_rectangle((118,132,194,247),14,fill=(139,113,93,255))
    d.polygon(((118,150),(95,230),(106,238),(147,186)),fill=(170,124,91,255))
    d.polygon(((184,154),(214,228),(201,237),(169,190)),fill=(170,124,91,255))
    d.polygon(((126,237),(141,375),(157,375),(159,242)),fill=(139,113,93,255))
    d.polygon(((171,237),(166,375),(188,375),(193,242)),fill=(139,113,93,255))
    valid=p/'VALID-SYNTHETIC-NOT-ART.png'
    img.save(valid)
    result=check.inspect_body(valid,'body-a','idle',synthetic=True)
    assert result['independentAlphaStructurallyReady'] and not result['artApproved']
    assert not result['sourceReviewed'] and not result['gameplayIntegrated']
    assert result['syntheticFixture']
    assert result['bbox'][3] > 345

    opaque=p/'game-shot.png'
    Image.new('RGBA',(320,420),(16,132,155,255)).save(opaque)
    fails(opaque)
    full=p/'rgb-only.png'
    Image.new('RGB',(320,420),(45,91,170)).save(full)
    fails(full)
    tiny=p/'tiny.png'
    Image.new('RGBA',(200,300),(0,0,0,0)).save(tiny)
    fails(tiny)
    clipped=p/'touches-border.png'
    out=img.copy()
    ImageDraw.Draw(out).rectangle((0,50,50,90),fill=(170,111,92,255))
    out.save(clipped)
    fails(clipped)
    empty=p/'empty.png'
    Image.new('RGBA',(320,420),(0,0,0,0)).save(empty)
    fails(empty)
    fails(valid,'body-c')
    fails(valid,phase='castUnknown')
print('W03 isolated actor alpha + all opaque/screenshot/missing/misframed negative controls PASS (not art approval)')
