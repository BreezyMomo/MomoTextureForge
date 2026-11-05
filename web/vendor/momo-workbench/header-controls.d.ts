import type {AppearanceController} from './appearance.js';
import type {AppearanceSettings} from './appearance-settings.js';
export interface AppearanceTriggerOptions {
 button:HTMLButtonElement;
 appearance:AppearanceController;
 settings:Pick<AppearanceSettings,'open'>;
 ui?:{text?:(key:string)=>string;onLanguageChange?:(callback:()=>void)=>(()=>void)};
}
export interface AppearanceTrigger {dispose():void}
export function createAppearanceTrigger(options:AppearanceTriggerOptions):AppearanceTrigger;
