"""Optional independent desktop GLSL check, not a WebGL/browser conformance test.

Run export-shaders.mjs first. Only version/precision declarations are adapted to
desktop GLSL 330; the actual renderer math, composition and output remain intact.
Dependencies can live in an ignored test-results directory.
"""
import json
import sys
from pathlib import Path
if len(sys.argv) > 3:
    sys.path.insert(0, sys.argv[3])
import moderngl
import numpy as np
from PIL import Image, ImageDraw

source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
output = Path(sys.argv[2])
output.mkdir(parents=True, exist_ok=True)
ctx = moderngl.create_context(standalone=True, require=330)
size = 256 if '--parameters' in sys.argv else 64
texture = ctx.texture((size, size), 4, dtype="f4")
framebuffer = ctx.framebuffer(color_attachments=[texture])
framebuffer.use()
ctx.viewport = (0, 0, size, size)

def desktop(shader):
    return shader.replace("#version 300 es", "#version 330 core").replace("precision highp float;precision highp int;", "")

def configure(program, index, params, mode=0, kind=0, uv=None):
    integers = {"types": [index, 0, 0], "masks": [-1] * 3, "enabled": [1, 0, 0], "blendMode": [0] * 3, "order": [0, 1, 2], "polar": [0] * 3, "maskInverse": [0] * 3, "channelSource": [0, 1, 2, 6], "stopCount": [2], "outputMode": [mode], "inverted": [0], "alphaMode": [0]}
    integers.update({"patternKind": [kind,0,0], "maskKind": [0,0,0]})
    floats = {"params": params + ([.62, .025, 8, .015, .5, .25, 1, .2] + [0]*8) * 2, "transformA": [1, 0, 0, 0] * 3, "transformB": [0] * 12, "maskA": [1, 0, 0, 0] * 3, "maskB": [0] * 12, "opacity": [1] * 3, "stops": [0, 0, 0, 0] + [1, 1, 1, 1] * 7, "postA": [0, 1, 1, 0], "postB": [1, 0, 1], "time": [.75], "normalStrength": [3], "tile": [1], "imageSize": [size, size]}
    floats.update({"seamBlend": [.2], "sampleOffset": [0,0], "sampleStep": [1/size,1/size]})
    if uv is not None:
        floats['transformA'][:4] = [uv[0], uv[1]*np.pi/180, uv[2], uv[3]]
        floats['transformB'][:4] = [uv[4], uv[5]*np.pi/180, uv[6], 0]
    for values, dtype in [(integers, np.int32), (floats, np.float32)]:
        for name, data in values.items():
            if name in program:
                uniform = program[name]
                uniform.write(np.array(data[:uniform.array_length * uniform.dimension], dtype=dtype).tobytes())

def pixels(vao):
    vao.render(mode=moderngl.TRIANGLES, vertices=3)
    return np.frombuffer(framebuffer.read(components=4, dtype="f4"), dtype=np.float32).reshape(size, size, 4)[::-1].copy()

records, failures, constant, parameter_checks = [], [], [], []
montage = Image.new("RGB", (16 * 80, 20 * 88))
draw = ImageDraw.Draw(montage)
for i, item in enumerate(source["patterns"]):
    try:
        program = ctx.program(vertex_shader=desktop(source["vertex"]), fragment_shader=desktop(item["fragment"]))
        vao = ctx.vertex_array(program, [])
        configure(program, item["index"], item["params"], kind=item.get('kind',0), uv=item.get('uv'))
        image = pixels(vao)
        assert np.isfinite(image).all(), "non-finite samples"
        red = image[:, :, 0]
        low, high = float(red.min()), float(red.max())
        if high - low < 1e-5:
            constant.append(item["name"])
        records.append({"type": item["name"], "min": low, "max": high, "mean": float(red.mean())})
        if '--parameters' in sys.argv:
            for spec in item.get('parameters', []):
                parameter_base = image
                base_params = list(item['params'])
                # The corner radius is visible only in the rounded-star mode.
                # Compare both samples in that mode, so toggling the mode alone
                # cannot make an ineffective radius appear to pass.
                if item['name'] == 'Star' and spec['slot'] == 1:
                    base_params[5] = 1
                    configure(program, item['index'], base_params, kind=item.get('kind',0), uv=item.get('uv'))
                    parameter_base = pixels(vao)
                changed = False
                for ratio in [.2, .65, .9]:
                    trial = list(base_params)
                    value = spec['min'] + (spec['max']-spec['min'])*ratio
                    if spec['step'] == 1: value = round(value)
                    trial[spec['slot']] = value
                    configure(program, item['index'], trial, kind=item.get('kind',0), uv=item.get('uv'))
                    varied = pixels(vao)
                    assert np.isfinite(varied).all(), f"non-finite parameter: {spec['label']}"
                    if np.max(np.abs(varied-parameter_base)) > 1e-5:
                        changed = True
                        break
                parameter_checks.append({'type': item['name'], 'parameter': spec['label'], 'slot': spec['slot'], 'changed': changed})
            configure(program, item['index'], item['params'], kind=item.get('kind',0), uv=item.get('uv'))
        rgb = Image.fromarray(np.uint8(np.clip(image[:, :, :3], 0, 1) * 255))
        x, y = i % 16 * 80, i // 16 * 88
        montage.paste(rgb.resize((64,64)), (x, y))
        draw.text((x, y + 66), item["name"][:12], fill="white")
        vao.release()
        program.release()
    except Exception as error:
        failures.append({"type": item["name"], "error": str(error)})
    if i % 25 == 0:
        print(f"Checked {i+1}/{len(source['patterns'])}, failures={len(failures)}", flush=True)

report = {"platform": "desktop GLSL 330 adaptation; not WebGL2", "renderer": ctx.info["GL_RENDERER"], "version": ctx.info["GL_VERSION"], "checked": len(records) + len(failures), "failed": len(failures), "constant": constant, "results": records, "failures": failures, 'parameterChecks': parameter_checks, 'ineffective': [p for p in parameter_checks if not p['changed']]}
(output / "native-gpu-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
montage.save(output / "native-gpu-catalogue.png")
print(json.dumps({k: v for k, v in report.items() if k not in ("results", "failures", 'parameterChecks')}, indent=2), flush=True)
if failures or report['ineffective']:
    print(json.dumps(failures[:5], indent=2), flush=True)
    sys.exit(1)
