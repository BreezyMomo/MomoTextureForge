"""Decode actual browser authoring exports independently (optional OpenCV dependency)."""
import json
import os
from pathlib import Path
import sys
import zipfile
os.environ['OPENCV_IO_ENABLE_OPENEXR']='1'
if len(sys.argv)>2: sys.path.insert(0,sys.argv[2])
import cv2
import numpy as np
path=Path(sys.argv[1])
with zipfile.ZipFile(path) as archive:
    assert archive.testzip() is None
    def image(name):
        data=cv2.imdecode(np.frombuffer(archive.read(name),dtype=np.uint8),cv2.IMREAD_UNCHANGED)
        assert data is not None,name
        return data
    names=['teardrop','leaf','star-straight','star-rounded','bezier','grid','radial','random']
    images={name:image(name+'.png') for name in names}
    for name,data in images.items():
        assert data.shape==(256,256,4) and data.dtype==np.uint8,name
        assert np.any(data[:,:,3]==0) and np.any(data[:,:,3]>200),name+' has no shape/alpha contrast'
    assert np.mean(images['teardrop']!=images['leaf'])>.02
    assert np.mean(images['star-straight']!=images['star-rounded'])>.01
    assert np.mean(images['grid']!=images['random'])>.02
    _,labels=cv2.connectedComponents((images['grid'][:,:,3]>128).astype(np.uint8),connectivity=4)
    assert labels.max()==12,'Grid export has incorrect instance count'
    high=image('radial16.png');exr=image('radial.exr')
    assert high.shape==(256,256,4) and high.dtype==np.uint16
    assert exr.shape==high.shape and exr.dtype==np.float32 and np.isfinite(exr).all()
    assert np.any(high%257!=0),'PNG16 has only 8-bit samples'
    difference=float(np.max(np.abs(high.astype(np.float32)/65535-exr)))
    assert difference<.001,difference
    assert np.max(np.abs(high.astype(np.float32)/257-images['radial'].astype(float)))<2
    states=json.loads(archive.read('states.json'))
    assert len(states)==8 and all(s['state']['version']==5 for s in states)
    assert all(len(s['state']['layers'][0]['params'])==16 for s in states)
report={'result':'passed','samples':8,'gridInstances':12,'png16ExrMaxDifference':difference,'realSub8bitSamples':True,'transparentShapes':True}
(path.parent/'authoring-files-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
