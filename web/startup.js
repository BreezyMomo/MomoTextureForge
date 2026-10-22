import {uiText,localizeApplicationMarkup} from './ui-language.js';
// Keep the initial screen across editor/view mounts, including partial startup failures.
const screen=document.getElementById('startup-screen');
const status=screen?.querySelector('#startup-status');if(screen)localizeApplicationMarkup(screen);
const paint=()=>new Promise(resolve=>{
 const fallback=setTimeout(resolve,150);
 requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(fallback);resolve();}));
});

export async function startupStage(message){
 document.documentElement.dataset.ready='loading';
 if(status)status.textContent=message;
 // Give the loading screen a chance to paint before parsing definitions or building UI.
 await paint();
}

export function mountStartupContent(markup){
 document.body.innerHTML=markup;
 if(screen)document.body.prepend(screen);
}

export async function completeStartup(){
 await paint();
 document.documentElement.dataset.ready='true';
 if(!screen)return;
 screen.setAttribute('aria-busy','false');
 screen.classList.add('startup-leaving');
 setTimeout(()=>screen.remove(),200);
}

export function failStartup(error){
 document.documentElement.dataset.ready='error';
 if(!screen)return;
 if(!screen.isConnected)document.body.prepend(screen);
 screen.classList.remove('startup-leaving');
 screen.dataset.state='error';
 screen.setAttribute('aria-busy','false');
 status.textContent=uiText("ui.couldNotOpenTheCanvas");
 screen.querySelector('#startup-error').hidden=false;
 screen.querySelector('#startup-error-detail').textContent=error?.message??String(error);
 screen.querySelector('#startup-retry').onclick=()=>location.reload();
}
