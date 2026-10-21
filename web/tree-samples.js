import {node,project,cloneNode} from './tree-model.js';
import {vfxPresets} from './vfx-presets.js';
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
 const tile=(name,content,count,offset=0)=>{const n=group(name);n.children=[content];n.boundary='repeat';n.arrange[0]=1;n.arrange[1]=n.arrange[2]=count;n.arrange[13]=n.arrange[14]=offset;return n;};
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
function overflowExamples(){
 const compare=group('内容边界对照');
 for(const [i,mode]of ['clip','visible'].entries()){
  const g=group(i?'右侧：允许超出':'左侧：裁切内容');g.boundary=mode;Object.assign(g.transform,{x:i?.73:.25,width:.3,height:.3});
  const disk=shape('Circle','边缘圆点',.72,'#f7c568');disk.params[0]=.95;disk.transform.x=1;disk.transform.y=.65;
  const star=shape('Star','上方星光',.6,'#99e8f8');star.transform.x=.35;star.transform.y=1;star.params[0]=.9;
  const dot=shape('Circle','中心圆点',.2,'#e2f6ff');dot.params[0]=.9;g.children=[disk,star,dot];compare.children.push(g);
  for(const [j,ends]of [[-1,-1,1,-1],[1,-1,1,1],[1,1,-1,1],[-1,1,-1,-1]].entries()){
   const edge=shape('LineSegment',(i?'右':'左')+'侧逻辑区域边线 '+(j+1),.3,'#6a8397');edge.transform.x=i?.73:.25;Object.assign(edge.params,{0:ends[0],1:ends[1],2:ends[2],3:ends[3],4:.012,5:0});compare.children.push(edge);
  }
 }
 const grid=group('跨格光点排列');grid.boundary='visible';grid.transform.width=grid.transform.height=.72;grid.arrange[0]=1;grid.arrange[1]=grid.arrange[2]=3;grid.arrangeFit='stretch';
 const rim=halo(.9,'#467d96'),light=shape('Star','伸到相邻格的星光',.52,'#b6f4ff');light.transform.x=.96;light.params[0]=.9;light.boundary='visible';light.postFx=[0,.65,20,.5,0,0,0];grid.children=[rim,light];
 const seamless=group('无缝光晕接续');seamless.boundary='repeat';seamless.postFx=[0,.5,16,.5,0,0,0];const flare=shape('Star','跨边界星光',.42,'#b9f3ff');flare.transform.x=.94;flare.transform.y=.9;flare.boundary='visible';flare.params[0]=1.25;flare.postFx=[3,.4,20,.5,0,0,0];const spark=shape('Circle','中央光点',.09,'#ffc976');spark.transform.x=.47;spark.params[0]=.9;seamless.children=[flare,spark];
 return [
  {root:seamless,description:'子星光允许超出，外层组合选择无缝重复。右上角的星光及光晕会从左侧和下侧接回；开启平铺检查观察四边接续，切换边界处理比较三种模式。',tags:['无缝重复','子级超框','光晕回绕']},
  {root:compare,description:'相同的内容：左侧裁切到节点区域，右侧允许超出。细方框标出逻辑区域；选左右组合 → 变换/排列 → 内容边界，切换后比较边缘星光与圆点。',tags:['裁切对照','图形／组合通用']},
  {root:grid,description:'每格包含一个圆环和偏到右侧的星光，星光与泛光可跨格显示，三列三行的格距保持不变。切换外层组合的内容边界，比较最右侧星光。',tags:['跨格显示','光晕扩边','固定格距']}
 ].map(sample=>({...sample,category:'arrangement',output:{mode:'color',alpha:false,background:'#182438'}}));
}

