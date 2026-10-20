import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImageColor,imageColorGLSL,validateImageTransform,removeImageBackground,defaultImageProcessing,validateImageProcessing,imageSamplingGLSL,centerImagePixels} from '../web/image-processing.js';
const settings=extra=>({...defaultImageProcessing(),mode:'color',tolerance:0,softness:0,...extra});
test('disabled processing preserves all source bytes without mutation',()=>{const p=new Uint8ClampedArray([120,30,70,128]);assert.deepEqual(removeImageBackground(p,1,1,defaultImageProcessing()),p);});
test('connected color removal preserves enclosed matching colors; all mode removes them',()=>{const p=new Uint8ClampedArray(5*5*4);for(let i=0;i<25;i++)p.set([255,255,255,255],i*4);for(let y=1;y<4;y++)for(let x=1;x<4;x++)if(x!==2||y!==2)p.set([255,0,0,255],(y*5+x)*4);const a=removeImageBackground(p,5,5,settings());assert.equal(a[3],0);assert.equal(a[12*4+3],255);assert.equal(a[6*4+3],255);const b=removeImageBackground(p,5,5,settings({connected:false}));assert.equal(b[12*4+3],0);assert.equal(p[3],255);});
test('soft white edges unmatte color and multiply existing alpha',()=>{const p=new Uint8ClampedArray([255,128,128,128]);const a=removeImageBackground(p,1,1,settings({softness:1}));assert.ok(Math.abs(a[3]-64)<=1);assert.equal(a[0],255);assert.ok(a[1]<=1);});

test('selected-color extraction retains matching islands and source alpha without unmatting',()=>{
 const src=new Uint8ClampedArray([255,255,255,255,255,0,0,128,0,255,0,255,255,0,0,0,255,0,0,255]);
 const copy=src.slice(),options=settings({mode:'extract',color:'#ff0000'});
 const result=removeImageBackground(src,5,1,options);
 assert.deepEqual([...result],[0,0,0,0,255,0,0,128,0,0,0,0,0,0,0,0,255,0,0,255]);
 assert.deepEqual(removeImageBackground(src,5,1,{...options,connected:false}),result);
 assert.deepEqual(src,copy);
});

test('selected-color extraction soft matching preserves RGB and multiplies partial alpha',()=>{
 const src=new Uint8ClampedArray([240,20,0,200]);
 const result=removeImageBackground(src,1,1,settings({mode:'extract',color:'#ff0000',softness:.2}));
 assert.deepEqual([...result.slice(0,3)],[240,20,0]);assert.ok(Math.abs(result[3]-122)<=1);
 const all=removeImageBackground(src,1,1,settings({mode:'extract',color:'#ff0000',tolerance:1}));assert.deepEqual(all,src);
 const none=removeImageBackground(src,1,1,settings({mode:'extract',color:'#ff0000'}));assert.deepEqual([...none],[0,0,0,0]);
});
test('black extraction preserves colored glow on black and original transparency',()=>{const p=new Uint8ClampedArray([128,64,0,128,0,0,0,255]);const a=removeImageBackground(p,2,1,settings({mode:'black'}));assert.equal(a[0],255);assert.ok(Math.abs(a[1]-128)<=1);assert.ok(Math.abs(a[3]-64)<=1);assert.equal(a[7],0);});
test('invalid settings rejected; extreme threshold remains finite',()=>{assert.throws(()=>validateImageProcessing(settings({softness:NaN})));assert.throws(()=>validateImageProcessing(settings({color:'red'})));assert.throws(()=>validateImageProcessing(settings({mode:'photo'})));assert.deepEqual([...removeImageBackground(new Uint8ClampedArray([255,255,255,255]),1,1,settings({mode:'black',tolerance:1}))],[0,0,0,0]);});

