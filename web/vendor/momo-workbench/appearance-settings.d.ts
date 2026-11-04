import type {AppearanceController} from './appearance.js';
export interface AppearanceSettings {
 open():void;
 /** Cancels any preview, restores focus, and removes all owned subscriptions. */
 dispose():void;
}
export interface AppearanceSettingsOptions {
 appearance:AppearanceController;
 document?:Document;
 idPrefix?:string;
 ui?:{
  text?:(key:string)=>string;
  format?:(key:string,...values:unknown[])=>string;
  onLanguageChange?:(callback:()=>void)=>(()=>void);
 };
}
export function createAppearanceSettings(options:AppearanceSettingsOptions):AppearanceSettings;
