vec4 generate(vec2 uv){
 vec4 sharp=texture(input0,uv),glow=texture(input1,uv);
 vec4 density=sharp+glow*softGlow*.35;
 float alpha=1.-exp(-max(0.,density.a)*exposure);
 vec3 color=density.a>.00001?density.rgb/density.a:vec3(0.);
 float fade=seamlessU>.5||endFade<=0.?1.:smoothstep(0.,endFade,uv.x)*smoothstep(0.,endFade,1.-uv.x);
 return vec4(clamp(color,0.,1.),clamp(alpha*fade,0.,1.));
}
