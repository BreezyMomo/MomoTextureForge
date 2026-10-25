// Each fill segment has its own pair of cubic pen strokes, generated on the GPU.
// Rough.js-inspired line mechanics; not its exact polygon simplification or random stream.
StructuredBuffer<float4> _BrushData;
StructuredBuffer<uint> _BrushCounts;
StructuredBuffer<uint> _BrushDiagnostics;
float _BrushReady,_BrushFirstRow,_BrushLineCount,_BrushSpanCapacity,_DoubleFill,_BrushRowRadius;
float Cubic(float4 p,float t){float s=1-t;return s*s*s*p.x+3*s*s*t*p.y+3*s*t*t*p.z+t*t*t*p.w;}
float CubicDerivative(float4 p,float t){float s=1-t;return 3*s*s*(p.y-p.x)+6*s*t*(p.z-p.y)+3*t*t*(p.w-p.z);}
float PenCoverage(float2 p,uint index,float width,float aa){
 float4 xs=_BrushData[index],ys=_BrushData[index+1],bounds=_BrushData[index+2];
 if(p.x<bounds.x||p.x>bounds.y||p.y<bounds.z||p.y>bounds.w)return 0;
 float t=saturate((p.x-xs.x)/max(xs.w-xs.x,.01));
 [unroll]for(int j=0;j<3;j++){float dx=CubicDerivative(xs,t);t=saturate(t-(Cubic(xs,t)-p.x)/max(dx,.01));}
 float2 curve=float2(Cubic(xs,t),Cubic(ys,t));
 float2 tangent=float2(CubicDerivative(xs,t),CubicDerivative(ys,t));
 float distance=abs(p.y-curve.y)/sqrt(1+pow(tangent.y/max(tangent.x,.01),2));
 if(t<.00001||t>.99999)distance=length(p-curve);
 return 1-smoothstep(width*.5-aa,width*.5+aa,distance);
}
float BrushHatch(float2 uv,float2 designSize,float gap,float angle,float width,float2 scroll,float seconds){
 float2 p=(uv-.5)*designSize+scroll*seconds;
 float rad=angle*.017453292519943295;float2 q=float2(cos(rad)*p.x+sin(rad)*p.y,-sin(rad)*p.x+cos(rad)*p.y);
 float aa=max((length(ddx(q))+length(ddy(q)))*.3,.35);
 int nearest=(int)floor(q.y/max(gap,1.)+.5);float ink=0;
 [loop]for(int k=-(int)_BrushRowRadius;k<=(int)_BrushRowRadius;k++){
  int row=nearest+k-(int)_BrushFirstRow;if(row<0||row>=(int)_BrushLineCount)continue;
  uint count=min(_BrushCounts[row],(uint)_BrushSpanCapacity);
  [loop]for(uint run=0;run<count;run++){
   uint index=((row*(uint)_BrushSpanCapacity+run)*2)*3;
   float a=PenCoverage(q,index,width,aa);
   if(_DoubleFill>.5)a=1-(1-a)*(1-PenCoverage(q,index+3,width,aa));
   ink=1-(1-ink)*(1-a);
  }
 }
 return ink;
}
