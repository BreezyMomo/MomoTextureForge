"""Independent PSD parser and compositor validation (requires psd-tools)."""
from psd_tools import PSDImage
from PIL import Image
import numpy as np
import pathlib, json, sys

root = pathlib.Path(sys.argv[1])
results = []
for f in root.glob('*.psd'):
    p = PSDImage.open(f)
    print(f.name, [(l.name, l.kind) for l in p.descendants()])
    if f.stem.startswith(('contour-', 'stars-')) or f.stem in ('editor-vector', 'offline-vector'):
        layers = [l for l in p.descendants() if not l.is_group()]
        assert layers and all(l.kind == 'shape' and l.vector_mask is not None for l in layers)
    if f.stem == 'contour-smooth-shapes':
        assert any(k.preceding != k.anchor or k.leaving != k.anchor for l in p.descendants() if l.vector_mask for path in l.vector_mask.paths for k in path)
        first = next(l for l in p.descendants() if l.kind == 'shape')
        alpha = np.asarray(first.topil().convert('RGBA'))[:, :, 3]
        assert np.any((alpha > 0) & (alpha < 255)), 'smoothed path cache has no antialias coverage'
    ref = f.with_suffix('.png')
    if not ref.exists():
        continue
    expected = np.asarray(Image.open(ref).convert('RGBA'), dtype=float)
    premul = np.concatenate([expected[:, :, :3] * expected[:, :, 3:] / 255, expected[:, :, 3:]], axis=2)
    # Outside the document is transparent: a clipped opaque shape touching the
    # canvas border still has a boundary, with renderer-specific edge coverage.
    padded = np.pad(premul, ((2, 2), (2, 2), (0, 0)), mode='constant')
    neighbours = [padded[y:y+expected.shape[0], x:x+expected.shape[1]] for y in range(5) for x in range(5)]
    edges = np.max(np.maximum.reduce(neighbours) - np.minimum.reduce(neighbours), axis=2) > 3
    has_shapes = any(l.kind == 'shape' for l in p.descendants())
    for force in [False, True]:
        img = p.composite(force=force)
        img.save(root / (f.stem + '-recomposite-' + str(force) + '.png'))
        actual = np.asarray(img.convert('RGBA'), dtype=float)
        a, b = actual[:, :, 3:] / 255, expected[:, :, 3:] / 255
        diff = np.abs(np.concatenate([actual[:, :, :3] * a, actual[:, :, 3:]], axis=2) - np.concatenate([expected[:, :, :3] * b, expected[:, :, 3:]], axis=2))
        bad = diff.max(axis=2) > 3
        interior = int(np.count_nonzero(bad & ~edges))
        if interior:
            print('Interior mismatch details:', [(int(y), int(x), expected[y, x].tolist(), actual[y, x].tolist(), float(diff[y, x].max())) for y, x in np.argwhere(bad & ~edges)[:12]])
        results.append(dict(name=f.name, force=force, max=float(diff.max()), mean=float(diff.mean()), badPixels=int(np.count_nonzero(bad)), badInteriorPixels=interior))
        assert interior == 0 if force and has_shapes else not np.any(bad), (f.name, force, results[-1])
    if f.stem == 'vector-shapes':
        assert [l.name for l in p.descendants()] == ['可编辑形状', '红色圆形', '蓝色圆环']
        assert [l.kind for l in p.descendants()] == ['group', 'shape', 'shape']
print(json.dumps(results, indent=2))
(root / 'independent-results.json').write_text(json.dumps(results, indent=2))
