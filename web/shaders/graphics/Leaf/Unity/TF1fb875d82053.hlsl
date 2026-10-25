#ifndef MF_GLSL_MOD
#define MF_GLSL_MOD
#define mod(x,y) ((x)-(y)*floor((x)/(y)))
#define lessThan(x,y) ((x)<(y))
#define greaterThan(x,y) ((x)>(y))
#define lessThanEqual(x,y) ((x)<=(y))
#define greaterThanEqual(x,y) ((x)>=(y))
#define equal(x,y) ((x)==(y))
#define notEqual(x,y) ((x)!=(y))
#endif


static const float MF_PI=3.14159265359;static const float MF_TAU=6.28318530718;
struct MF_Value {float4 color;float height;};
MF_Value MF_zero(){MF_Value v;v.color=float4(0.,0.,0.,0.);v.height=0.;return v;}
float2 MF_rot(float2 q,float a){float c=cos(a),s=sin(a);return float2(c*q.x+s*q.y,-s*q.x+c*q.y);}
float2 MF_place(float2 p,float4 box,float4 axis,float aspect){p-=box.xy;p=MF_rot(p*float2(aspect,1.),axis.z);p/=max(box.zw*float2(aspect,1.),float2(.000001,.000001));p.x*=axis.w;return p+axis.xy;}
float4 MF_blend(float4 dst,float4 src,int mode){float a=src.a+dst.a*(1.-src.a);if(mode==0)return float4(src.rgb+dst.rgb*(1.-src.a),a);float3 d=dst.a>0.?dst.rgb/dst.a:float3(0.,0.,0.),s=src.a>0.?src.rgb/src.a:float3(0.,0.,0.);if(mode==10)return dst*src.a;if(mode==11)return dst*(1.-src.a);float3 b=mode==6?abs(d-s):mode==7?lerp(2.*d*s,1.-2.*(1.-d)*(1.-s),step(float3(.5,.5,.5),d)):mode==8?(1.-2.*s)*d*d+2.*s*d:mode==9?min(float3(1.,1.,1.),d/max(float3(.00001,.00001,.00001),1.-s)):mode==1?d+s:mode==2?max(d,s):mode==3?d*s:mode==4?max(d-s,0.):1.-(1.-d)*(1.-s);return float4((1.-src.a)*dst.rgb+(1.-dst.a)*src.rgb+src.a*dst.a*b,a);}
float MF_height(float d,float s,float a,int mode){if(mode==0)return s+d*(1.-a);if(mode==1)return d+s;if(mode==2)return max(d,s);if(mode==3)return lerp(d,d*(a>0.?s/a:0.),a);if(mode==4)return max(d-s,0.);if(mode==6)return abs(d-s);if(mode==7)return d<.5?2.*d*s:1.-2.*(1.-d)*(1.-s);if(mode==8)return (1.-2.*s)*d*d+2.*s*d;if(mode==9)return min(1.,d/max(.00001,1.-s));if(mode==10)return d*a;if(mode==11)return d*(1.-a);return 1.-(1.-d)*(1.-s);}

