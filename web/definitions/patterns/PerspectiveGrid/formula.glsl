// Thin perspective lines, fading frequencies that exceed the pixel footprint.
float y=(1.-u.y)-a.x;
float safeY=max(y,.004);
vec2 grid=vec2((u.x-.5)*a.z,a.y)/safeY;
vec2 footprint=max(fwidth(grid),vec2(.0001));
vec2 distanceToLine=abs(fract(grid+.5)-.5);
vec2 width=vec2(clamp(a.w,.01,.4)*.5);
vec2 lines=1.-smoothstep(width-footprint*.5,width+footprint*.5,distanceToLine);
lines*=1.-smoothstep(vec2(.35),vec2(1.),footprint);
return max(lines.x,lines.y)*smoothstep(.004,.025,y);
