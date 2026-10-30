// TextureForge keeps its preference namespace while using the shared implementation.
export * from './vendor/momo-workbench/appearance.js';
import {createAppearance as createWorkbenchAppearance} from './vendor/momo-workbench/appearance.js';
export const APPEARANCE_KEY='momo-texture-appearance:v1';
export const createAppearance=options=>createWorkbenchAppearance({storageKey:APPEARANCE_KEY,...options});
let storage;try{storage=globalThis.localStorage;}catch{}
export const appearance=globalThis.document?createAppearance({storage,root:document.documentElement}):null;