float MF_graphic1_fill(float d,float s);
float MF_graphic1_segment(float2 p,float2 a,float2 b);
float2 MF_graphic1_profilePoint(float t,float side,float r,float w,float power,float bend,float skew,int leaf);
float MF_graphic1_profileShape(float2 p,float r,float w,float power,float bend,float skew,int leaf);
float MF_graphic1(float2 u,float4 a,float4 b,float4 c,float4 d,float time);
float MF_graphic1_fill(float d,float s){float aa=max(fwidth(d),.00001);return 1.-smoothstep(-aa*.5,max(s,0.)+aa*.5,d);}
float MF_graphic1_segment(float2 p,float2 a,float2 b){float2 q=p-a,v=b-a;return length(q-v*clamp(dot(q,v)/max(dot(v,v),.00001),0.,1.));}
float2 MF_graphic1_profilePoint(float t,float side,float r,float w,float power,float bend,float skew,int leaf){float y=-cos(MF_PI*t);float width=leaf==1?pow(max(cos(MF_PI*y*.5),0.),power):sqrt(max(1.-y*y,0.))*pow(max(1.-y,0.),power)/pow(1.4,power);return float2(bend*r*(1.-y*y)+side*w*width*(1.+skew*y),r*y);}
float MF_graphic1_profileShape(float2 p,float r,float w,float power,float bend,float skew,int leaf){float distance=10.;float2 left=MF_graphic1_profilePoint(0.,-1.,r,w,power,bend,skew,leaf),right=MF_graphic1_profilePoint(0.,1.,r,w,power,bend,skew,leaf);for(int j=1;j<=32;j++){float t=float(j)/32.;float2 l=MF_graphic1_profilePoint(t,-1.,r,w,power,bend,skew,leaf),h=MF_graphic1_profilePoint(t,1.,r,w,power,bend,skew,leaf);distance=min(distance,min(MF_graphic1_segment(p,left,l),MF_graphic1_segment(p,right,h)));left=l;right=h;}float phase=acos(clamp(-p.y/r,-1.,1.))/MF_PI*32.;float cell=min(floor(phase),31.);float y0=MF_graphic1_profilePoint(cell/32.,-1.,r,w,power,bend,skew,leaf).y,y1=MF_graphic1_profilePoint((cell+1.)/32.,-1.,r,w,power,bend,skew,leaf).y;float f=clamp((p.y-y0)/max(y1-y0,.0000001),0.,1.);float lo=lerp(MF_graphic1_profilePoint(cell/32.,-1.,r,w,power,bend,skew,leaf).x,MF_graphic1_profilePoint((cell+1.)/32.,-1.,r,w,power,bend,skew,leaf).x,f),hi=lerp(MF_graphic1_profilePoint(cell/32.,1.,r,w,power,bend,skew,leaf).x,MF_graphic1_profilePoint((cell+1.)/32.,1.,r,w,power,bend,skew,leaf).x,f);return abs(p.y)<=r&&p.x>=lo&&p.x<=hi?-distance:distance;}
float MF_graphic1(float2 u,float4 a,float4 b,float4 c,float4 d,float time){float2 q=u*2.-1.;float r=length(q),angle=atan2(q.y,q.x);float R=a.x,W=a.y,N=a.z,S=a.w,D=b.x,K=b.y,H=b.z,T=time*b.w;{return clamp(MF_graphic1_fill(MF_graphic1_profileShape(q,R,W,D,K,H,1),S),0.,1.);}}
MF_Value MF_node1(float2 p,float aspect,float seconds){float4 box=_MF_1_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_1_pivotTurn.xy,_MF_1_pivotTurn.z*MF_PI/180.,_MF_1_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
float time=_MF_1_clock.w>.5?seconds*_MF_1_clock.x+_MF_1_clock.y:_MF_1_clock.z;float2 graphicUV=p-.5;graphicUV=MF_rot(graphicUV/max(_MF_1_uv.x,.1),_MF_1_uv.y+length(graphicUV)*_MF_1_uvTwist);graphicUV+=_MF_1_uv.zw+.5;
float h=clamp(MF_graphic1(graphicUV,float4(_MF_1_halfHeight,_MF_1_halfWidth,8.,_MF_1_feather),float4(_MF_1_fullnessExponent,_MF_1_bend,_MF_1_asymmetry,0.2),float4(0.,0.,0.,0.),float4(0.,0.,0.,0.),time),0.,1.);result.color=float4(lerp(float3(0.,0.,0.),float3(1.,1.,1.),h)*h,h);result.height=h;
result.color*=_MF_1_opacity;result.height*=_MF_1_opacity;return result;
}
MF_Value MF_node0(float2 p,float aspect,float seconds){float4 box=_MF_0_placement;if(box.z<=0.||box.w<=0.)return MF_zero();p=MF_place(p,box,float4(_MF_0_pivotTurn.xy,_MF_0_pivotTurn.z*MF_PI/180.,_MF_0_pivotTurn.w),aspect);aspect*=box.z/box.w;if(p.x<0.||p.y<0.||p.x>=1.||p.y>=1.||false)return MF_zero();
MF_Value result=MF_zero();
{MF_Value child=MF_node1(p,aspect,seconds);result.height=MF_height(result.height,child.height,child.color.a,0);result.color=MF_blend(result.color,child.color,0);}
result.color*=_MF_0_opacity;result.height*=_MF_0_opacity;return result;
}
float4 MF_Evaluate(float2 uv,float seconds){return MF_node0(uv,1.,seconds).color;}
