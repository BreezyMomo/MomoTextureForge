"""Independent OpenCV/ZIP checks for artifacts exported in the Chrome test session."""
import json
import os
from pathlib import Path
import sys
import zipfile

os.environ['OPENCV_IO_ENABLE_OPENEXR'] = '1'
import cv2
import numpy as np

root = Path(sys.argv[1])
png16 = cv2.imread(str(root / 'browser-composite16.png'), cv2.IMREAD_UNCHANGED)
exr = cv2.imread(str(root / 'browser-composite.exr'), cv2.IMREAD_UNCHANGED)
assert png16.dtype == np.uint16 and png16.shape == (256, 256, 4)
assert exr.dtype == np.float32 and exr.shape == png16.shape
assert np.any(png16 % 257 != 0), 'PNG16 samples are quantized to eight bits'
gradient_png = cv2.imread(str(root / 'browser-gradient16.png'), cv2.IMREAD_UNCHANGED)
gradient_exr = cv2.imread(str(root / 'browser-gradient.exr'), cv2.IMREAD_UNCHANGED)
assert gradient_png.dtype == np.uint16 and gradient_exr.dtype == np.float32
diff = float(np.max(np.abs(gradient_png.astype(np.float32) / 65535 - gradient_exr)))
assert diff < .001, diff
normal = cv2.imread(str(root / 'browser-normal8.png'), cv2.IMREAD_UNCHANGED)
assert normal.shape == (256, 256, 4) and normal.dtype == np.uint8
assert np.allclose(normal[128, 128], [255, 128, 128, 255], atol=1)
rgba = cv2.imread(str(root / 'browser-rgba8.png'), cv2.IMREAD_UNCHANGED)
assert np.max(np.abs(rgba[:, :, 2].astype(int) + rgba[:, :, 1] - 255)) <= 1
assert np.all(rgba[:, :, 0] == 0) and np.all(rgba[:, :, 3] == 255)
atlas = cv2.imread(str(root / 'browser-atlas8.png'), cv2.IMREAD_UNCHANGED)
assert atlas.shape == (128, 128, 4)
with zipfile.ZipFile(root / 'browser-frames.zip') as archive:
    assert archive.testzip() is None
    manifest = json.loads(archive.read('manifest.json'))
    assert manifest['frameCount'] == 4 and manifest['order'] == 'row-major-top-left'
    frames = [cv2.imdecode(np.frombuffer(archive.read(f'Circle_{i:03d}.png'), dtype=np.uint8), cv2.IMREAD_UNCHANGED) for i in range(4)]
    for i, frame in enumerate(frames):
        row, col = divmod(i, 2)
        assert np.array_equal(atlas[row*64:(row+1)*64, col*64:(col+1)*64], frame)
    assert not np.array_equal(frames[0], frames[-1]), 'Animation frames are identical'
with zipfile.ZipFile(root / 'browser-batch.zip') as archive:
    assert archive.testzip() is None
    image_names = [name for name in archive.namelist() if name.endswith('.png')]
    sizes = [cv2.imdecode(np.frombuffer(archive.read(name), dtype=np.uint8), cv2.IMREAD_UNCHANGED).shape[:2] for name in image_names]
    assert sizes == [(128, 128), (256, 256), (512, 512)], sizes
report = {'result': 'passed', 'png16ExrMaxDifference': diff, 'normal': 'passed', 'rgba': 'passed', 'atlasMatchesEveryFrame': True, 'animationVaries': True, 'batchSizes': sizes}
(root / 'browser-files-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
