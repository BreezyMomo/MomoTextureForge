// Keep window controls outside the scrollable content, including on short screens.
export function prepareDialogLayout(dialog){
 if(dialog.classList.contains('scrollable-dialog'))return;
 const header=dialog.querySelector(':scope>header');if(!header)return;
 const footer=dialog.querySelector(':scope>footer'),body=dialog.ownerDocument.createElement('div');
 body.className='dialog-scroll-body';
 for(const child of [...dialog.childNodes])if(child!==header&&child!==footer)body.append(child);
 header.after(body);dialog.classList.add('scrollable-dialog');
}
