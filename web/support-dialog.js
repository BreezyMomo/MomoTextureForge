import appreciationCode from './appreciation-code.js';

export function openSupportDialog(){
 const existing=document.querySelector('.support-dialog');
 if(existing){existing.querySelector('button').focus();return;}
 const returnFocus=document.activeElement?.closest('details')?.querySelector('summary')??document.activeElement;
 const dialog=document.createElement('dialog');
 dialog.className='support-dialog';
 dialog.setAttribute('aria-labelledby','support-title');
 dialog.setAttribute('aria-describedby','support-description');
 dialog.innerHTML='<header class="dialog-head"><h2 id="support-title">投币支持</h2><button type="button" aria-label="关闭投币支持">关闭</button></header><p id="support-description">如果这个工具对你有帮助，欢迎自愿打赏，支持持续开发与维护。感谢你的支持！</p><figure><img alt="微信扫码赞赏 Momo Texture Forge"><figcaption>微信扫码赞赏</figcaption></figure>';
 dialog.querySelector('img').src=appreciationCode;
 dialog.querySelector('button').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();returnFocus?.focus();},{once:true});
 document.body.append(dialog);
 dialog.showModal();
}
