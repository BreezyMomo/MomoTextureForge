import { CATALOG } from "./catalog.js";
import { BUILTIN, formulaText } from "./definition-runtime.js";
import { patternFunction, extraFormulaLibraries, vectorCondition } from "./definition-compiler.js";
export const MATH_GLSL = BUILTIN.libraries["math-v1"];
export const VECTOR_GLSL = BUILTIN.vector;
export function patternGLSL(indices = null) {
  return patternFunction(BUILTIN, indices);
}
export const additionalPatternGLSL = indices => extraFormulaLibraries(BUILTIN, indices);
export const vectorTypeCondition = expression => vectorCondition(BUILTIN, expression);
export const PATTERN_EXPRESSIONS = CATALOG.map(t => formulaText(t.definition.outputs.scalar));
