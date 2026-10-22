// Repository documentation has two maintained editions, independent of UI catalogs.
export const documentationLanguage=language=>language==='zh-CN'?'zh-CN':'en';
export const documentationFile=(file,language)=>{const base=file.replace(/\.en\.md$/i,'.md');return documentationLanguage(language)==='zh-CN'?base:base.replace(/\.md$/i,'.en.md');};
export const documentationURL=(file,language)=>'https://github.com/BreezyMomo/MomoTextureForge/blob/main/'+documentationFile(file,language);
export const repositoryURL=(base,language)=>base+(documentationLanguage(language)==='zh-CN'?'':'/blob/main/README.en.md');
