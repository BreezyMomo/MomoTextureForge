import type {LayoutModel,LayoutSettings,WorkspaceOperation} from './layout.js';
import type {MotionService} from './motion.js';
export type DockMenuState={visible:string[];named:LayoutSettings['named'];status:string;values?:unknown[]};
export type DockMenuOptions={host:HTMLElement;id:string;ui:NonNullable<DockOptions['ui']>;presets:{id:string;title:string}[];panels:{id:string;title:string}[];preset:(id:string)=>void;toggle:(id:string,visible:boolean)=>void;save:(name:string)=>void;load:(name:string)=>void;remove:(name:string)=>void};
export type DockMenuRenderer=(options:DockMenuOptions)=>{update:(state:DockMenuState)=>void;dispose:()=>void};
export interface DockWorkspace{
 state():LayoutSettings;control(operations:WorkspaceOperation[]):LayoutSettings;
 show(id:string):void;hide(id:string):void;toggle(id:string):void;active(id:string):boolean;has(id:string):boolean;isRestoring():boolean;dispose():void;
}
export type DockOptions={
 host:HTMLElement;menuHost:HTMLElement;panels:Record<string,HTMLElement>;model:LayoutModel;
 renderMenu?:DockMenuRenderer;
 ui?:{text?:(key:string)=>string;format?:(key:string,...values:unknown[])=>string;onLanguageChange?:(callback:()=>void)=>(()=>void)};
 /** Omit to use an owned motion service. An injected service remains owned by its caller. */
 motion?:Partial<Pick<MotionService,'layoutRects'|'animateLayout'|'animateUI'|'reducedMotion'>>;
 menuPresets?:{id:string;title:string}[];storage?:Pick<Storage,'getItem'|'setItem'>|null;storageKey?:string;idPrefix?:string;
 onChange?:()=>void;onMessage?:(message:string)=>void;onVisibility?:(id:string,visible:boolean)=>void;
};
export declare function createDockWorkspace(options:DockOptions):DockWorkspace;
