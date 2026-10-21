import {node,project,cloneNode} from './tree-model.js';
function buildSamples(){
 const pulse=node('group');pulse.name='脉冲环';const ring=node('shape','Ring');ring.tracks['params.0']={mode:'multiply',ease:'smooth',keys:[[0,.6],[.5,1],[1,.6]]};pulse.children=[ring];
 const seal=node('group');seal.name='多圈法阵';const rings=node('group');rings.name='同心脉冲环组';rings.children=[.45,.7,1].map((size,i)=>{const r=cloneNode(pulse);r.name=['内圈','中圈','外圈'][i];r.transform.width=size;r.transform.height=size;r.timing.offset=i*.12;return r;});seal.children.push(rings);
 const glyph=node('shape','Star');glyph.params[5]=1;glyph.arrange[0]=8;glyph.arrange[33]=1;glyph.arrange[3]=12;glyph.arrange[4]=.12;glyph.arrange[5]=.38;glyph.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,360]]};seal.children.push(glyph);
 const summon=node('group');summon.name='召唤特效';summon.children=[cloneNode(seal)];summon.color.mode='own';summon.color.high='#80dfff';const shock=node('shape','Ring');shock.name='外圈冲击波';shock.timing.start=.2;shock.timing.end=.8;shock.timing.outside='hide';shock.tracks['params.0']={mode:'absolute',ease:'linear',keys:[[0,.05],[1,.95]]};shock.tracks.opacity={mode:'absolute',ease:'linear',keys:[[0,1],[1,0]]};summon.children.push(shock);
 return [pulse,seal,summon].map(root=>({name:root.name,root}));
}
export function sampleProject(index=2){const p=project();p.root.children=[cloneNode(buildSamples()[index].root)];p.name=buildSamples()[index].name;return p;}

