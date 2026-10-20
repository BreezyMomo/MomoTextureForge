float exampleFalloff(vec2 p,float radius){
  return exp(-dot(p,p)/(radius*radius));
}
