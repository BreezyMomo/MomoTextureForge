import type {PreferenceStorage} from './appearance.js';
export const LANGUAGE_KEY:string;
export interface LanguageDefinition {code:string;name:string}
export interface LanguageConfig {default:string;languages:readonly LanguageDefinition[]}
export interface MessageError extends Error {messageKey:string;messageValues:unknown[]}
export type MessageErrorFactory=(key:string,...values:unknown[])=>Error;
export type Catalogs=Record<string,Record<string,string>>;
export interface SerializedMessageError {message:string;messageKey?:string;messageValues?:unknown[]}
export interface LanguageController {
 SUPPORTED_LANGUAGES:readonly Readonly<LanguageDefinition>[];DEFAULT_LANGUAGES:readonly string[];
 normalizeLanguages(input:unknown):string[];languageOrderFor(code:string):string[];languageOrder():string[];
 interfaceLanguage():string;setLanguage(code:string):void;setLanguageOrder(order:readonly string[]):void;
 onLanguageChange(listener:(languages:string[])=>void):()=>void;dispose():void;
}
export interface MessageCatalog {
 hasMessage(key:unknown):boolean;messageText(key:string,language?:string):string;
 formatMessage(key:string,values?:readonly unknown[],language?:string):string;
 messageError(key:string,...values:unknown[]):MessageError;
 serializeMessageError(error:unknown):SerializedMessageError;
 restoreMessageError(record:SerializedMessageError|string|unknown):Error;
}
export function canonicalLanguage(value:unknown,messageError?:MessageErrorFactory):string;
export function createLanguageController(options:{config:LanguageConfig;storage?:PreferenceStorage;storageKey?:string;initialLanguage?:string;messageError?:MessageErrorFactory}):LanguageController;
export function createMessageCatalog(options:{config:LanguageConfig;catalogs:Catalogs}):MessageCatalog;
export function validateCatalogs(options:{config:LanguageConfig;catalogs:Catalogs}):{languages:string[];keys:number};
