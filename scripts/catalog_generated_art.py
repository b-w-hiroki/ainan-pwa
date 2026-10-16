"""Copy generated originals without pixel changes and audit repository assets."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/imagegen'
DEST = ROOT / 'docs/art-source/harbor-character-v2'
NAMES = ['harbor-morning', 'harbor-distant-layer', 'harbor-sea-layer',
         'harbor-pier-layer', 'harbor-props-layer', 'W02-OPENSEA',
         'water-effects-sheet', 'W03-BODY-A-idle-v2', 'W03-BODY-A-windup-v2',
         'W03-BODY-B-idle-v2', 'W03-BODY-B-windup-v2']

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    entries = []
    for name in NAMES:
        for suffix in ['.png', '.prompt.txt']:
            src, dst = SOURCE / (name + suffix), DEST / (name + suffix)
            if not src.exists() and dst.exists():
                src = dst
            if dst.exists() and digest(src) != digest(dst):
                raise RuntimeError(f'Refusing to overwrite changed asset: {dst}')
            if not dst.exists():
                shutil.copy2(src, dst)
            assert digest(src) == digest(dst)
        path = DEST / (name + '.png')
        with Image.open(path) as im:
            im.load()
            alpha = im.getchannel('A') if 'A' in im.getbands() else None
            expected = [1024, 1024] if name.startswith('W03') else ([2048, 1024] if name == 'water-effects-sheet' else [3072, 2048])
            transparent = name.startswith('W03') or name in ['harbor-pier-layer', 'harbor-props-layer', 'water-effects-sheet']
            counts = alpha.histogram() if alpha else None
            entries.append(dict(file=path.name, sha256=digest(path), size=list(im.size), requestedSize=expected,
                sizeMatches=list(im.size) == expected, mode=im.mode, requiresTransparency=transparent,
                alphaExtrema=alpha.getextrema() if alpha else None,
                transparentPixels=counts[0] if counts else 0,
                partialAlphaPixels=sum(counts[1:255]) if counts else 0,
                visibleBounds=alpha.getbbox() if alpha else [0, 0, *im.size],
                status='source-only-needs-normalization'))
            if transparent:
                assert alpha is not None and counts[0] > 0 and sum(counts[1:]) > 0, name
    (DEST / 'manifest.json').write_text(json.dumps({'assets': entries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    cards = ''.join(f'<figure><img src="{e["file"]}" alt="{e["file"]}"><figcaption>{e["file"]}<br>{e["size"][0]} × {e["size"][1]}</figcaption></figure>' for e in entries)
    (DEST / 'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>生成素材原本</title><style>body{font:16px sans-serif;background:#edf1f4;color:#123;padding:20px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}figure{margin:0}img{width:100%;height:300px;object-fit:contain;background:repeating-conic-gradient(#bbb 0% 25%,#eee 0% 50%) 0/20px 20px}figcaption{padding:10px;overflow-wrap:anywhere}</style><h1>生成素材原本・11枚</h1><p>指定サイズへの変換・位置合わせ・輪郭の最終検査は未完了。ゲームには未接続。</p><main>' + cards + '</main></html>', encoding='utf-8')
    print(json.dumps({'copiedAndVerified': len(entries), 'sizeMismatches': sum(not e['sizeMatches'] for e in entries), 'directory': str(DEST)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
