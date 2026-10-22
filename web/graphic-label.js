import {uiText} from './ui-language.js';
import {languageOrder} from './language.js';
import {resolveGraphicName} from './graphic-name.js';
import {CATEGORIES} from './catalog.js';
export const graphicLabel=resource=>resolveGraphicName(resource,languageOrder());
export function categoryLabel(index){const category=CATEGORIES[index];return category?.id?uiText('categories.'+category.id+'.name'):category?.name??'';}
