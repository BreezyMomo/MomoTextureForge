import {localizeApplicationMarkup} from './ui-language.js';
import appreciationCode from './appreciation-code.js';

export function openSupportDialog(){
 const existing=document.querySelector('.support-dialog');
 if(existing){existing.querySelector('button').focus();return;}
 const returnFocus=document.activeElement?.closest('details')?.querySelector('summary')??document.activeElement;
 const dialog=document.createElement('dialog');
 dialog.className='support-dialog';
 dialog.setAttribute('aria-labelledby','support-title');
 dialog.setAttribute('aria-describedby','support-description');
 dialog.innerHTML="<header class=\"dialog-head\"><h2 id=\"support-title\" data-i18n=\"menu.support\">投币支持</h2><button type=\"button\" aria-label=\"关闭投币支持\" data-i18n-aria-label=\"ui.closeSupportDialog\" data-i18n=\"common.close\">关闭</button></header><p id=\"support-description\" data-i18n=\"ui.ifThisToolHelpsYouConsiderAVoluntaryDonationToSupport\">如果这个工具对你有帮助，欢迎自愿打赏，支持持续开发与维护。感谢你的支持！</p><figure><img alt=\"微信扫码赞赏 Momo Texture Forge\" data-i18n-alt=\"ui.scanWithWeChatToSupportMomoTextureForge\"><figcaption data-i18n=\"ui.scanWithWeChatToDonate\">微信扫码赞赏</figcaption></figure>";
 dialog.querySelector('img').src=appreciationCode;
 dialog.querySelector('button').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{dialog.remove();returnFocus?.focus();},{once:true});
 document.body.append(dialog);
 const disposeLanguage=localizeApplicationMarkup(dialog);dialog.addEventListener('close',disposeLanguage,{once:true});
 dialog.showModal();
}
