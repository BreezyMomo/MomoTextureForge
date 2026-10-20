vec2 start=a.xy,end=a.zw,delta=end-start;float len=length(delta),d;
if(len<.000001)d=length(q-start)-b.x*.5;
else if(b.y>=.5)d=ref_sdSeg(q,start,end)-b.x*.5;
else{vec2 dir=delta/len,p=q-(start+end)*.5;d=ref_sdBox(vec2(dot(p,dir),dot(p,vec2(-dir.y,dir.x))),vec2(len*.5,b.x*.5));}return ref_fillD(d,b.z);
