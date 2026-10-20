import {project,sanitizeTree} from './tree-model.js';
import {serializeLocalProject,restoreLocalProject} from './project-dependencies.js';
export const GRAPHIC_LIST_KEY='momo-texture-tree:graphic-list:v1';
export function serializeGraphicList(entries){const p=project();p.root.children=[];p.projectResources=entries;return serializeLocalProject(p);}
export const restoreGraphicList=text=>sanitizeTree(restoreLocalProject(JSON.parse(text))).projectResources;
export function canvasProject(p){const {projectResources,...canvas}=p;return {...structuredClone(canvas),projectResources:[]};}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Live works and preview sessions share one shelf; portable projects exclude it.
export class GraphicShelf{
 constructor(entries=[]){this.entries=entries;this.history=new WeakMap();}
 bind(p){Object.defineProperty(p,'projectResources',{enumerable:true,configurable:true,get:()=>this.entries,set:value=>{this.entries=value;}});return p;}
 record(before){if(!equal(before.projectResources,this.entries))this.history.set(before,{expected:structuredClone(this.entries),restore:structuredClone(before.projectResources)});}
 restore(target,current){const change=this.history.get(target);if(change&&equal(this.entries,change.expected)){const previous=structuredClone(this.entries);this.entries=structuredClone(change.restore);this.history.set(current,{expected:structuredClone(this.entries),restore:previous});}return this.bind(target);}
}
