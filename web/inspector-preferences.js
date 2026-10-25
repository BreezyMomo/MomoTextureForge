import {inspectorSectionState,INSPECTOR_SECTIONS_KEY,INSPECTOR_ORDER_KEY} from './inspector-sections.js';
import {nodeShortcutState,NODE_SHORTCUTS_KEY,SHORTCUT_MODULES} from './node-shortcuts.js';
import {safeData} from './project-authoring-contract.js';

export const INSPECTOR_TABS=['shape','layout','animation','composite'];
const validObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
export function inspectorPreferenceChanges(current,changes,{modules,order,nodeIds}){
 safeData(changes);
 if(!validObject(changes)||Object.keys(changes).some(k=>!['tab','primaryOnly','expanded','order','resetOrder','pins','restore'].includes(k)))throw Error('Unknown inspector preference');
 if(changes.restore&&Object.keys(changes).length!==1)throw Error('Restore must be the only preference change');
 const next=structuredClone(changes.restore??current);
 if(!validObject(next)||Object.keys(next).sort().join(',')!=='primaryOnly,sections,shortcuts,tab'||!INSPECTOR_TABS.includes(next.tab)||typeof next.primaryOnly!=='boolean'||!validObject(next.sections)||!validObject(next.sections.expanded)||!validObject(next.sections.orders)||Object.keys(next.sections.expanded).length>4096||Object.keys(next.shortcuts?.nodes??{}).length>2048)throw Error('Invalid inspector settings');
 const memory=new Map([[INSPECTOR_SECTIONS_KEY,JSON.stringify(next.sections.expanded)],[INSPECTOR_ORDER_KEY,JSON.stringify(next.sections.orders)],[NODE_SHORTCUTS_KEY,JSON.stringify(next.shortcuts)]]),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 const sections=inspectorSectionState(storage),shortcuts=nodeShortcutState(storage);
 if(JSON.stringify(sections.snapshot())!==JSON.stringify(next.sections)||JSON.stringify(shortcuts.snapshot())!==JSON.stringify(next.shortcuts))throw Error('Invalid saved inspector preferences');
 if(changes.tab!==undefined){if(!INSPECTOR_TABS.includes(changes.tab))throw Error('Unknown inspector tab');next.tab=changes.tab;}
 if(changes.primaryOnly!==undefined){if(typeof changes.primaryOnly!=='boolean')throw Error('primaryOnly must be boolean');next.primaryOnly=changes.primaryOnly;}
 if((changes.order||changes.expanded)&&(next.tab!==current.tab||next.primaryOnly!==current.primaryOnly))throw Error('Read visible modules after changing tab or batch mode');
 if(changes.expanded!==undefined){if(!Array.isArray(changes.expanded)||changes.expanded.length>128)throw Error('Invalid module changes');for(const item of changes.expanded){const module=modules.find(m=>m.key===item.key);if(!module||typeof item.open!=='boolean')throw Error('Choose a visible module and boolean open');sections.remember(module.scope,item.open);}}
 if(changes.order!==undefined){if(!Array.isArray(changes.order)||changes.order.length!==order.length||new Set(changes.order).size!==order.length||changes.order.some(key=>!order.includes(key)))throw Error('Order must include every visible top-level module once');sections.rememberOrder(next.tab,changes.order);}
 if(changes.resetOrder!==undefined){if(changes.resetOrder!==true)throw Error('resetOrder must be true');sections.resetOrder(next.tab);}
 if(changes.pins!==undefined){if(!Array.isArray(changes.pins)||changes.pins.length>256)throw Error('Invalid pins');for(const pin of changes.pins){if(!SHORTCUT_MODULES.includes(pin.key)||typeof pin.pinned!=='boolean'||pin.allNodes!==undefined&&typeof pin.allNodes!=='boolean'||!pin.allNodes&&!nodeIds.includes(pin.nodeId))throw Error('Invalid shortcut scope');if(pin.allNodes){if(shortcuts.global(pin.key)!==pin.pinned)shortcuts.toggleAll(pin.key);}else if(shortcuts.get(pin.nodeId).includes(pin.key)!==pin.pinned)shortcuts.toggle(pin.nodeId,pin.key);}}
 next.sections=sections.snapshot();next.shortcuts=shortcuts.snapshot();return next;
}
