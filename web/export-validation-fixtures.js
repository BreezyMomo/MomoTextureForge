import {project,node,sanitizeTree} from './tree-model.js';
export function exportFixtures(){
 const spiral=project();spiral.name='verify-spiral';spiral.root.children=[node('shape','Spiral')];Object.assign(spiral.output,{width:96,height:96,seconds:2,fps:6,columns:5});spiral.root.children[0].shapeClock={follow:true,speed:.7,offset:.4,value:0};
 const fluid=project();fluid.name='verify-fluid';fluid.root.children=[node('shape','Fluid')];Object.assign(fluid.output,{width:96,height:96,seconds:2,fps:6,columns:5,loopExport:false});fluid.root.children[0].shapeClock={follow:true,speed:1.2,offset:-.3,value:0};
 const combo=project();combo.name='verify-combo';combo.canvas.ratio=1.5;Object.assign(combo.output,{width:96,height:64,seconds:1.25,fps:8,columns:4});const g=node('group'),a=node('shape','Spiral'),b=node('shape','Circle');combo.root.children=[g];g.children=[a,b];a.transform.width=.55;a.transform.height=.7;a.tracks['transform.x']={mode:'absolute',ease:'linear',keys:[[0,.25],[1,.75]]};a.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,.2],[.5,1],[1,.4]]};b.transform.width=b.transform.height=.25;b.transform.y=.7;b.tracks['transform.y']={mode:'absolute',ease:'linear',keys:[[0,.7],[1,.3]]};g.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,35]]};
 return [spiral,fluid,combo].map(sanitizeTree);
}
