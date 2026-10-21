// The body is one logical cell. Each socket is the reflected neighboring tab.
// Render margins contain the protrusions without changing the layout pitch.
float radius=clamp(b.x,.04,.2)*2.;
float neck=radius*clamp(b.y,0.,.92),curve=clamp(c.z,0.,1.);
int style=int(clamp(round(c.y),0.,3.));
float corner=clamp(q.y>=0.?(q.x<0.?c.w:d.x):(q.x<0.?d.z:d.y),0.,.4)*2.;
vec2 box=abs(q)-vec2(1.-corner);
float distance=min(max(box.x,box.y),0.)+length(max(box,0.))-corner;
vec4 edges=round(a);
// Add tabs first, then subtract sockets. Both use the same local profile.
for(int pass=0;pass<2;pass++)for(int side=0;side<4;side++){
    float edge=edges[side];
    if((pass==0&&edge<.5)||(pass==1&&edge>-.5))continue;
    vec2 normal=side==0?vec2(0,1):side==1?vec2(1,0):side==2?vec2(0,-1):vec2(-1,0);
    vec2 v=vec2(dot(q,vec2(-normal.y,normal.x)),sign(edge)*(dot(q,normal)-1.));
    vec2 p=v-vec2(0,neck);
    float profile;
    if(style==0){
        // Superellipse: a circular bulb at 1, a squarer rounded bulb at 0.
        float power=mix(4.,2.,curve);
        vec2 t=abs(p)/radius;
        float norm=pow(pow(t.x,power)+pow(t.y,power),1./power);
        float gradient=norm>.00001?length(pow(t/norm,vec2(power-1.))):1.;
        profile=(norm-1.)*radius/max(gradient,.00001);
    }else if(style==1){
        float rounding=radius*.28*curve;
        float bottom=neck-radius*.3,top=neck+radius;
        vec2 t=abs(v-vec2(0,(top+bottom)*.5))-vec2(radius-rounding,(top-bottom)*.5-rounding);
        float head=min(max(t.x,t.y),0.)+length(max(t,0.))-rounding;
        float halfWidth=radius*(1.-.7*clamp(b.y,0.,.92));
        rounding=min(halfWidth,radius*.15)*curve;
        t=abs(v-vec2(0,(top-radius*.1)*.5))-vec2(halfWidth-rounding,(top+radius*.1)*.5-rounding);
        float stem=min(max(t.x,t.y),0.)+length(max(t,0.))-rounding;
        profile=min(head,stem);
    }else if(style==2){
        // A narrow root and wider head; round the polygon inside its bounds.
        float rounding=radius*.25*curve,r=radius-rounding;
        vec2 vertices[4]=vec2[4](vec2(-r*.32,-r),vec2(r*.32,-r),vec2(r,r),vec2(-r,r));
        float squared=100.;bool inside=true;
        for(int i=0;i<4;i++){
            vec2 start=vertices[i],segment=vertices[(i+1)%4]-start,delta=p-start;
            vec2 closest=delta-segment*clamp(dot(delta,segment)/dot(segment,segment),0.,1.);
            squared=min(squared,dot(closest,closest));
            inside=inside&&(segment.x*delta.y-segment.y*delta.x>=0.);
        }
        profile=(inside?-1.:1.)*sqrt(squared)-rounding;
    }else{
        float arch=pow(.5+.5*cos(PI*clamp(v.x/radius,-1.,1.)),mix(2.5,1.,curve));
        profile=max(abs(v.x)-radius,max(v.y-(radius+neck)*arch,-v.y-radius*.1));
    }
    distance=pass==0?min(distance,profile):max(distance,-profile);
}
float width=max(b.z,0.)*2.,soft=max(b.w,0.)*2.;
return c.x>.5?fill(distance,soft):line(distance,width,soft);
