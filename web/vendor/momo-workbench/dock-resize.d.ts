import type {SplitNode} from './layout.js';
export declare function createSplitResize(root:SplitNode,size:number,options?:{gap?:number;minPane?:number}):{
 splits:{node:SplitNode;ratio:number;start:number;end:number;startSlope:number;endSlope:number;center:number;centerSlope:number}[];
 minDelta:number;maxDelta:number;resize(delta:number):number;restore():void;
};
