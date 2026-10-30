import type {LayoutModel,LayoutSettings,WorkspaceOperation} from './layout.js';
import type {MotionService} from './motion.js';
export interface DockWorkspace{
 state():LayoutSettings;control(operations:WorkspaceOperation[]):LayoutSettings;
 show(id:string):void;hide(id:string):void;toggle(id:string):void;active(id:string):boolean;has(id:string):boolean;isRestoring():boolean;dispose():void;
}
export type DockOptions={
 host:HTMLElement;menuHost:HTMLElement;panels:Record<string,HTMLElement>;model:LayoutModel;
 ui?:{text?:(key:string)=>string;format?:(key:string,...values:unknown[])=>string;onLanguageChange?:(callback:()=>void)=>(()=>void)};
 /** Omit to use an owned motion service. An injected service remains owned by its caller. */
 motion?:Partial<Pick<MotionService,'layoutRects'|'animateLayout'|'animateUI'|'reducedMotion'>>;
 menuPresets?:{id:string;title:string}[];storage?:Pick<Storage,'getItem'|'setItem'>|null;storageKey?:string;idPrefix?:string;
 onChange?:()=>void;onMessage?:(message:string)=>void;onVisibility?:(id:string,visible:boolean)=>void;
};
export declare function createDockWorkspace(options:DockOptions):DockWorkspace;
