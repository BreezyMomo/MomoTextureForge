vec3 rawVectorAt(vec2 u){int id=types[0];vec2 uv=transformUV(u,transformA[0],transformB[0],polar[0]),p=uv*2.-1.;
if(id=={{id:PositionGradient}})return vec3(uv*params[0].x,0.);
if(id=={{id:HeightNormal}}){vec3 n=normalAt(u);return normalize(vec3(n.xy*params[0].x,n.z))*.5+.5;}
if(id=={{id:Curl}})return clamp(ref_vector_Curl(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:FlowMap}})return clamp(ref_vector_FlowMap(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:TurbulenceMap}})return clamp(ref_vector_TurbulenceMap(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:RadialFlow}})return clamp(ref_vector_RadialFlow(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:VortexFlow}})return clamp(ref_vector_VortexFlow(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:DirectionalFlow}})return clamp(ref_vector_DirectionalFlow(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:PolarFlow}})return clamp(ref_vector_PolarFlow(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:VectorWarp}})return clamp(ref_vector_VectorWarp(p,uv,params[0],params[1],time),0.,1.);
if(id=={{id:Displacement}})return clamp(ref_vector_Displacement(p,uv,params[0],params[1],time),0.,1.);
return vec3(.5);}
vec3 vectorAt(vec2 u){if(seamless==0||types[0]=={{id:HeightNormal}})return rawVectorAt(u);u=fract(u);vec2 w=smoothstep(vec2(1.-seamBlend),vec2(1.),u);return mix(mix(rawVectorAt(u),rawVectorAt(u-vec2(1,0)),w.x),mix(rawVectorAt(u-vec2(0,1)),rawVectorAt(u-1.),w.x),w.y);}
