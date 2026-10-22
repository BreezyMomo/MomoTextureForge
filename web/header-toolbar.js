// Reuse the same controls and handlers when space is limited.
export function installHeaderToolbar(){
 const settings=document.getElementById('project-settings'),examples=document.getElementById('tree-examples');
 const filePanel=document.querySelector('#header-file-menu>.header-dropdown-panel'),resourceMenu=document.getElementById('header-resource-menu');
 const settingsHome=document.createComment('canvas settings'),examplesHome=document.createComment('examples');
 settings.before(settingsHome);examples.before(examplesHome);
 const separator=document.createElement('hr');separator.hidden=true;filePanel.append(separator);
 const compact=matchMedia('(max-width:1100px)');
 function update(){
  const focused=document.activeElement;
  separator.hidden=!compact.matches;resourceMenu.hidden=!compact.matches;
  if(compact.matches){filePanel.append(settings);resourceMenu.querySelector('.header-dropdown-panel').append(examples);}
  else{settingsHome.after(settings);examplesHome.after(examples);resourceMenu.open=false;}
  // Return focus to an available trigger if resizing hides the focused command.
  if(focused===settings||focused===examples){
   if(compact.matches)(focused===settings?document.querySelector('#header-file-menu>summary'):resourceMenu.querySelector('summary')).focus();
   else focused.focus();
  }
 }
 update();compact.addEventListener('change',update);
}
