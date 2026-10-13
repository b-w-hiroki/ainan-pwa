#!/usr/bin/env python3
"""Non-production lossless review splitter for AINAN's diagonal Harbor master."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

REFERENCE=(941,1672)
SHORE=[(0,410),(115,398),(325,363),(530,351),(742,348),(941,390)]
PIER=[(0,847),(39,906),(95,997),(163,1100),(258,1205),
      (360,1304),(461,1392),(566,1500),(696,1655),(720,1672)]


def scaled(points,size):
    return [(round(x*size[0]/REFERENCE[0]),round(y*size[1]/REFERENCE[1]))
            for x,y in points]


def run(source,out):
    source=Path(source)
    out=Path(out)
    if not source.is_file():
        raise FileNotFoundError("Explicit review-only source not present: "+str(source))
    world=Image.open(source).convert("RGBA")
    width,height=world.size
    if width<400 or height<700 or width>=height:
        raise ValueError("Expected high-resolution portrait world-only source")
    out.mkdir(parents=True,exist_ok=True)
    blank=Image.new("L",world.size,0)
    far=blank.copy()
    ImageDraw.Draw(far).polygon(scaled([(0,0),(941,0)]+list(reversed(SHORE)),world.size),fill=255)
    pier=blank.copy()
    ImageDraw.Draw(pier).polygon(scaled(PIER+[(941,1672),(0,1672)],world.size),fill=255)
    sea=blank.copy()
    f,qu,w=far.load(),pier.load(),sea.load()
    counts={"far":0,"sea":0,"pier":0}
    for y in range(height):
        for x in range(width):
            if qu[x,y]:
                f[x,y]=0
                counts["pier"]+=1
            elif f[x,y]:
                counts["far"]+=1
            else:
                w[x,y]=255
                counts["sea"]+=1
    assert sum(counts.values())==width*height
    together=Image.new("RGBA",world.size)
    layers=[]
    for label,mask in (("far",far),("sea",sea),("pier",pier)):
        part=world.copy()
        part.putalpha(mask)
        filename="layer-"+label+"-REVIEW.png"
        part.save(out/filename)
        together.alpha_composite(part)
        layers.append({"id":label,"path":filename,"pixel_count":counts[label]})
    if together.tobytes()!=world.tobytes():
        raise AssertionError("RGBA recomposition is not pixel-exact")
    together.save(out/"exact-recomposition.png")
    world.save(out/"world-source.png")
    marked=world.copy()
    pen=ImageDraw.Draw(marked)
    pen.line(scaled(SHORE,world.size),fill=(255,220,95,255),width=max(2,width//260))
    pen.line(scaled(PIER,world.size),fill=(255,85,100,255),width=max(2,width//260))
    marked.save(out/"boundary-review.png")
    result={"id":"AINAN-HARBOR-DIAGONAL-REVIEW-001","dimensions":[width,height],
            "source_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),
            "layers":layers,"pixel_exact_recomposition":True,
            "mask_boundaries_authored_from_original":False,
            "hidden_structure_reconstructed":False,
            "animation_ready":False,"game_integrated":False,
            "human_art_review":"pending","production_promoted":False}
    (out/"asset-review.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    return result


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source",required=True)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    print(json.dumps(run(a.source,a.out),ensure_ascii=False))
