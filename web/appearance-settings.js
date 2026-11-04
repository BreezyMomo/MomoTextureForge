import {createAppearanceSettings} from './vendor/momo-workbench/appearance-settings.js';
import {appearance} from './appearance.js';
import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';
let settings;
export function openAppearanceSettings(){
 settings??=createAppearanceSettings({appearance,ui:{text:uiText,format:uiFormat,onLanguageChange}});
 settings.open();
}
