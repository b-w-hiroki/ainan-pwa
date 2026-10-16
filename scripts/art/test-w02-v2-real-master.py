#!/usr/bin/env python3
"""Negative-controls for source identity without claiming synthetic visual art."""
from pathlib import Path
from tempfile import TemporaryDirectory
from hashlib import sha256
import importlib.util
import json

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('w02_checker',ROOT/'scripts/art/verify-w02-v2-real-master.py')
check=importlib.util.module_from_spec(spec);spec.loader.exec_module(check)
splitSpec=importlib.util.spec_from_file_location('w02_split',ROOT/'scripts/art/split-w02-v2-source.py')
split=importlib.util.module_from_spec(splitSpec);splitSpec.loader.exec_module(split)
sourceMeta=json.loads((ROOT/'fishing-game/assets/candidates/w02-harbor-v2/manifest.json').read_text())
assert sourceMeta['source']['sha256']==check.ORIGINAL_SHA256
assert sourceMeta['source']['inGitHub'] is False
assert sourceMeta['production'] is False
assert sourceMeta['artApproved'] is False
with TemporaryDirectory() as tmp:
    tmp=Path(tmp)
    source=split.synthetic_test(tmp/'SYNTHETIC-NOT-ART.png')
    checksum=sha256(source.read_bytes()).hexdigest()
    assert checksum!=check.ORIGINAL_SHA256
    try:
        check.verify(source,tmp/'reject-default')
    except ValueError as exc:
        assert 'SHA-256 mismatch' in str(exc)
    else: raise AssertionError('Bogus art master passed immutable original identity gate')

    result=check.verify(source,tmp/'valid-synthetic',expected_hash=checksum,synthetic=True)
    assert result['pixelExact'] and result['syntheticTest']
    assert not result['realSourceVerified']
    assert not result['artApproved'] and not result['productionSwitched']
    assert not result['fullWorldCovered']
    assert sum((tmp/'valid-synthetic'/part).stat().st_size>0 for part in ('far.png','sea.png','quay.png'))==3

    invalid=tmp/'wrong-dimensions.png'
    from PIL import Image
    Image.new('RGB',(1520,1024),color=(25,63,99)).save(invalid)
    invalidSha=sha256(invalid.read_bytes()).hexdigest()
    try:check.verify(invalid,tmp/'reject-dim',expected_hash=invalidSha,synthetic=True)
    except ValueError as exc:assert '1536x1024 RGB' in str(exc)
    else:raise AssertionError('Wrong canvas passed')
print('W02 v2 real-source strict hash/dimensions, mask fidelity and synthetic non-art flag PASS')
