// Retired export API: retain explicit migration, never the old renderer.
import {RETIRED_HANDDRAWN_MESSAGE} from './handdrawn-contract.js';
export function dynamicSketchSupport(){return {supported:false,retired:true,migrateTo:'postprocess',reason:RETIRED_HANDDRAWN_MESSAGE};}
export function projectShaderCapabilities(){return dynamicSketchSupport();}
export async function exportDynamicSketch(){throw Error(RETIRED_HANDDRAWN_MESSAGE);}
