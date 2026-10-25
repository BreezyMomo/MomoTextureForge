// Shared RGBA input adaptation. Native web working RGB is premultiplied numeric sRGB.
Texture2D<float4> _InputTex;
SamplerState sampler_InputTex;
float4 _InputTex_ST;
float _InputPremultiplied,_InputEncoding;
float3 MF_ToSRGB(float3 x){return lerp(x*12.92,1.055*pow(max(x,0.),1./2.4)-.055,step(.0031308,x));}
float3 MF_ToLinear(float3 x){return lerp(x/12.92,pow(max((x+.055)/1.055,0.),2.4),step(.04045,x));}
float4 MF_InputSample(float2 uv){uv=uv*_InputTex_ST.xy+_InputTex_ST.zw;if(any(uv<0)||any(uv>1))return 0;return _InputTex.SampleLevel(sampler_InputTex,uv,0);}
float3 MF_InputStraight(float4 c){return _InputPremultiplied>.5?(c.a>1e-6?c.rgb/c.a:float3(0,0,0)):c.rgb;}
float3 MF_InputNativeRGB(float4 c){float3 rgb=MF_InputStraight(c);
#ifndef UNITY_COLORSPACE_GAMMA
 if(_InputEncoding<.5)rgb=MF_ToSRGB(rgb);
#endif
 return rgb*saturate(c.a);
}
float4 MF_InputLinear(float4 c){float3 rgb=MF_InputStraight(c);
#ifndef UNITY_COLORSPACE_GAMMA
 if(_InputEncoding>.5)rgb=MF_ToLinear(rgb);
#endif
 return float4(rgb,saturate(c.a));
}
float4 MF_HanddrawnOver(float4 base,float3 rgb,float opacity){float a=saturate(opacity),outA=a+base.a*(1-a);return float4((rgb*a+base.rgb*base.a*(1-a))/max(outA,1e-6),outA);}
