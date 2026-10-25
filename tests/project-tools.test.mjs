import test from 'node:test';
import assert from 'node:assert/strict';
import {projectToolOptions} from '../project-cli.mjs';
import {createProjectBrief,PROJECT_BRIEF_SCHEMA} from '../web/project-brief.js';
import {project,node} from '../web/tree-model.js';
import {builtinAsset} from '../web/resource-assets.js';
import {CATALOG} from '../web/catalog.js';

test('project CLI distinguishes seconds, scalar channels, isolated input and bounded outputs',()=>{
 assert.equal(projectToolOptions('render',['--node','node-a','--before-effect','sketch','--channel','alpha','--time','1.5']).times[0],1.5);
 assert.equal(projectToolOptions('handoff',[]).output,'effect-handoff');
 assert.equal(projectToolOptions('shader',[]).node,null);assert.deepEqual(projectToolOptions('shader',['--times','0,.75,1.5']).times,[0,.75,1.5]);assert.equal(projectToolOptions('shader-support',[]).output,'shader-support.json');
 for(const [action,args]of [['unknown',[]],['shader',['--shader-mode','handdrawn']],['render',['--before-effect','sketch']],['render',['--size','4']],['render',['--time','NaN']],['render',['--time','0,1']],['render',['--channel','depth']],['render',['--output','x.jpg']],['inspect',['--output','x.png']],['render',['--size','64','--size','128']],['check',['--times',Array(17).fill(0).join(',')]],['shader',['--node','x','--channel','alpha']]])assert.throws(()=>projectToolOptions(action,args));
});

test('project brief identifies native RGBA generators without treating their placeholder scalar as the implementation',()=>{
 const generator=CATALOG.find(item=>item.definition.generator);assert.ok(generator);const p=project();p.root.children=[node('shape',generator.id)];const brief=createProjectBrief(p),resource=brief.resources.find(r=>r.id===generator.id);assert.equal(resource.kind,'generator');assert.ok(resource.definition.generator);
});

test('effect brief preserves authored identities, order, keyframes and evaluated samples without editing the project',()=>{
 const p=project(),heart=node('shape','HeartLeafTeardrop');p.root.children=[heart];p.output.seconds=2;heart.name='User name / do not execute';
 heart.tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.2],[1,.8]]};heart.tracks.opacity={mode:'multiply',ease:'linear',keys:[[0,1],[1,.2]]};heart.shapeClock.speed=2;heart.shapeClock.offset=.25;
 heart.postEffects.sketch.enabled=true;heart.postEffects.sketch.fillStyle=3;heart.effectOrder=['sketch',...heart.effectOrder.filter(id=>id!=='sketch')];
 const before=JSON.stringify(p),brief=createProjectBrief(p,{times:[0,1,2],nodeId:heart.id}),entry=brief.nodes.find(n=>n.id===heart.id);
 assert.equal(brief.schema,PROJECT_BRIEF_SCHEMA);assert.equal(JSON.stringify(p),before);assert.equal(brief.target.engineCompilation,'not-run');
 assert.equal(entry.name,heart.name);assert.deepEqual(entry.base.tracks,heart.tracks);assert.equal(entry.parameters[0].variable,builtinAsset('HeartLeafTeardrop').definition.parameters[0].variable);
 assert.ok(Math.abs(entry.parameters[0].samples[1].value-.5)<1e-6);assert.equal(entry.samples[1].formulaSeconds,2.25);assert.equal(entry.effects[0].id,'sketch');assert.equal(entry.effects[0].samples[0].enabled,true);
 assert.ok(brief.resources.some(r=>r.id===heart.type));assert.ok(brief.resources.every(r=>r.definition.outputs.scalar.inline));assert.ok(Object.keys(brief.resources[0].libraries).length);assert.throws(()=>createProjectBrief(p,{nodeId:'missing'}));
});
