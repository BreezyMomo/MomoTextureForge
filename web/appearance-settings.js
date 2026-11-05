import {createAppearanceSettings} from './vendor/momo-workbench/appearance-settings.js';
import {createAppearanceTrigger} from './vendor/momo-workbench/header-controls.js';
import {appearance} from './appearance.js';
import {uiText,uiFormat} from './ui-language.js';
import {onLanguageChange} from './language.js';
let settings;
function controller(){return settings??=createAppearanceSettings({appearance,ui:{text:uiText,format:uiFormat,onLanguageChange}});}
export function openAppearanceSettings(){controller().open();}
export function installAppearanceTrigger(button){return createAppearanceTrigger({button,appearance,settings:controller(),ui:{text:uiText,onLanguageChange}});}
