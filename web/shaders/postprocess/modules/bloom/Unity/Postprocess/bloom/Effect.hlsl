


 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 Texture2D<float4> _MainTex,_MF_OriginalTex,_MF_HeightTex;SamplerState sampler_MainTex;
 float4 _MainTex_TexelSize;
 float _MF_strength;
float _MF_radius;
float _MF_threshold;
 float _MF_Seconds,_MF_UseExplicitTime,_MF_InputLinear,_MF_InputPremultiplied,_MF_HeightMode,_MF_InternalInput;
 float2 _MF_BlurDirection;int _MF_Operation;
 static float2 uv,contourStep;static int repeatNode=0;
 #define operation _MF_Operation
 #define srcColor _MainTex
 #define dstColor _MF_OriginalTex
 #define srcHeight _MF_HeightTex
 #define dstHeight _MF_HeightTex
 #define tableTex _MainTex
 #define mod(x,y) ((x)-(y)*floor((x)/(y)))
 float3 MF_toSRGB(float3 c){return lerp(c*12.92,1.055*pow(max(c,0.),1./2.4)-.055,step(.0031308,c));}
 float4 MF_external(Texture2D<float4> tex,float2 p){float4 c=tex.SampleLevel(sampler_MainTex,p,0);if(_MF_InputPremultiplied>.5)c.rgb=c.a>.00001?c.rgb/c.a:float3(0,0,0);if(_MF_InputLinear>.5)c.rgb=MF_toSRGB(c.rgb);c.rgb*=c.a;return c;}
 float4 MF_texture(Texture2D<float4> tex,float2 p){return _MF_InternalInput>.5?tex.SampleLevel(sampler_MainTex,p,0):MF_external(tex,p);}
 float MF_height(float2 p){if(_MF_HeightMode>1.5)return _MF_HeightTex.SampleLevel(sampler_MainTex,p,0).r;float4 c=MF_texture(_MainTex,p);return _MF_HeightMode>.5?dot(c.rgb,float3(.2126,.7152,.0722)):c.a;}
 #ifndef MF_GLSL_MOD
#define MF_GLSL_MOD
#define mod(x,y) ((x)-(y)*floor((x)/(y)))
#define lessThan(x,y) ((x)<(y))
#define greaterThan(x,y) ((x)>(y))
#define lessThanEqual(x,y) ((x)<=(y))
#define greaterThanEqual(x,y) ((x)>=(y))
#define equal(x,y) ((x)==(y))
#define notEqual(x,y) ((x)!=(y))
float2x2 MF_mat2(float a,float b,float c,float d){return float2x2(a,c,b,d);}
float2x2 MF_mat2(float2 a,float2 b){return float2x2(a.x,b.x,a.y,b.y);}
float2x2 MF_mat2(float s){return float2x2(s,0.,0.,s);}
#endif

static float fxAmount,fxThreshold;
static float4 fxData[3],fxBounds;
static float3 fxColors[3];
static float2 fxMetric;
float2 fxPosition(){return fxBounds.xy+uv*fxBounds.zw;}
float2 fxTexture(float2 p){return (p-fxBounds.xy)/fxBounds.zw;}
float3 fxStraight(float4 c){return c.a>.00001?c.rgb/c.a:float3(0,0,0);}
float fxLuma(float3 c){return dot(c,float3(.2126,.7152,.0722));}
float4 fxColor(float2 p){if(repeatNode==1)p=frac(p);if(any(lessThan(p,float2(0,0)))||any(greaterThan(p,float2(1,1))))return float4(0,0,0,0);return MF_texture(srcColor,p);}
float fxHeight(float2 p){if(repeatNode==1)p=frac(p);if(any(lessThan(p,float2(0,0)))||any(greaterThan(p,float2(1,1))))return 0.;return MF_height(p);}



