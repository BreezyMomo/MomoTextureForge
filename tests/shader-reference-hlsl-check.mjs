// Optional native Windows SDK check; does not claim Unity/URP integration validation.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const flag=process.argv.indexOf('--fxc');
const compiler=flag>=0?process.argv[flag+1]:'C:/Program Files (x86)/Windows Kits/10/bin/10.0.22621.0/x64/fxc.exe';
await access(compiler);
const out=resolve('test-results/shader-reference');await mkdir(out,{recursive:true});
const source=await readFile('web/shaders/handdrawn-fill.hlsl','utf8');
const test=source+`\ncbuffer Inputs { MFHanddrawnParams parameters; float seconds; };\nfloat4 main(float2 uv:TEXCOORD0):SV_Target{return MFHanddrawnFill(uv,1.0,seconds,parameters);}\n`;
await writeFile(out+'/reference-test.hlsl',test);
const result=execFileSync(compiler,['/nologo','/Ges','/T','ps_5_0','/E','main','/O3','/Fo',out+'/reference-test.cso',out+'/reference-test.hlsl'],{encoding:'utf8'});
console.log(JSON.stringify({coreHLSL:'compiled',profile:'ps_5_0',compiler,unityIntegration:'not-run',output:result.trim()},null,2));
