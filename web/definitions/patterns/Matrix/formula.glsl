// Seven-segment decimal glyphs with one continuous trail per column.
vec2 grid=u*vec2(max(a.x,1.),max(a.w,1.));
vec2 cell=floor(grid), f=fract(grid);
float speed=a.y*(.5+ref_hash1(vec2(cell.x,3.1))*1.5);
float head=fract(ref_hash1(vec2(cell.x,7.7))-time*speed*.35);
float behind=fract((cell.y+.5)/max(a.w,1.)-head);
float trailLength=clamp(a.z*.45,.045,.9);
float trail=pow(clamp(1.-behind/trailLength,0.,1.),.65);
int digit=int(floor(ref_hash1(cell+floor(time*speed*3.))*10.));
int bits= digit==0?63:digit==1?6:digit==2?91:digit==3?79:digit==4?102:digit==5?109:digit==6?125:digit==7?7:digit==8?127:111;
float dist=10.;
for(int i=0;i<7;i++){
 if((bits & (1<<i))==0)continue;
 vec2 center=vec2(.5,.5), halfSize=vec2(.19,.05);
 if(i==0)center.y=.82;
 if(i==3)center.y=.18;
 if(i==1||i==2||i==4||i==5){
  center=vec2((i==1||i==2)?.72:.28,(i==1||i==5)?.66:.34);
  halfSize=vec2(.05,.125);
 }
 vec2 box=abs(f-center)-halfSize;
 dist=min(dist,max(box.x,box.y));
}
float aa=max(fwidth(dist)*.5,.004);
return (1.-smoothstep(-aa,aa,dist))*trail;