void applyFx(out float4 c,out float h){
 c=MF_texture(srcColor,uv);h=MF_height(uv);
 if(operation==10){c=float4(0,0,0,0);h=0.;float sum=0.;for(int i=-8;i<=8;i++){float x=float(i)/8.,weight=exp(-x*x*3.);float2 q=uv+contourStep*x;c+=fxColor(q)*weight;h+=fxHeight(q)*weight;sum+=weight;}c/=sum;h/=sum;}
 if(operation==11){float v=max(max(c.r,c.g),c.b)/max(c.a,.00001),weight=max(0.,v-fxThreshold)/max(v,.00001);c*=weight;h*=weight;}
 if(operation==12){float4 base=MF_external(_MF_OriginalTex,uv);float bh=MF_height(uv);float a=clamp(base.a+c.a*fxAmount*(1.-base.a),0.,1.);c=float4(base.rgb+c.rgb*fxAmount,a);h=bh+c.a*fxAmount;}
 if(operation==13){float2 d=1./float2(_MainTex_TexelSize.zw);float4 b=(fxColor(uv+float2(d.x,0))+fxColor(uv-float2(d.x,0))+fxColor(uv+float2(0,d.y))+fxColor(uv-float2(0,d.y)))*.25;float3 rgb=c.rgb/max(c.a,.00001),nearby=b.rgb/max(b.a,.00001);c.rgb=max(float3(0,0,0),rgb+(rgb-nearby)*fxAmount)*c.a;float bh=(fxHeight(uv+float2(d.x,0))+fxHeight(uv-float2(d.x,0))+fxHeight(uv+float2(0,d.y))+fxHeight(uv-float2(0,d.y)))*.25;h=max(0.,h+(h-bh)*fxAmount);}
 if(operation==14){float2 d=contourStep;if(fxData[0].x>1.5){float2 p=(fxPosition()-.5)*fxMetric;d=length(p)>.00001?normalize(p)*(contourStep.x*fxBounds.zw.x*fxMetric.x)/fxMetric/fxBounds.zw:float2(0,0);}else if(fxData[0].x>.5)d=float2(0,contourStep.y);else d.y=0.;float4 red=fxColor(uv+d),blue=fxColor(uv-d);float a=max(c.a,max(red.a,blue.a));c=float4(red.r,c.g,blue.b,a);}
 if(operation==15){float dark=max(2.,floor(fxAmount)),light=fxThreshold>0.?max(2.,floor(fxThreshold)):dark;float3 rgb=clamp(fxStraight(c),0.,1.);float levels=floor(lerp(dark,light,smoothstep(0.,1.,fxLuma(rgb)))+.5);c.rgb=floor(rgb*(levels-1.)+.5)/(levels-1.)*c.a;float hl=floor(lerp(dark,light,smoothstep(0.,1.,clamp(h,0.,1.)))+.5);h=floor(clamp(h,0.,1.)*(hl-1.)+.5)/(hl-1.);}
 if(operation==20){float2 stepSize=fxData[0].xy;float2 p=(floor(fxPosition()/stepSize)+.5)*stepSize;float2 q=fxTexture(p);c=fxColor(q);h=fxHeight(q);}
 if(operation==21){float2 p=fxPosition();float w=max(.00001,fxData[0].y*.5),edge=0.;if(fxData[1].x>.5)edge=max(edge,1.-smoothstep(0.,w,1.-p.y));if(fxData[1].y>.5)edge=max(edge,1.-smoothstep(0.,w,p.y));if(fxData[1].z>.5)edge=max(edge,1.-smoothstep(0.,w,p.x));if(fxData[1].w>.5)edge=max(edge,1.-smoothstep(0.,w,1.-p.x));c.rgb=lerp(fxStraight(c),fxColors[0],clamp(edge*fxData[0].x,0.,1.))*c.a;}
 if(operation==22){float wave=.5+.5*cos(6.28318530718*(fxPosition().y*fxData[0].x+fxData[0].y));c.rgb=lerp(fxStraight(c),fxColors[0],wave*fxData[0].z)*c.a;}
 if(operation>=23&&operation<=25){float2 p=fxPosition();if(operation==23){float2 v=(p-.5)*fxMetric;float sector=6.28318530718/fxData[0].x,angle=atan2(v.y,v.x)-radians(fxData[0].y);angle=abs(mod(angle,sector)-sector*.5);p=.5+length(v)*float2(cos(angle),sin(angle))/fxMetric;}if(operation==24){if(fxData[0].x>.5)p.x=1.-abs(2.*frac(p.x)-1.);if(fxData[0].y>.5)p.y=1.-abs(2.*frac(p.y)-1.);}if(operation==25){float2 v=(p-.5)*fxMetric;float fade=max(0.,1.-length(v)/fxData[0].y),a=fxData[0].x*fade*fade;v=float2(cos(a)*v.x+sin(a)*v.y,-sin(a)*v.x+cos(a)*v.y);p=.5+v/fxMetric;}float2 q=fxTexture(p);c=fxColor(q);h=fxHeight(q);}
 if(operation==26){float2 d=contourStep;float gx=0.,gy=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float value=fxLuma(fxStraight(fxColor(uv+float2(x,y)*d)));gx+=value*float(x)*float(y==0?2:1);gy+=value*float(y)*float(x==0?2:1);}float edge=clamp(length(float2(gx,gy))*fxAmount,0.,1.);c.rgb=lerp(fxStraight(c),fxColors[0],edge)*c.a;}
 if(operation==27){float value=clamp(fxLuma(fxStraight(c)),0.,1.);c.rgb=(value<.5?lerp(fxColors[0],fxColors[1],value*2.):lerp(fxColors[1],fxColors[2],value*2.-1.))*c.a;}
 if(operation==28){float distance=length((fxPosition()-fxData[0].xy)*fxMetric),radius=fxData[0].z,feather=fxData[0].w;float mask=feather<=.00001?1.-step(radius,distance):1.-smoothstep(max(0.,radius-feather),radius,distance);if(fxData[1].x>.5)mask=1.-mask;c*=mask;h*=mask;}
 if(operation==29){float3 rgb=fxStraight(c);float key=clamp(max(rgb.r,max(rgb.g,rgb.b)),0.,1.),a=lerp(1.,key,fxAmount);c.rgb=rgb/max(a,.00001)*(c.a*a);c.a*=a;h*=a;}
 if(operation==30){float2 d=contourStep;float left=fxHeight(uv-float2(d.x,0)),right=fxHeight(uv+float2(d.x,0)),bottom=fxHeight(uv-float2(0,d.y)),top=fxHeight(uv+float2(0,d.y));float2 slope=float2(left-right,bottom-top)*fxAmount;if(fxData[0].x>.5)slope.y=-slope.y;c.rgb=(normalize(float3(slope,1.))*.5+.5)*c.a;}
 if(operation==31){float4 ink=MF_texture(tableTex,uv);if(fxData[0].x<.5){c=ink+c*(1.-ink.a);h=ink.a+h*(1.-ink.a);}else{c=ink;h=ink.a;}}



}

 struct MF_In {float4 positionOS:POSITION;float2 uv:TEXCOORD0;};struct MF_Out {float4 positionCS:SV_POSITION;float2 uv:TEXCOORD0;};
 MF_Out MF_Vert(MF_In i){MF_Out o;o.positionCS=TransformObjectToHClip(i.positionOS.xyz);o.uv=i.uv;return o;}
 float4 MF_Frag(MF_Out i):SV_Target {uv=i.uv;float seconds=_MF_UseExplicitTime>.5?_MF_Seconds:_Time.y;float2 dimensions=_MainTex_TexelSize.zw;float2 pixel=min(dimensions.x,dimensions.y)/512.*_MainTex_TexelSize.xy;
 fxBounds=float4(0,0,1,1);fxMetric=dimensions/min(dimensions.x,dimensions.y);fxAmount=0;fxThreshold=0;contourStep=float2(0,0);
 fxData[0]=fxData[1]=fxData[2]=float4(0,0,0,0);fxColors[0]=fxColors[1]=fxColors[2]=float3(0,0,0);
 fxThreshold=_MF_threshold;fxAmount=_MF_strength;contourStep=_MF_BlurDirection*_MF_radius*pixel;
 float4 c;float h;applyFx(c,h);return c;}