test('contour settings validate and shader reconstructs filtered alpha with derivative AA',()=>{
 const enabled=settings({contour:{enabled:true,threshold:.5,softness:.06}}),code=imageSamplingGLSL(enabled);
 assert.match(code,/texture\(assetImage,p\)/);assert.match(code,/fwidth\(v.a\)/);assert.match(code,/smoothstep/);assert.doesNotMatch(imageSamplingGLSL(settings()),/smoothstep/);
 assert.throws(()=>validateImageProcessing(settings({contour:{enabled:true,threshold:2,softness:0}})));
 assert.throws(()=>validateImageProcessing(settings({contour:{enabled:1,threshold:.5,softness:0}})));
 assert.deepEqual(removeImageBackground(new Uint8ClampedArray([255,0,0,128]),1,1,{...enabled,mode:'none'}),new Uint8ClampedArray([255,0,0,128]));
});

test('auto centering translates bounds without resizing or changing RGBA',()=>{
 const src=new Uint8ClampedArray(8*6*4);src.set([200,20,40,128],0);src.set([10,80,90,1],(1*8+1)*4);const copy=src.slice(),out=centerImagePixels(src,8,6);
 assert.equal(out.offsetX,3);assert.equal(out.offsetY,2);assert.deepEqual([...out.data.slice((2*8+3)*4,(2*8+3)*4+4)],[200,20,40,128]);assert.deepEqual([...out.data.slice((3*8+4)*4,(3*8+4)*4+4)],[10,80,90,1]);assert.deepEqual(src,copy);assert.deepEqual(centerImagePixels(out.data,8,6).data,out.data);
});
test('centering empty, full and odd parity bounds stays in canvas',()=>{
 assert.equal(centerImagePixels(new Uint8ClampedArray(16),2,2).bounds,null);
 const full=new Uint8ClampedArray(16).fill(255);assert.deepEqual(centerImagePixels(full,2,2).data,full);
 const p=new Uint8ClampedArray(5*4);p.set([1,2,3,255],16);const out=centerImagePixels(p,5,1);assert.equal(out.offsetX,-2);assert.equal(out.data[11],255);
 const even=new Uint8ClampedArray(4*4);even[3]=255;const o=centerImagePixels(even,4,1);assert.equal(o.offsetX,2);assert.equal(o.data[11],255);
 assert.throws(()=>validateImageProcessing(settings({autoCenter:1})));
});
test('centering follows background removal bounds',()=>{
 const p=new Uint8ClampedArray([255,0,0,255,255,255,255,255,255,255,255,255]);const cleaned=removeImageBackground(p,3,1,settings());const centered=centerImagePixels(cleaned,3,1);assert.equal(centered.offsetX,1);assert.equal(centered.data[7],255);assert.equal(centered.data[3],0);
});

test('image transforms reject invalid ranges and generate aspect-correct bounded sampling',()=>{
 for(const value of [{scale:0,rotation:0},{scale:1,rotation:181},{scale:NaN,rotation:0}])assert.throws(()=>validateImageTransform(value));
 validateImageTransform({scale:4,rotation:-180});const code=imageSamplingGLSL(undefined,{scale:2,rotation:90});assert.ok(code.includes('aspect'));assert.ok(code.includes('/2.00000000'));assert.ok(code.includes('lessThanEqual'));
});

test('color replacement validates policy and bounded matching parameters',()=>{
 const color={mode:'replace',source:'#ffffff',target:'#ff0000',tolerance:.1,softness:.2,preserveAlpha:true};validateImageColor(color);assert.ok(imageColorGLSL(color).includes('if(v.a>0.)'));assert.ok(!imageColorGLSL(color).includes('v.a=mix'));assert.ok(imageColorGLSL({...color,preserveAlpha:false}).includes('v.a=mix'));for(const patch of [{mode:'invalid'},{source:'red'},{tolerance:NaN},{softness:-1},{preserveAlpha:0}])assert.throws(()=>validateImageColor({...color,...patch}));
});
