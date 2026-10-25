// Only the unified postprocess renderer is distributed.
import {writeFile} from 'node:fs/promises';
import {buildHanddrawn} from './build-handdrawn.mjs';
export async function buildShaderReferences(){await buildHanddrawn();await writeFile(new URL('./web/shader-reference-runtime.js',import.meta.url),`// Retired renderers are not distributed.
export default {retired:true,migrateTo:"postprocess"};
`);return {};}