const color=(n,high)=>{n.color={mode:'own',fill:'solid',low:high,high};return n;};
const shape=(type,name,size,tint)=>{const n=color(node('shape',type),tint);n.name=name;n.transform.width=n.transform.height=size;return n;};
const group=name=>{const n=node('group');n.name=name;return n;};
const turn=(n,degrees=360)=>{n.tracks['transform.rotation']={mode:'absolute',ease:'linear',keys:[[0,0],[1,degrees]]};return n;};
function halo(size,tint){const n=shape('Ring','轮廓光环',size,tint);n.params[0]=.9;n.params[1]=.012;return n;}
function radial(n,count,radius,size){Object.assign(n.arrange,{0:8,3:count,4:size,5:radius,33:1});return n;}
function track(n,path,keys){n.tracks[path]={mode:'absolute',ease:'linear',keys};return n;}
function softDisc(size,tint){const n=shape('RadialGradient','柔光',size,tint);n.params[0]=1;n.params[1]=1.6;n.invert=true;return n;}
function vfxSamples(){
 const slash=group('刀光拖尾');
 const blade=shape('Slash','蓝色刀光轮廓',.92,'#45baff');blade.params[0]=1.4;blade.params[1]=.065;blade.params[2]=.86;blade.params[3]=.35;
 const streak=cloneNode(blade);streak.name='偏移尾丝';streak.params[1]=.018;streak.transform.y=.55;streak.opacity=.55;
 const core=cloneNode(blade);core.name='白色刀光芯';color(core,'#e5faff');core.params[1]=.018;
 const bladeNoise=shape('ValueNoise','刀光边缘噪声',1,'#ffffff');bladeNoise.params[0]=9;bladeNoise.post[3]=.2;bladeNoise.post[4]=.65;blade.mask=bladeNoise;
 slash.children=[streak,blade,core];track(slash,'transform.rotation',[[0,-25],[.3,0],[1,35]]);track(slash,'opacity',[[0,.75],[.15,1],[.5,.85],[1,0]]);

 const impact=group('命中爆闪'),rays=shape('SpikeBurst','不规则放射火花',.9,'#ffbd65');
 rays.params[0]=13;rays.params[1]=.85;rays.params[2]=.7;rays.params[3]=.024;rays.params[4]=.003;
 track(rays,'transform.width',[[0,.35],[.25,.9],[1,1]]);track(rays,'transform.height',[[0,.35],[.25,.9],[1,1]]);track(rays,'opacity',[[0,1],[.25,1],[1,0]]);
 const flash=shape('NovaBurst','四角白色闪光',.55,'#fff4d8');flash.params[0]=4;flash.params[1]=2.8;flash.params[2]=.9;flash.transform.rotation=22;
 track(flash,'transform.width',[[0,.45],[.12,.65],[1,.02]]);track(flash,'transform.height',[[0,.45],[.12,.65],[1,.02]]);track(flash,'opacity',[[0,1],[.25,1],[.7,0],[1,0]]);
 const glow=softDisc(.62,'#ff833f');glow.opacity=.6;track(glow,'opacity',[[0,.8],[.3,.4],[1,0]]);impact.children=[glow,rays,flash];

 const shock=group('破碎冲击环'),broken=group('噪声裁切的扩散环');
 const wave=shape('RingGradient','柔边冲击波',1,'#ff9d51');wave.params[1]=.009;
 const rim=shape('Ring','冲击波亮边',1,'#ffe7a6');rim.params[1]=.015;
 for(const n of [wave,rim])track(n,'params.0',[[0,.08],[.3,.5],[1,.92]]);
 broken.children=[wave,rim];const breakMask=shape('ValueNoise','环面破碎遮罩',1,'#ffffff');breakMask.params[0]=10;breakMask.params[1]=3;breakMask.post[3]=.38;breakMask.post[4]=.55;broken.mask=breakMask;
 track(broken,'opacity',[[0,1],[.35,1],[1,0]]);const shockGlow=softDisc(.45,'#ffb95b');track(shockGlow,'opacity',[[0,.8],[.3,.15],[.6,0],[1,0]]);shock.children=[shockGlow,broken];

 const vortex=group('能量旋涡'),arms=turn(group('三臂旋转流线'));
 arms.children=[0,120,240].map((rotation,i)=>{const n=shape('VortexSpiral','旋涡流线 '+(i+1),.85,['#42b8ff','#78d9ff','#bceeff'][i]);n.params[0]=3;n.params[1]=.12;n.params[3]=0;n.transform.rotation=rotation;return n;});
 const fade=softDisc(1,'#ffffff');fade.params[0]=.95;arms.mask=fade;
 const hole=shape('Circle','中心留空',.16,'#ffffff');hole.params[0]=.9;hole.blend='inverseMask';
 const eye=shape('RingGradient','涡眼柔光',.25,'#b8f3ff');eye.params[0]=.65;eye.params[1]=.015;vortex.children=[arms,hole,eye];

 const dissolve=group('溶解遮罩'),coarse=shape('ValueNoise','大块溶解噪声',1,'#ffffff'),fine=shape('ValueNoise','细节侵蚀噪声',1,'#ffffff');
 coarse.params[0]=5;coarse.params[1]=4;fine.params[0]=18;fine.params[1]=3;fine.blend='multiply';fine.opacity=.35;dissolve.children=[coarse,fine];
 track(dissolve,'post.3',[[0,-.02],[.3,.3],[1,.95]]);track(dissolve,'post.4',[[0,.02],[.3,.34],[1,1]]);
 return [
  {root:slash,description:'用于挥砍与剑气：刀光芯、噪声边缘和偏移尾丝叠加，旋转后逐渐淡出。透明 PNG 或单次序列。',tags:['刀光／拖尾','单次动画'],output:{seconds:.7,frames:22,loopExport:false}},
  {root:impact,description:'用于技能命中：柔光、四角闪光与不规则火花分层爆开，随后收缩淡出。透明 PNG 或单次序列。',tags:['命中／爆闪','单次动画'],output:{seconds:.6,frames:19,loopExport:false}},
  {root:shock,description:'用于落地与爆炸：噪声裁切圆环，扩张时保留破碎缺口并淡出。透明 PNG 或单次序列。',tags:['冲击波','噪声遮罩'],output:{seconds:1,frames:31,loopExport:false}},
  {root:vortex,description:'用于蓄力与传送：三臂流线围绕透明涡眼旋转，边缘渐隐；整组转一圈可循环导出。',tags:['能量／传送','循环动画'],output:{seconds:3,frames:90,loopExport:true}},
  {root:dissolve,description:'用于材质溶解：粗细噪声合成，通过色阶阈值从白到黑侵蚀。默认导出不透明黑白遮罩，可调整进度取单帧。',tags:['溶解／侵蚀','黑白遮罩'],output:{seconds:1.5,frames:46,loopExport:false,mode:'height',alpha:false}},
 ];
}
function uiSamples(){
 const tile=(name,content,count,offset=0)=>{const n=group(name);n.children=[content];n.seamless=true;n.arrange[0]=1;n.arrange[1]=n.arrange[2]=count;n.arrange[13]=n.arrange[14]=offset;return n;};
 const diamond=(name,tint,radius=.66)=>{const n=shape('Polygon',name,1,tint);n.params[0]=radius;n.params[2]=4;n.params[5]=45;return n;};
 const lattice=group('菱形格纹'),outline=diamond('细线菱形单元','#536881');outline.contour={mode:'outline',radius:.012};
 const bead=diamond('中心小菱形','#647a95',.06);lattice.children=[tile('菱形轮廓网格',outline,4),tile('中心点缀网格',bead,4)];
 const bricks=group('交错菱砖');bricks.children=[tile('第一层菱形砖',diamond('蓝灰菱砖','#34445d',.68),4),tile('错半格的菱形砖',diamond('深色菱砖','#26364c',.68),4,.125)];
 const stripes=group('斜纹底纹'),line=shape('LineSegment','斜向细线',1,'#44536b');Object.assign(line.params,{0:-1,1:-1,2:1,3:1,4:.025,5:0,6:.002});
 const dash=shape('LineSegment','短划点缀',1,'#52627a');Object.assign(dash.params,{0:-.12,1:-.12,2:.12,3:.12,4:.035,5:0,6:.002});
 stripes.children=[tile('连续斜线网格',line,8),tile('交错短划网格',dash,4,.0625)];
 const dots=group('点阵底纹'),dot=shape('Circle','小圆点',1,'#52647d');dot.params[0]=.09;
 const cross=shape('Cross','十字定位点',1,'#6c809d');cross.params[0]=.016;cross.params[1]=.11;
 dots.children=[tile('规则圆点网格',dot,8),tile('稀疏十字网格',cross,4,.0625)];
 return [
  {root:lattice,description:'用于面板、弹窗和卡片背景：细线菱形搭配中心小菱形，规则重复。可改线色、描边宽度与网格密度。'},
  {root:bricks,description:'用于商店、背包或活动界面：两层深浅菱砖错半格排列，形成连续底纹。可分别替换两层颜色。'},
  {root:stripes,description:'用于页签、进度条底板或科技界面：连续斜线与稀疏短划叠加，保持低对比。可修改线宽、密度和点缀。'},
  {root:dots,description:'用于信息面板和科技卡片：细点阵叠加稀疏十字，适合作为文字下方的背景。可调整点径与网格密度。'},
 ].map(sample=>({...sample,tags:['UI 底纹','无缝平铺','静态 PNG'],output:{mode:'color',alpha:false,background:'#1b2638'}}));
}

