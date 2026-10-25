import {readFile,writeFile,mkdir,rename,rm} from 'node:fs/promises';
import {dirname} from 'node:path';
let sequence=0;
// Keep generated artifacts readable during rebuilds, including files open in Windows viewers.
export async function writeGenerated(path,data){
 const bytes=Buffer.from(data);try{if((await readFile(path)).equals(bytes))return;}catch(error){if(error.code!=='ENOENT')throw error;}
 await mkdir(dirname(path),{recursive:true});const temporary=path+'.tmp-'+process.pid+'-'+sequence++;
 try{await writeFile(temporary,bytes);for(let attempt=0;;attempt++){try{await rename(temporary,path);break;}catch(error){if(attempt>=7||!['EPERM','EBUSY','EACCES','UNKNOWN'].includes(error.code))throw error;await new Promise(done=>setTimeout(done,Math.min(50*2**attempt,1000)));}}}finally{await rm(temporary,{force:true});}
}
