"""Independent alpha checks for same-state heart exports from the browser.

Usage: python check-heart-files.py <results-directory> [opencv-dependency-directory]
Expect heart8.png, heart16.png and heart.exr in the results directory.
"""
import json
import os
from pathlib import Path
import sys

os.environ['OPENCV_IO_ENABLE_OPENEXR'] = '1'
if len(sys.argv) > 2:
    sys.path.insert(0, sys.argv[2])
import cv2
import numpy as np

root = Path(sys.argv[1])
images = []
for name, dtype, divisor in [('heart8.png', np.uint8, 255), ('heart16.png', np.uint16, 65535), ('heart.exr', np.float32, 1)]:
    raw = cv2.imread(str(root / name), cv2.IMREAD_UNCHANGED)
    assert raw is not None and raw.ndim == 3 and raw.shape[2] == 4, name
    assert raw.dtype == dtype, name
    image = raw.astype(np.float32) / divisor
    assert np.isfinite(image).all(), name
    alpha = image[:, :, 3]
    assert alpha[0, 0] == 0, name + ': outside must be transparent'
    assert alpha[raw.shape[0] // 2, raw.shape[1] // 2] == 1, name + ': inside must be opaque'
    assert np.any((alpha > 0) & (alpha < 1)), name + ': feather alpha missing'
    assert np.allclose(alpha, alpha[:, ::-1], atol=1/divisor if divisor > 1 else .001), name + ': asymmetric contour'
    images.append(image)

assert images[0].shape == images[1].shape == images[2].shape
diff8 = float(np.max(np.abs(images[0] - images[1])))
diff16 = float(np.max(np.abs(images[1] - images[2])))
assert diff8 < .005, diff8
assert diff16 < .001, diff16
raw16 = cv2.imread(str(root / 'heart16.png'), cv2.IMREAD_UNCHANGED)
assert np.any(raw16[:, :, 3] % 257 != 0), '16bit alpha was quantized to eight bits'
report = {'result': 'passed', 'size': list(images[0].shape), 'transparentOutside': True, 'opaqueInside': True, 'softEdgeAlpha': True, 'png8Png16MaxDifference': diff8, 'png16ExrMaxDifference': diff16}
(root / 'heart-files-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
