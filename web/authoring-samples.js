import {sanitizeArrangement,ARRANGEMENT_NAMES} from "./arrangement.js";
import {BY_ID} from "./catalog.js";
import { defaults, newLayer } from "./state.js";
export function flowerTileSample() {
  const state=defaults();state.layers[0]=newLayer("OgeeFlowerTile");
  state.palette=12;state.stops=[{position:0,color:"#000000"},{position:1,color:"#ffffff"}];
  state.output.alpha=false;state.output.seamless=true;
  const a=state.layers[0].arrange;a[0]=4;a[1]=3;a[2]=6;a[4]=1/3;a[5]=.5;
  return {name:"flower-tile",state};
}
export function authoringSamples() {
  const sample = (name,type,edit=()=>{}) => {
    const state = defaults();state.layers[0]=newLayer(type);state.output.alpha=true;
    edit(state,state.layers[0]);return {name,state};
  };
  return [
    sample("teardrop","Teardrop"),
    sample("leaf","Leaf"),
    sample("star-straight","Star"),
    sample("star-rounded","Star",(s,l)=>{l.params[5]=1;l.params[1]=.1;}),
    sample("bezier","BezierRibbon",(s,l)=>{l.params[8]=.22;l.params[9]=.04;}),
    sample("grid","Star",(s,l)=>{l.params[5]=1;l.arrange[0]=1;l.arrange[1]=4;l.arrange[2]=3;l.arrange[4]=.24;s.output.seamless=true;}),
    sample("radial","Leaf",(s,l)=>{l.arrange[0]=2;l.arrange[3]=12;l.arrange[4]=.36;l.arrange[5]=.3;s.output.seamless=true;}),
    sample("random","Teardrop",(s,l)=>{l.arrange[0]=3;l.arrange[3]=24;l.arrange[4]=.2;l.arrange[9]=.5;l.arrange[10]=180;l.arrange[11]=9;s.output.seamless=true;}),
  ];
}

export function arrangementSamples(){
 return [6,7,8,9,10,11,12].map(mode=>{
  const state=defaults(),l=state.layers[0]=newLayer(mode===10?"Leaf":"Circle");
  state.output.alpha=false;state.palette=0;state.output.seamless=false;
  l.arrange[0]=mode;l.arrange=sanitizeArrangement(l.arrange);const a=l.arrange;
  a[3]=mode===10?8:mode===8?12:48;a[4]=mode===10?.17:.07;a[19]=1;
  if(mode===6){a[3]=16;a[4]=.065;l.type="Leaf";l.params=[...newLayer("Leaf").params];}
  if(mode===7){a[3]=90;a[32]=.06;}
  if(mode===8){a[33]=4;a[36]=.22;}
  if(mode===9){a[3]=64;a[4]=.055;a[35]=3;}
  if(mode===11){a[1]=7;a[2]=7;a[4]=.12;}
  if(mode===12){a[3]=160;a[32]=.025;a[4]=.04;const shape=BY_ID.get("HeartLeafTeardrop");a[39]=shape.index;a.splice(42,16,...shape.defaults);}
  return {name:"arrangement-"+mode,title:ARRANGEMENT_NAMES[mode],state};
 });
}
