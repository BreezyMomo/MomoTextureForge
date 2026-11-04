import zhCN from './zh-CN.json' with {type:'json'};
import en from './en.json' with {type:'json'};
import {WORKBENCH_CATALOGS} from '../vendor/momo-workbench/locales.js';
// Product text extends the shared chrome without maintaining a second appearance catalog.
export const UI_CATALOGS=Object.freeze({'zh-CN':{...WORKBENCH_CATALOGS['zh-CN'],...zhCN},en:{...WORKBENCH_CATALOGS.en,...en}});