export function treeSamples(){
 const summon=buildSamples()[2].root;
 const radar=group('雷达光环');radar.children=[.9,.6,.3].map(size=>halo(size,'#62efb4'));
 const targets=turn(group('旋转目标点'));targets.children=[shape('Circle','目标光点',1,'#dcffe9')];radial(targets,3,.33,.065);radar.children.push(targets,shape('Circle','中心信标',.045,'#dcffe9'));
 const flower=group('花瓣徽章'),petals=group('六瓣花'),petal=shape('Circle','椭圆花瓣',1,'#b69aff');petal.transform.width=.55;petals.children=[petal];radial(petals,6,.24,.4);petals.arrange[19]=1;
 flower.children=[halo(.92,'#e7d0ff'),petals,shape('Circle','金色花蕊',.24,'#ffd286'),halo(.3,'#fff1ca')];
 const galaxy=group('星光螺旋'),spiral=turn(group('黄金角星群'),150);spiral.arrange[0]=5;spiral.arrange[3]=64;spiral.arrange[4]=.09;spiral.arrange[5]=.42;spiral.arrange[9]=.55;spiral.arrange[10]=180;spiral.arrange[17]=.08;spiral.instanceContent='cycle-child';
 spiral.children=[shape('Star','紫色星光',1,'#c5a1ff'),shape('Circle','蓝色星尘',.6,'#75dfff')];galaxy.children=[spiral,halo(.22,'#b6b6ff'),shape('Star','中心星',.2,'#fff4dd')];
 const shield=group('蜂巢护盾'),cells=group('六角晶格');cells.arrange[0]=11;cells.arrange[1]=cells.arrange[2]=5;cells.arrange[4]=.2;cells.arrange[5]=.42;
 const hex=shape('Polygon','六边形轮廓',1,'#6ceaff');hex.params[0]=.9;hex.params[2]=6;hex.contour={mode:'outline',radius:.025};cells.children=[hex];
 const shieldMask=shape('Circle','圆形护盾遮罩',.96,'#ffffff');shieldMask.params[0]=.9;shieldMask.params[3]=.001;cells.mask=shieldMask;shield.children=[cells,halo(.96,'#b2f6ff')];
 const flame=group('火焰法阵'),flames=node('shape','Bonfire');flames.name='中心火焰';flames.transform.width=flames.transform.height=.7;
 const fireStars=turn(shape('Star','旋转火星',1,'#ffc175'),-180);radial(fireStars,10,.4,.075);flame.children=[flames,halo(.91,'#ff9c52'),halo(.78,'#ffd385'),fireStars];
 return [...vfxSamples(),...uiSamples(),
  {root:summon,description:'同心脉冲圆环、旋转星阵与逐渐淡出的冲击波。',tags:['嵌套组合','关键帧']},
  {root:radar,description:'三层同心环搭配绕中心运动的目标点，可拆解环形排列与旋转。',tags:['环形排列','旋转动画']},
  {root:flower,description:'椭圆花瓣沿圆周朝外排列，叠加花蕊和外框制作徽章。',tags:['环形朝向','分层配色']},
  {root:galaxy,description:'两种星尘交替铺成黄金角螺旋，整组缓慢旋转。',tags:['黄金角螺旋','子节点混排']},
  {root:shield,description:'描边六边形铺成错列晶格，用圆形遮罩裁切在外围光环内。',tags:['六角网格','圆形遮罩','轮廓描边']},
  {root:flame,description:'动态火焰生成器与几何圆环、旋转火星组合成完整特效。',tags:['生成器合成','旋转动画']},
 ].map(sample=>({...sample,name:sample.root.name}));
}
