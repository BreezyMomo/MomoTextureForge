export const APPEARANCE_KEY: string;
export const PRESET_THEME_IDS: readonly ['xuanhei','shuimo','yuebai','qingci','qinghua','mineral','ouhe'];
export const THEME_IDS: typeof PRESET_THEME_IDS;
export const COLOR_ROLE_IDS: readonly ['action','selection','navigation','control'];
export const STYLE_IDS: readonly ['standard','refined','airy','minimal','soft','aurora','pulse','cinema','candy'];
export const DENSITY_IDS: readonly ['compact','comfortable'];
export const TAB_STYLE_IDS: readonly ['classic','segmented','pill','underline'];
export type ThemeId = typeof THEME_IDS[number];
export type ColorRole = typeof COLOR_ROLE_IDS[number];
export type InterfaceStyle = typeof STYLE_IDS[number];
export type InterfaceDensity = typeof DENSITY_IDS[number];
export type TabStyle = typeof TAB_STYLE_IDS[number];
export type AppearanceColors = Record<ColorRole,string|null>;
export interface AppearancePreferences {theme:ThemeId;style:InterfaceStyle;density:InterfaceDensity;tabs:TabStyle;colors:AppearanceColors}
export interface AppearancePalette {
 id:ThemeId;theme:'classic'|'light';accent:string;onAccent:string;accentText:string;selected:string;hover:string;
 surfaces:Record<string,string>;roles:Record<string,string>;roleSurfaces:Record<'selection'|'navigation'|'control',string>;colors:Record<ColorRole,string>;
}
export interface PreferenceStorage {getItem(key:string):string|null|undefined;setItem(key:string,value:string):unknown}
export interface ThemeRoot {
 dataset:Record<string,string|undefined>;
 style:{colorScheme:string;setProperty(key:string,value:string):unknown;removeProperty?(key:string):unknown};
}
export interface AppearanceController {
 get():AppearancePreferences;palette():AppearancePalette;preview(value:unknown):void;save(value:unknown):boolean;
 subscribe(listener:(preferences:AppearancePreferences,palette:AppearancePalette)=>void):()=>void;
 dispose():void;
}
export function defaultAppearanceColors():AppearanceColors;
export function normalizeAppearance(value?:unknown):AppearancePreferences;
export function colorContrast(a:string,b:string):number;
export function appearancePalette(preferences?:unknown):AppearancePalette;
export function createAppearance(options?:{storage?:PreferenceStorage;root?:ThemeRoot;storageKey?:string;appId?:string}):AppearanceController;
