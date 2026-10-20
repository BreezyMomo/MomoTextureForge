import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const require=createRequire(resolve(process.argv[2],'package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 let source=await readFile('web/tree-renderer.js','utf8');
  source=source.replace(/void sampleContent\([\s\S]*?\nvec4 blendColor/,`void sampleContent(vec2 p,out vec4 c,out float h){if(any(lessThan(p,vec2(0)))||any(greaterThanEqual(p,vec2(1)))){c=vec4(0);h=0.;return;}c=filtered(srcColor,p);h=filtered(srcHeight,p).r;}\nvec4 blendColor`).replaceAll("from './","from 'http://127.0.0.1:8799/");
 await page.route('**/aa-baseline.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto('http://127.0.0.1:8799/');
 const result=await page.evaluate(async()=>{
  const {TreeRenderer}=await import('./tree-renderer.js'),{project,node}=await import('./tree-model.js');
  const {TreeRenderer:Baseline}=await import('./aa-baseline.js');
  const current=new TreeRenderer(document.createElement('canvas')),before=new Baseline(document.createElement('canvas'));
  let oldError=0,newError=0,aa=0;
  for(const angle of [7,17,31,49]){
   const p=project(),s=node('shape','Star');s.color={mode:'own',fill:'solid',high:'#ffffff',low:'#ffffff'};s.arrange[0]=1;s.arrange[1]=s.arrange[2]=5;s.arrange[6]=angle;s.params[0]=.9;p.root.children=[s];p.output.alpha=true;
   const old=before.draw(p,96,96,{read:true}),now=current.draw(p,96,96,{read:true}),ref=current.draw(p,384,384,{read:true});
   for(let y=0;y<96;y++)for(let x=0;x<96;x++){let a=0;for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++)a+=ref[((y*4+yy)*384+x*4+xx)*4+3]/16;const i=(y*96+x)*4+3;oldError+=(old[i]-a)**2;newError+=(now[i]-a)**2;if(now[i]>0&&now[i]<1)aa++;}
  }
  current.destroy();before.destroy();return {oldError,newError,aa};
 });assert.ok(result.aa>0);assert.ok(result.newError<result.oldError,JSON.stringify(result));console.log(JSON.stringify(result));
}finally{await browser.close();}
