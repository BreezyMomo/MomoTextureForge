import {parameterLabel} from './language.js';
// Compatibility view; parameter definitions now belong to the pattern record.
import { BUILTIN } from "./definition-runtime.js";
export const PARAMETER_LAYOUTS = Object.fromEntries(BUILTIN.catalog.map(p => [p.id, p.parameters.map(s => s.key + parameterLabel(s)).join(" ")]));
export function parameterDefinitions(id) {
  const pattern = BUILTIN.catalog.find(p => p.id === id);
  if (!pattern) throw new Error(`Missing parameter layout: ${id}`);
  return pattern.parameters.map(p => ({...p}));
}