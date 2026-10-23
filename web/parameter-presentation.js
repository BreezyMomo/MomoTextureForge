import {uiText} from './ui-language.js';
// Presentation follows stable paths, never translated labels or user parameter names.
const axes={'transform.x':'x','transform.y':'y','transform.width':'x','transform.height':'y','transform.pivotX':'x','transform.pivotY':'y','uv.2':'x','uv.3':'y','arrange.13':'x','arrange.14':'y','arrangeExtra.width':'x','arrangeExtra.height':'y'};
const units={'transform.rotation':'degrees','uv.1':'degrees','shapeClock.offset':'seconds','shapeClock.value':'seconds'};
const labels={'transform.x':'parameter.position','transform.y':'parameter.position','transform.width':'parameter.size','transform.height':'parameter.size','transform.pivotX':'parameter.pivot','transform.pivotY':'parameter.pivot','uv.2':'parameter.uvOffset','uv.3':'parameter.uvOffset','arrange.13':'parameter.layoutCenter','arrange.14':'parameter.layoutCenter','arrangeExtra.width':'parameter.size','arrangeExtra.height':'parameter.size','transform.rotation':'editor.rotation','uv.1':'editor.uvRotation','shapeClock.offset':'parameter.timeOffset','shapeClock.value':'editor.shapeTime'};
export function decorateParameterRow(row,path){
 const doc=row.ownerDocument,axis=axes[path],unit=units[path];
 const label=row.querySelector(':scope>label,:scope>span:first-child');if(labels[path])label.textContent=uiText(labels[path]);
 if(axis){const marker=doc.createElement('span');marker.className='parameter-axis';marker.textContent=uiText('parameter.axis.'+axis);marker.setAttribute('aria-hidden','true');row.dataset.parameterAxis=axis;label.prepend(marker);}
 if(unit){const suffix=doc.createElement('span');suffix.className='parameter-unit';suffix.textContent=uiText('parameter.unit.'+unit);suffix.setAttribute('aria-hidden','true');row.classList.add('parameter-with-unit');row.append(suffix);}
}