function arrangementExamples(){
 const border=group('圆角边框灯带');border.arrange[0]=13;border.arrange[3]=64;border.arrange[4]=.035;border.arrange[19]=1;border.arrangeExtra.width=.86;border.arrangeExtra.height=.62;border.arrangeExtra.corner=.1;
 const dash=shape('LineSegment','沿边框的短线',1,'#8cecff');Object.assign(dash.params,{0:0,1:-.7,2:0,3:.7,4:.14,5:1});border.children=[dash,shape('Circle','灯芯',.18,'#ffffff')];
 const outline=group('星形轮廓光点');outline.arrange[0]=14;outline.arrange[3]=72;outline.arrange[4]=.035;outline.arrangeExtra.showSource=true;
 const source=shape('Star','轮廓来源：星形',.82,'#293c55');source.params[0]=.82;source.params[2]=5;
 const marker=shape('Circle','沿轮廓的光点',1,'#8cecff');marker.params[0]=.65;outline.children=[source,marker];
 const woven=kind=>{const n=group(kind==='herringbone'?'人字镶嵌底纹':'篮式编织底纹');n.arrange[0]=15;n.arrange[1]=n.arrange[2]=2;n.arrangeExtra.weave=kind;n.boundary='repeat';n.instanceContent='cycle-child';n.children=['#42627e','#2d435c'].map((tint,i)=>{const brick=shape('RoundedRect','长砖 '+(i+1),1,tint);brick.params[0]=brick.params[5]=.94;brick.params[4]=.02;return brick;});return n;};
 const herringbone=woven('herringbone'),basket=woven('basket');
 const gradient=group('渐隐装饰点阵');gradient.arrange[0]=1;gradient.arrange[1]=gradient.arrange[2]=8;Object.assign(gradient.arrangeExtra,{gradient:'x',scaleFrom:.15,scaleTo:1.2,opacityFrom:.1,opacityTo:1});
 const dot=shape('Circle','渐变圆点',1,'#84d6ec');dot.params[0]=.5;const ring=shape('Ring','圆点细环',1,'#a4e9f5');ring.params[0]=.74;ring.params[1]=.025;ring.opacity=.3;gradient.children=[ring,dot];
 const flow=group('波浪流场线阵');flow.arrange[0]=1;flow.arrange[1]=8;flow.arrange[2]=4;Object.assign(flow.arrangeExtra,{flow:'wave',flowAmount:.08,flowFrequency:1,flowPhase:0,flowTurn:true});
 const line=shape('LineSegment','流动短线',1,'#63b8dd');Object.assign(line.params,{0:-.7,1:0,2:.7,3:0,4:.035,5:1});const tip=shape('Circle','流向标记',.12,'#d1f6ff');tip.transform.x=.84;flow.children=[line,tip];track(flow,'arrangeExtra.flowPhase',[[0,0],[1,360]]);
 const pipes=group('接口匹配管线');pipes.arrange[0]=16;pipes.arrange[1]=pipes.arrange[2]=6;pipes.arrange[11]=17;pipes.boundary='repeat';
 pipes.children=Array.from({length:16},(_,mask)=>{const tile=group(mask?'连接块 '+mask:'空白块');tile.tileEdges=mask;for(const [bit,x,y]of [[1,1,0],[2,0,1],[4,-1,0],[8,0,-1]])if(mask&bit){const segment=shape('LineSegment','接口线',1,'#72c9df');Object.assign(segment.params,{0:0,1:0,2:x,3:y,4:.055,5:1});tile.children.push(segment);}return tile;});
 const puzzle=shape('PuzzlePiece','单块拼图网格',.76,'#8cecff');puzzle.arrange[0]=1;puzzle.arrange[1]=puzzle.arrange[2]=4;puzzle.arrangeFit='stretch';puzzle.params[4]=.18;puzzle.params[6]=.009;
 const board=group('彩色拼图板');board.transform.width=board.transform.height=.8;
 for(let y=0;y<3;y++)for(let x=0;x<3;x++){const piece=shape('PuzzlePiece','拼图 '+(y*3+x+1),1/3,['#59bfd2','#ffbc66','#ad8cda','#8ac17a','#ee8f91','#78a5df','#d7ba75','#7dcdb5','#bc93c4'][y*3+x]);Object.assign(piece.transform,{x:(x+.5)/3,y:(y+.5)/3});Object.assign(piece.params,{0:y===2?0:1,1:x===2?0:1,2:y===0?0:-1,3:x===0?0:-1,4:.15,8:1});board.children.push(piece);}
 const puzzleStyles=group('拼图接口与圆角');
 puzzleStyles.children=['圆头凸耳','方头卡扣','梯形燕尾','波浪接口'].map((name,i)=>{const n=shape('PuzzlePiece',name,.32,['#76d9eb','#ffc778','#c0a1e8','#8fd1a5'][i]);Object.assign(n.transform,{x:i%2?.75:.25,y:i<2?.75:.25});Object.assign(n.params,{8:1,9:i,10:[1,.2,.45,.7][i],11:0,12:.18,13:.28,14:.08});return n;});
 return [
  {root:puzzleStyles,description:'左上圆头、右上方头、左下燕尾、右下波浪；每块的左上角为直角，其他三角使用不同圆角大小。选单块切换接口样式、圆润度，再展开主体四角逐个调整。',tags:['四种接口','独立四角','可调圆润度']},
  {root:puzzle,description:'只有一个拼图图形，使用现成的4×4网格排列。主体占满每格，凸耳伸入相邻格；增大凸耳半径不会改变格距。',tags:['单块拼图','凸耳越界','网格排列']},
  {root:board,description:'九块独立配色的实心拼图，相邻边凹凸配对，最外侧设为平边。可分别编辑每块颜色、四边和凸耳大小。',tags:['拼图边块／角块','独立配色']},
  {root:border,description:'沿圆角矩形周长等距放置灯点，短线跟随切线转向。调整边框宽高、圆角和数量，适合弹窗与卡牌装饰。',tags:['边框排列','UI 装饰']},
  {root:outline,description:'第一个子节点提供星形轮廓，第二个子节点作为重复光点。可换成其他图形、组合或有透明轮廓的图片。',tags:['沿图形轮廓','自动等距']},
  {root:herringbone,description:'2:1 长砖按人字规则交替转向，深浅两种图块顺序混排。调整重复块数和长砖外观制作可平铺背景。',tags:['人字排列','无缝平铺']},
  {root:basket,description:'长砖横竖交替组成篮式编织。与人字纹共用编排入口，可修改颜色和单元留缝。',tags:['编织排列','无缝平铺']},
  {root:gradient,description:'同一网格从左到右逐渐变大、变亮；渐变可叠加到现有排列，也可改成径向或按实例顺序变化。',tags:['渐变排列','UI 底纹']},
  {root:flow,description:'规则网格沿波浪偏移并跟随局部方向转向。播放相位动画查看流动；也可切换旋涡扭转。',tags:['波浪／流场','循环动画'],output:{seconds:3,frames:90,loopExport:true}},
  {root:pipes,description:'候选图块声明上、下、左、右接口，种子控制选择，相邻及跨边缘接口保持匹配。可拆解每块连接线或替换图块。',tags:['规则拼接','接口匹配']},
 ].map(sample=>({...sample,category:'arrangement',output:{mode:'color',alpha:false,background:'#182438',...sample.output}}));
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
 return [...vfxSamples().map(s=>({...s,category:'vfx'})),...uiSamples().map(s=>({...s,category:'ui'})),...arrangementExamples(),...overflowExamples(),...vfxPresets(),
  {root:summon,description:'同心脉冲圆环、旋转星阵与逐渐淡出的冲击波。',tags:['嵌套组合','关键帧']},
  {root:radar,description:'三层同心环搭配绕中心运动的目标点，可拆解环形排列与旋转。',tags:['环形排列','旋转动画']},
  {root:flower,description:'椭圆花瓣沿圆周朝外排列，叠加花蕊和外框制作徽章。',tags:['环形朝向','分层配色']},
  {root:galaxy,description:'两种星尘交替铺成黄金角螺旋，整组缓慢旋转。',tags:['黄金角螺旋','子节点混排']},
  {root:shield,description:'描边六边形铺成错列晶格，用圆形遮罩裁切在外围光环内。',tags:['六角网格','圆形遮罩','轮廓描边']},
  {root:flame,description:'动态火焰生成器与几何圆环、旋转火星组合成完整特效。',tags:['生成器合成','旋转动画']},
 ].map(sample=>({...sample,name:sample.root.name,category:sample.category??'composition'}));
}
