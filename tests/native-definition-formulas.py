"""Actual GPU check for expression, multi-line body and external helper parity."""
import json, sys
from pathlib import Path
sys.path.insert(0,sys.argv[3])
import moderngl
import numpy as np
data=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
ctx=moderngl.create_context(standalone=True,require=330)
size=64
texture=ctx.texture((size,size),4,dtype='f4')
fb=ctx.framebuffer(color_attachments=[texture]);fb.use();ctx.viewport=(0,0,size,size)
def desktop(s):return s.replace('#version 300 es','#version 330 core').replace('precision highp float;precision highp int;','')
samples=[]
for item in data['patterns']:
    p=ctx.program(vertex_shader=desktop(data['vertex']),fragment_shader=desktop(item['fragment']))
    arrays={'types':[item['index'],0,0],'enabled':[1,0,0],'order':[0,1,2],'masks':[-1]*3,'stopCount':[2]}
    floats={'params':item['params']*3,'opacity':[1]*3,'transformA':[1,0,0,0]*3,'stops':[0,0,0,0]+[1,1,1,1]*7,'postA':[0,1,1,0],'postB':[1,0,1],'tile':[1],'imageSize':[size,size],'sampleStep':[1/size,1/size]}
    for values,dtype in [(arrays,np.int32),(floats,np.float32)]:
        for name,values in values.items():
            if name in p:
                u=p[name];u.write(np.array(values[:u.array_length*u.dimension],dtype=dtype).tobytes())
    vao=ctx.vertex_array(p,[]);vao.render(mode=moderngl.TRIANGLES,vertices=3)
    pixels=np.frombuffer(fb.read(components=4,dtype='f4'),dtype=np.float32).reshape(size,size,4).copy()
    assert np.isfinite(pixels).all()
    axis=(np.arange(size)+.5)/size*2-1
    x,y=np.meshgrid(axis,axis)
    expected=np.exp(-(x*x+y*y)/(item['params'][0]**2))
    error=float(np.max(np.abs(pixels[:,:,0]-expected)))
    assert error<1e-6,(item['name'],error)
    samples.append({'name':item['name'],'passed':True,'maxError':error})
    vao.release();p.release()
report={'result':'passed','platform':'native GLSL 330 adaptation','samples':samples,'renderer':ctx.info['GL_RENDERER']}
Path(sys.argv[2]).write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
