"""Real GPU regression for the flower tile; desktop GLSL adaptation, not WebGL conformance."""
import sys,json
from pathlib import Path
sys.path.insert(0,sys.argv[3])
import moderngl
import numpy as np
from PIL import Image
data=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
ctx=moderngl.create_context(standalone=True,require=330)
size=512
tex=ctx.texture((size,size),4,dtype='f4');fb=ctx.framebuffer(color_attachments=[tex]);fb.use()
ctx.viewport=(0,0,size,size)
def desktop(s):return s.replace('#version 300 es','#version 330 core').replace('precision highp float;precision highp int;','')
def render(program,vao,params,offset=(0,0),kind=0):
    ints={'types':[data['index'],0,0],'masks':[-1]*3,'enabled':[1,0,0],'order':[0,1,2],'stopCount':[2],'patternKind':[kind,0,0]}
    floats={'params':params*3,'opacity':[1]*3,'transformA':[1,0,0,0]*3,'stops':[0,0,0,0]+[1,1,1,1]*7,'postA':[0,1,1,0],'postB':[1,0,1],'tile':[1],'imageSize':[size,size],'sampleStep':[1/size]*2,'sampleOffset':offset}
    for values,dtype in [(ints,np.int32),(floats,np.float32)]:
        for name,values in values.items():
            if name in program:
                u=program[name];u.write(np.asarray(values[:u.array_length*u.dimension],dtype=dtype).tobytes())
    vao.render(mode=moderngl.TRIANGLES,vertices=3)
    pixels=np.frombuffer(fb.read(components=4,dtype='f4'),dtype=np.float32).reshape(size,size,4).copy()
    assert np.isfinite(pixels).all()
    return pixels[:,:,0]
records=[];images=[]
for kind,fragment in enumerate(data['fragments']):
    program=ctx.program(vertex_shader=desktop(data['vertex']),fragment_shader=desktop(fragment));vao=ctx.vertex_array(program,[])
    base=render(program,vao,data['params'],kind=kind);images.append(base)
    assert base.max()-base.min()>.9
    for spec in data['parameters']:
        changed=[]
        for value in [spec['min'],spec['max']]:
            p=list(data['params']);p[spec['slot']]=value
            changed.append(float(np.max(np.abs(render(program,vao,p,kind=kind)-base))))
        assert max(changed)>.01,spec['label']
    vao.release();program.release()
assert np.max(images[0][0,:])<.001 and np.max(images[0][-1,:])<.001
assert np.max(images[0][:,0])<.001 and np.max(images[0][:,-1])<.001
# Display the actual shader output in the requested white-on-black palette.
ink=np.array([255,255,255]);paper=np.array([0,0,0]);mask=images[0][::-1,:,None]
rgb=np.uint8(np.clip(paper*(1-mask)+ink*mask,0,255))
Image.fromarray(rgb).save(out/'flower-tile.png')
report={'result':'passed','renderer':ctx.info['GL_RENDERER'],'parametersChecked':len(data['parameters']),'singleMotifEmptyMargins':True}
(out/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
