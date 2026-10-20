// Repeating upward arrows; time advances in UV units per second.
vec2 f=fract(vec2(u.x*max(a.x,1.),(u.y+time*a.z)*max(a.y,1.)))-.5;
float w=clamp(a.w,.1,.9)*.5;
float head=max(abs(f.x)/w+(f.y-.05)/.36-1.,max(.05-f.y,f.y-.41));
float shaft=max(abs(f.x)-w*.38,abs(f.y+.15)-.22);
float d=min(head,shaft);
return 1.-smoothstep(-.012,.012,d);
