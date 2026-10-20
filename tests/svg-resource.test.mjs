import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSvgText,svgText} from '../web/svg-resource.js';
import {builtinAsset,validateAsset} from '../web/resource-assets.js';
test('SVG source limits and forbidden XML declarations',()=>{
 assert.equal(validateSvgText('<svg/>'),'<svg/>');
 for(const s of ['<!DOCTYPE svg><svg/>','<!ENTITY x "a">','<?xml-stylesheet href="x"?>','x'.repeat(2*1024*1024+1)])assert.throws(()=>validateSvgText(s));
});
test('SVG assets retain UTF8 source and reject raster-processing metadata',()=>{
 const a=builtinAsset('Circle');a.kind='image';a.mime='image/svg+xml';const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><title>星形</title></svg>';a.data=Buffer.from(source).toString('base64');validateAsset(a);assert.equal(svgText(a),source);
 a.imageProcessing={version:1,mode:'none',color:'#ffffff',connected:true,tolerance:.08,softness:.12};assert.throws(()=>validateAsset(a),/SVG/);
});
