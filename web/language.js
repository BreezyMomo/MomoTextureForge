import {createLanguageController} from './vendor/momo-workbench/i18n.js';
import {messageError} from './message-catalog.js';
import config from './language-config.json' with {type:'json'};
import {resolveAlias} from './parameter-metadata.js';
export const LANGUAGE_KEY='momo-texture-language:v1';
let storage;try{storage=globalThis.localStorage;}catch{}
const controller=createLanguageController({config,storage,storageKey:LANGUAGE_KEY,messageError});
export const {SUPPORTED_LANGUAGES,DEFAULT_LANGUAGES,normalizeLanguages,languageOrderFor,languageOrder,setLanguageOrder,setLanguage,onLanguageChange,interfaceLanguage}=controller;
// Resource aliases remain owned by TextureForge, independently of UI catalogs.
export const parameterLabel=spec=>resolveAlias(spec,languageOrder());
