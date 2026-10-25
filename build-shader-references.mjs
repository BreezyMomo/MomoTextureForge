// Only the unified postprocess renderer is distributed.
import {writeGenerated as writeFile} from './tools/write-generated.mjs';
import {buildHanddrawn} from './build-handdrawn.mjs';
export async function buildShaderReferences(){await buildHanddrawn();await writeFile(new URL('./web/shader-reference-runtime.js',import.meta.url),`// Retired renderers are not distributed.
export default {retired:true,migrateTo:"postprocess"};
`);return {};}
