let sequence=0;

// Native radio groups retain keyboard navigation and a single selected option.
export function segmentedChoice(doc,label,options){
 const group=doc.createElement('div'),inputs=[],name='segmented-choice-'+(++sequence);
 group.className='segmented-choice';group.setAttribute('role','radiogroup');group.setAttribute('aria-label',label);
 for(const [value,text,disabled=false] of options){
  const item=doc.createElement('label'),input=doc.createElement('input'),caption=doc.createElement('span');
  item.className='segmented-choice-option';input.type='radio';input.name=name;input.value=String(value);input.disabled=disabled;input.dataset.choiceDisabled=String(disabled);caption.textContent=text;
  item.append(input,caption);group.append(item);inputs.push(input);
 }
 return {group,inputs};
}
