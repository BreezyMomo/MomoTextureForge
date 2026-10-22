import zhCN from './zh-CN.json' with {type:'json'};
import en from './en.json' with {type:'json'};
// Every supported build language has its own catalog, indexed by the same IDs.
export const UI_CATALOGS=Object.freeze({'zh-CN':zhCN,en});
