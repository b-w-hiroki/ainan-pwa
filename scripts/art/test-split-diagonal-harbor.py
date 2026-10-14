#!/usr/bin/env python3
"""Tests cannot use an uncommitted generated image or imply its art approval."""
import json
import tempfile
from importlib.machinery import SourceFileLoader
from pathlib import Path
from PIL import Image

split=SourceFileLoader("harbor_split",str(Path(__file__).with_name("split-diagonal-harbor-review.py"))).load_module()
with tempfile.TemporaryDirectory() as folder:
    tmp=Path(folder)
    for width,height in ((941,1672),(470,836)):
        master=tmp/f"test-{width}.png"
        im=Image.new("RGBA",(width,height))
        px=im.load()
        for y in range(height):
            for x in range(width):
                px[x,y]=(x%256,y%256,(x+y)%256,255)
        im.save(master)
        result=split.run(master,tmp/f"out-{width}")
        assert result["pixel_exact_recomposition"]
        assert not result["production_promoted"]
        assert not result["animation_ready"]
        assert not result["hidden_structure_reconstructed"]
        assert sum(x["pixel_count"] for x in result["layers"])==width*height
        recon=Image.open(tmp/f"out-{width}"/"exact-recomposition.png")
        assert recon.tobytes()==im.tobytes()
        assert json.loads((tmp/f"out-{width}"/"asset-review.json").read_text())["source_sha256"]==result["source_sha256"]
print("diagonal harbor exact recomposition and review-only gates: PASS")
