export type PanelSpec={id:string;title:string;showEdge?:'left'|'right'|'top'|'bottom';dockRatio?:{x?:number;y?:number}};
export type StackNode={kind:'stack';id:string;panels:string[];active:string};
export type SplitNode={kind:'split';id:string;axis:'x'|'y';ratio:number;first:LayoutNode;second:LayoutNode};
export type LayoutNode=StackNode|SplitNode;
export type FloatingPanel={id:string;root:LayoutNode;x:number;y:number;w:number;h:number};
export type Layout={root:LayoutNode|null;floats:FloatingPanel[]};
export type LayoutSettings={schema:'momo.workspace-layouts/v1';current:Layout;named:{name:string;layout:Layout}[]};
export type LayoutOptions={panels:(PanelSpec|string)[];presets?:Record<string,Layout|(()=>Layout)>;defaultPreset?:string;storageKey?:string;anchorPanel?:string};
export type WorkspaceOperation={action:string;[key:string]:unknown};
export interface LayoutModel{
 readonly PANEL_IDS:readonly string[];readonly PANEL_TITLES:Readonly<Record<string,string>>;readonly LAYOUT_KEY:string;
 layoutPreset(name?:string):Layout;sanitizeLayout(raw:unknown):Layout;sanitizeLayoutSettings(raw:unknown):LayoutSettings;
 visitLayout(layout:Layout,visit:(node:LayoutNode)=>void):void;
 panelStack(layout:Layout,panel:string):StackNode|null;findLayoutNode(layout:Layout,id:string):LayoutNode|null;
 closePanel(layout:Layout,panel:string):Layout;activatePanel(layout:Layout,panel:string):Layout;
 dockPanel(layout:Layout,panel:string,targetId:string,edge?:'center'|'left'|'right'|'top'|'bottom'):Layout;
 floatPanel(layout:Layout,panel:string,rect?:Partial<Pick<FloatingPanel,'x'|'y'|'w'|'h'>>):Layout;
 showPanel(layout:Layout,panel:string):Layout;workspaceActions(current:LayoutSettings,operations:WorkspaceOperation[]):LayoutSettings;
}
export declare const MIN_SPLIT_RATIO:number,MAX_SPLIT_RATIO:number;
export declare function createLayoutModel(options:LayoutOptions):LayoutModel;
