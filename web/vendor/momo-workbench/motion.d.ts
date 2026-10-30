export type LayoutRects=Map<unknown,DOMRect>;
export interface MotionView {
 matchMedia?(query:string):MediaQueryList;
 requestAnimationFrame?(callback:FrameRequestCallback):number;
 cancelAnimationFrame?(handle:number):void;
 getComputedStyle?(element:Element):CSSStyleDeclaration;
 MutationObserver?:typeof MutationObserver;
}
export interface ReorderOptions {headingSelector?:string|null;summarySelector?:string|null;placeholderClass?:string;draggingClass?:string}
export interface ReorderPreview {preview(clientY:number):void;placeholder:HTMLDivElement;dragImage:Element|null;commit():void;cancel():void}
export interface MotionService {
 reducedMotion():boolean;
 animateUI(element:Element,frames:Keyframe[]|PropertyIndexedKeyframes,options?:KeyframeAnimationOptions):Animation|null;
 layoutRects(elements:Iterable<Element>,key?:(element:Element)=>unknown):LayoutRects;
 animateLayout(elements:Iterable<Element>,before:LayoutRects,options?:{key?:(element:Element)=>unknown;resize?:boolean;duration?:number}):boolean;
 dragAutoScroll(scroller:HTMLElement,onScroll?:()=>void):{update(clientY:number):void;stop():void};
 createReorderPreview(host:HTMLElement,items:Iterable<HTMLElement>,source:HTMLElement,options?:ReorderOptions):ReorderPreview;
 bindDisclosure(details:HTMLDetailsElement,options?:{bodySelector?:string}):()=>void;
 dispose():void;
}
export declare function createMotion(options?:{view?:MotionView|null}):MotionService;
