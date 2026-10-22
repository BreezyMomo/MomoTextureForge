vec4 generate(vec2 uv){
 float sharp=texture(input0,uv).r,glow=texture(input1,uv).r;
 float density=max(0.,sharp+glow*softGlow*.35);
 float alpha=1.-exp(-density*exposure);
 float fade=seamlessU>.5||endFade<=0.?1.:smoothstep(0.,endFade,uv.x)*smoothstep(0.,endFade,1.-uv.x);
 return vec4(vec3(1.),clamp(alpha*fade,0.,1.));
}
