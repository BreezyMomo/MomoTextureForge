"""Independent decode of the browser's seamless sample ZIP; dependencies are optional."""
import json
import os
from pathlib import Path
import sys
import zipfile
os.environ['OPENCV_IO_ENABLE_OPENEXR']='1'
if len(sys.argv)>2:
    sys.path.insert(0,sys.argv[2])
import cv2
import numpy as np
archive_path=Path(sys.argv[1])
with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None
    def read(name):
        image=cv2.imdecode(np.frombuffer(archive.read(name),dtype=np.uint8),cv2.IMREAD_UNCHANGED)
        assert image is not None,name
        return image
    image=read('seamless8.png');high=read('seamless16.png');exr=read('seamless.exr');repeat=read('repeat8.png');original=read('original8.png')
    assert image.shape==(256,256,4) and image.dtype==np.uint8
    assert high.shape==image.shape and high.dtype==np.uint16
    assert exr.shape==image.shape and exr.dtype==np.float32 and np.isfinite(exr).all()
    assert repeat.shape==(512,512,4)
    for row in range(2):
        for col in range(2):
            assert np.array_equal(repeat[row*256:(row+1)*256,col*256:(col+1)*256],image),'Repeated quadrant mismatch'
    difference=float(np.max(np.abs(high.astype(np.float32)/65535-exr)))
    assert difference<.001,difference
    assert np.any(high%257!=0),'PNG16 quantized to eight bits'
    assert np.mean(np.abs(original[:,:,:3].astype(float)-image[:,:,:3])>5)>.1,'Switch did not change export'
    state=json.loads(archive.read('state.json'))
    assert state['version']==4 and state['output']['seamless'] is True
report={'result':'passed','fourQuadrantsMatchExactly':True,'png16ExrMaxDifference':difference,'seamlessSwitchAffectsExport':True}
(archive_path.parent/'seamless-files-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
