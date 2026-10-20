import {writeFile} from 'node:fs/promises';
import {BY_ID} from '../web/catalog.js';
import {VERTEX_GLSL,fragmentGLSL} from '../web/renderer.js';
const p=BY_ID.get('OgeeFlowerTile');
await writeFile(process.argv[2],JSON.stringify({vertex:VERTEX_GLSL,index:p.index,params:p.defaults,parameters:p.parameters,fragments:[fragmentGLSL([p.index],0,-1)]}));
