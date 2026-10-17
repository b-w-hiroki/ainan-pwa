"""Build girl pose and independent ponytail candidates on the existing W03 canvas.
Run with Python + Pillow. Source PNGs stay unmodified; runtime frames are 640x840.
"""
from pathlib import Path
import json, math
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'fishing-game/assets/candidates/w03-body-cute-b-01'
SOURCES = ROOT / 'docs/art-source/w03-cute-poses'
# Source-space grip and head transform, visually checked with the idle reference.
POSES = {
 'idle': ([823,652], [0,0,0]),
 'cast-windup': ([441,424], [0,0,0]),
 'cast-mid': ([823,378], [-8,0,0]),
 'cast-release': ([956,331], [0,0,0]),
 'fight-left': ([783,414], [-144,14,0]),
 'fight-mid': ([802,455], [-50,0,0]),
 'fight-right': ([838,449], [-50,0,0]),
 'joy-lift': ([856,415], [-69,16,0]),
 'joy-mid': ([852,439], [-84,3,0]),
 'joy-hold': ([909,475], [-110,11,0]),
 'sad-drop': ([765,661], [40,-8,.20]),
 'sad-mid': ([856,634], [170,-20,.25]),
 'sad-slump': ([796,677], [128,2,.30]),
}
def build():
 info=json.loads((OUT/'poses.json').read_text())
 scale=info['scale']; offset=info['poses']['idle']['offset']
 hair=Image.open(ROOT/'docs/art-source/w03-cute-hair/W03-CUTE-B-ponytail-hair.png').convert('RGBA')
 def frame(im):
  im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(640,840)); canvas.paste(im,tuple(offset)); return canvas
 for name,(hand,head) in POSES.items():
  key=name.split('-')[0]+''.join(s.title() for s in name.split('-')[1:])
  source=ROOT/'docs/art-source/w03-cute-body/W03-CUTE-B-idle-01.png' if name=='idle' else SOURCES/f'W03-CUTE-B-{name}.png'
  body=Image.open(source).convert('RGBA'); assert body.size==(1254,1254)
  # Keep existing accepted idle/windup rasterization byte-for-byte.
  if name not in ('idle','cast-windup'): frame(body).save(OUT/f'{name}.png')
  dx,dy,angle=head
  layer=hair.rotate(-math.degrees(angle),resample=Image.Resampling.BICUBIC,center=(600,300),translate=(dx,dy))
  frame(layer).save(OUT/f'hair-{name}.png')
  entry=info['poses'].setdefault(key,{'file':f'{name}.png','source':source.name,'offset':offset})
  socket=[round((hand[i]*scale+offset[i])/2,1) for i in range(2)]
  if name not in ('idle','cast-windup'): entry['fish' if name.startswith('joy-') else 'grip']=socket
  entry['hair']=f'hair-{name}.png'
 info['hairSource']='W03-CUTE-B-ponytail-hair.png'
 (OUT/'poses.json').write_text(json.dumps(info,indent=2)+'\n')
if __name__=='__main__': build()
