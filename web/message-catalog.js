// Product catalogs retain their message IDs; formatting and fallback are shared.
import {createMessageCatalog} from './vendor/momo-workbench/i18n.js';
import {UI_CATALOGS} from './locales/catalogs.js';
import config from './language-config.json' with {type:'json'};
export const {hasMessage,messageText,formatMessage,messageError,serializeMessageError,restoreMessageError}=createMessageCatalog({config,catalogs:UI_CATALOGS});
