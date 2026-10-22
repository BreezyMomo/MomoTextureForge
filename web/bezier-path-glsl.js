import {BEZIER_SEGMENTS} from './bezier-path.js';
// Additional spans keep the original cubic's scalar/palette/UV rendering contract.
export const BEZIER_PATH_GLSL=`
uniform vec2 bezierTail[${(BEZIER_SEGMENTS-1)*3}];uniform int bezierSegmentCount;
float ribbonPathShape(vec2 p,vec4 a,vec4 b,vec4 c,vec4 d){
 if(c.w<=0.)return 0.;float distance=1000.,nearest=0.,total=float(bezierSegmentCount),finish=c.w*total;vec2 previous=a.xy,start=previous,lastTangent=vec2(1,0);
 for(int segment=0;segment<${BEZIER_SEGMENTS};segment++){
  if(segment>=bezierSegmentCount||float(segment)>=finish)break;
  vec4 aa=a,bb=b;if(segment>0){int offset=(segment-1)*3;aa=vec4(previous,bezierTail[offset]);bb=vec4(bezierTail[offset+1],bezierTail[offset+2]);}
  float end=min(1.,finish-float(segment)),before=0.;previous=aa.xy;
  for(int j=1;j<=48;j++){float t=float(j)/48.*end;vec2 next=cubicPoint(aa,bb,t),v=next-previous;float h=clamp(dot(p-previous,v)/max(dot(v,v),.0000001),0.,1.);float at=(float(segment)+mix(before,t,h))/total,candidate=length(p-previous-v*h)-mix(c.x,c.y,at)*.5;if(candidate<distance){distance=candidate;nearest=at;}previous=next;before=t;}
  lastTangent=cubicTangent(aa,bb,end);
 }
 if(d.x>.5){if(nearest<.000001)distance=max(distance,-dot(p-start,normalize(cubicTangent(a,b,0.)+vec2(.000001,0))));if(nearest>c.w-.000001)distance=max(distance,dot(p-previous,normalize(lastTangent+vec2(.000001,0))));}
 return fill(distance,c.z);
}`;
