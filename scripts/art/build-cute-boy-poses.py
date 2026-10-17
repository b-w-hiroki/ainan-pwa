"""Build male runtime poses; preserve original source and accepted idle/windup.
Hand coordinates are authored in source pixels, then mapped to 320x420 sockets.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'fishing-game/assets/candidates/w03-body-cute-a-01'
HANDS = {
    'cast-mid': [847, 310], 'cast-release': [977, 348],
    'fight-left': [742, 402], 'fight-mid': [848, 407],
    'fight-right': [803, 407], 'joy-lift': [938, 393],
    'joy-mid': [947, 452], 'joy-hold': [933, 467],
    'sad-drop': [813, 677], 'sad-mid': [838, 671],
    'sad-slump': [778, 695],
}

def build():
    info = json.loads((OUT / 'poses.json').read_text(encoding='utf-8'))
    scale = info['scale']
    offset = info['poses']['idle']['offset']
    for name, hand in HANDS.items():
        source_name = f'W03-CUTE-A-{name}' + ('-v2' if name == 'sad-mid' else '') + '.png'
        source = ROOT / 'docs/art-source/w03-cute-poses' / source_name
        with Image.open(source) as im:
            assert im.size == (1254, 1254) and im.mode == 'RGBA', source
            assert im.getchannel('A').getextrema() == (0, 255), source
            frame = Image.new('RGBA', (640, 840))
            frame.paste(im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS), offset)
            frame.save(OUT / f'{name}.png')
        key = name.split('-')[0] + ''.join(s.title() for s in name.split('-')[1:])
        info['poses'][key] = {
            'file': f'{name}.png', 'source': source_name, 'offset': offset,
            'fish' if name.startswith('joy-') else 'grip': [round((hand[i]*scale+offset[i])/2, 1) for i in range(2)],
        }
    (OUT / 'poses.json').write_text(json.dumps(info, indent=2)+'\n', encoding='utf-8')

if __name__ == '__main__':
    build()
