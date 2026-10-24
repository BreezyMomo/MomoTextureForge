// Skill locations follow each client's documented native directories.
export const SKILL_AGENTS=[
 {id:'codex',name:'Codex',parts:['.agents','skills'],docs:'https://learn.chatgpt.com/docs/build-skills'},
 {id:'claude',name:'Claude Code',parts:['.claude','skills'],docs:'https://code.claude.com/docs/en/skills'},
 {id:'cursor',name:'Cursor',parts:['.cursor','skills'],docs:'https://cursor.com/docs/skills'},
 {id:'agents',name:'Agent Skills',parts:['.agents','skills'],docs:'https://agentskills.io'},
];
export const INSTALL_MANIFEST='.momo-texture-forge-install.json';
export function skillAgent(id){const agent=SKILL_AGENTS.find(a=>a.id===id);if(!agent)throw Error('Unknown target agent');return agent;}
export function installPathLabel(agent,projectName=null){const path=skillAgent(agent).parts.join('/');return projectName?projectName+'/'+path:'~/'+path;}
export function skillDirectoryParts(agent,scope,directoryName){
 const {parts}=skillAgent(agent);if(!['personal','project'].includes(scope))throw Error('Invalid installation scope');
 if(scope==='personal'){
  if(directoryName===parts.at(-1))return [];
  if(directoryName===parts[0])return parts.slice(1);
 }
 return [...parts];
}
export function installFilePath(path){
 if(typeof path!=='string'||path.length>240||path.includes('\\')||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..'||/[<>:"|?*\x00-\x1f]/.test(p)||/[ .]$/.test(p)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))||path===INSTALL_MANIFEST||path.startsWith('.momo-'))throw Error('Invalid installer file path: '+path);
 return path.split('/');
}
export function validateSkillFiles(folder,files){
 if(!['texture-forge-author','texture-forge-effects'].includes(folder)||!files||typeof files!=='object'||Array.isArray(files)||typeof files['SKILL.md']!=='string')throw Error('Invalid Texture Forge skill');
 const names=Object.keys(files),seen=new Set();if(names.length>512)throw Error('Too many skill files');let size=0;
 for(const name of names){installFilePath(name);const lower=name.toLowerCase();if(seen.has(lower)||typeof files[name]!=='string')throw Error('Duplicate or invalid skill file');seen.add(lower);size+=new TextEncoder().encode(files[name]).length;}
 if(size>32*1024*1024)throw Error('Skill exceeds 32 MiB');
 const match=/^---\s*\r?\n[\s\S]*?^name:\s*([^\r\n]+)$/m.exec(files['SKILL.md']);if(match?.[1].trim()!==folder)throw Error('Skill folder and name must match');return names;
}
