vec4 generate(vec2 uv){
 vec3 sharp=texture(input0,uv).rgb,small=texture(input1,uv).rgb,large=texture(input2,uv).rgb;
 vec3 emitted=sharp+small*bloomStrengths.x+large*bloomStrengths.y;
 vec3 mapped=vec3(1)-exp(-emitted*emissionIntensity);
 float alpha=clamp(max(max(mapped.r,mapped.g),mapped.b),0.,1.);
 return vec4(alpha>.00001?mapped/alpha:vec3(0),alpha);
}
