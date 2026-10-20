# 外置图形逐项复核

本次逐项读取 115 个改造前主体及其参数定义，校验指纹与初审基线一致，并对照现有保留图形的构造。按用户决定已全部恢复原实现，当前内置 284 项。公式及公共库未改写。

## 结果

| 类型 | 数量 | 建议 |
| --- | ---: | --- |
| 常规数学映射 | 4 | 已按原实现恢复内置 |
| 常规程序构造 | 85 | 已按原实现恢复内置 |
| 复合表现配方 | 26 | 已按原实现恢复内置 |

全部 115 项均已按原实现恢复内置。原先整组外置以及再按复合配方排除的理由均不充分，相关收录建议已撤回。此表不作为授权白名单或侵权名单。

## 分类的用途

下表的构造分类仅用于描述实现。常规构造和复合配方之间没有足以支持此前排除决定的一致标准；旧的外置建议已撤回，不再据此调整目录，也不为制造差异改写公式。

## 来源证据的实际限度

115 项在参考目录都有同名 ID；其中 68 项去除已说明的包装、注释和前缀后，主体 token 相同。其余差异也不能证明独立创作。本次没有新增任何已核实的源码再分发许可，115 项该字段均为 false。

《计算机软件保护条例》第六条区分数学概念、方法与软件表达；第二十九条涉及表达方式有限导致的相似。不能从“属于常规构造”直接跳到“当前复制代码已经获准再分发”，具体适用仍需结合来源和事实判断。[国家行政法规库原文](https://xzfg.moj.gov.cn/front/law/detail?LawID=913)

因此，本表可用于决定产品先恢复哪些能力，不能证明一个含当前公共库和全部主体的公开仓库已经完成授权核查。当前全部 284 项均不应被称为已经取得全部授权的白名单。

## 名称与功能说明

- 分裂光环是单通道多环，并非 RGB 色散；景深散焦是散景纹样，并非读取场景深度执行镜头模糊。
- 数据矩阵码不做数据编码或纠错；列错位故障不执行像素排序；数据错流不操作视频编码数据。
- 音频频谱条不采集音频；电路走线不生成可验证电路；凯尔特结不保证拓扑正确。
- 这些是现有实现的功能说明，不据此改变图形表现，也不以名称是否准确代替来源审查。

## 逐项表

“可比图形”含当前内置图形和同批复核对象，用来追踪同类构造；机器清单保留公共函数依赖、来源比对与原始指纹。[JSON 清单](external-pattern-recheck.json)

| 分类 | 图形 / ID | 构造类型 | 建议 | 具体依据 | 可比图形 |
| --- | --- | --- | --- | --- | --- |
| 径向 | 镜头光斑 / LensFlare | 常规程序构造 | 已按原实现恢复内置 | 圆盘与正交条带叠加，与圆形、十字和光晕属于同类遮罩构造；0.9 权重与边缘常量仍是具体实现选择 | Circle、Cross、Halo |
| 径向 | 拉丝光条 / LightStreak | 常规程序构造 | 已按原实现恢复内置 | 椭圆半径衰减与单轴指数光带取大值，属于广义高斯和椭圆遮罩组合 | Ellipse、Bell、Swipe |
| 径向 | 星芒爆发 / NovaBurst | 常规程序构造 | 已按原实现恢复内置 | 角向周期函数控制径向长度，再加中心高斯光；不应仅因有中心光将其与星形、放射线分开处理 | Star、Sunburst、Halo |
| 径向 | 扰动环纹 / RadialStreak | 常规程序构造 | 已按原实现恢复内置 | FBM 扰动径向周期相位并乘圆形窗口，与径向波和等高线同类 | RadialWave、ContourLines |
| 径向 | 散景光斑 / Bokeh | 复合表现配方 | 已按原实现恢复内置 | 随机圆盘尺寸、分布、边缘亮圈和亮度组成散景配方，包含特定抽样偏移和固定比例 | LensBlur |
| 径向 | 横向耀斑 / AnamorphicFlare | 常规程序构造 | 已按原实现恢复内置 | 水平、垂直指数衰减与高斯核心；保留功能的理由与光晕、光条一致 | Halo、Swipe |
| 径向 | 体积光柱 / GodRay | 复合表现配方 | 已按原实现恢复内置 | 固定光源锚点、扇区光束、距离淡出及噪声遮断构成完整光柱配方；不是体积散射求解器 | Sunburst |
| 径向 | 景深散焦 / LensBlur | 复合表现配方 | 已按原实现恢复内置 | 随机多边形光斑按位置模拟离焦，叠加固定亮边；不执行场景深度或真实镜头模糊 | Bokeh |
| 径向 | 分裂光环 / ChromaticEdge | 常规程序构造 | 已按原实现恢复内置 | 同心环加正负径向偏移与权重，是参数化多环遮罩；实际输出单通道，不是 RGB 色散 | Ring、Concentric |
| 形状 | 云朵形 / CloudShape | 常规程序构造 | 已按原实现恢复内置 | 多个圆的平滑并集；圆数、偏移和比例虽有选择，仍与 Metaballs、Splatter 的构造同类 | Metaballs、Splatter |
| 形状 | 溅射形 / Splat | 常规程序构造 | 已按原实现恢复内置 | 中心圆与随机径向胶囊的并集，属于线段距离与圆盘的参数化构造 | Circle、LineSegment、Splatter |
| 形状 | 手绘抖动形 / HandDrawn | 常规程序构造 | 已按原实现恢复内置 | 圆方距离插值并加噪声扰动，和 Blob、SDFShapeMask 的原理一致 | Blob、SDFShapeMask |
| 形状 | 碎片 / FragmentChip | 常规程序构造 | 已按原实现恢复内置 | 多边形距离加 FBM 切口，是受扰动的几何遮罩 | Polygon、Blob |
| 形状 | 尖刺爆发 / SpikeBurst | 常规程序构造 | 已按原实现恢复内置 | 随机径向线段描边取并集并补中心圆，与放射刻度、线段距离同类 | LineSegment、CompassTick |
| 形状 | 花瓣花窗 / Flower | 常规程序构造 | 已按原实现恢复内置 | 角向余弦幂控制花瓣半径并叠加描边与中心圆；属于参数化玫瑰线类轮廓，原先不应只因组合而外置 | Star、Thorn |
| 形状 | 星光闪烁 / GlintSpark | 复合表现配方 | 已按原实现恢复内置 | 主副星芒、核心和固定闪烁相位共同组成效果；含多套半径、幂次和混合比例 | Sunburst、Halo |
| 图案 | 拼图纹理 / PuzzlePiece | 常规程序构造 | 已按原实现恢复内置 | 方形与四个凸凹圆的布尔/平滑运算并重复；常规几何拼图构造，具体比例仍需如实记录 | RoundedRect、Grid |
| 图案 | 针织 / Knit | 常规程序构造 | 已按原实现恢复内置 | 两条线段组成 V 形后错列重复，固定三个点不等于已有独立插画资产 | LineSegment、Herringbone |
| 图案 | 伊斯兰几何 / IslamicPattern | 常规程序构造 | 已按原实现恢复内置 | 旋转方框和菱形框的周期叠加，是几何装饰构造；名称不作为风格作品授权结论 | Grid、DiamondGrid、WovenMesh |
| 图案 | 凯尔特结 / CelticKnot | 常规程序构造 | 已按原实现恢复内置 | 随机翻转双圆弧和遮挡，和 Truchet 同类；不能承诺生成拓扑正确的凯尔特结 | Truchet、Weave |
| 图案 | 电路走线 / Circuit | 常规程序构造 | 已按原实现恢复内置 | 格点随机选择横竖线与方节点，和 Maze、RandomBlocks 同类；不生成实际电路连接 | Maze、RandomBlocks |
| 图案 | 指纹 / Fingerprint | 常规程序构造 | 已按原实现恢复内置 | 扰动的径向周期条带乘圆窗；是指纹状纹理，不是采集的个人指纹图 | RadialWave、ContourLines |
| 图案 | 放射光芒 / SunburstRays | 常规程序构造 | 已按原实现恢复内置 | 单双角频调制后乘径向淡出并补核心；与已保留的 Sunburst 同类 | Sunburst |
| 图案 | 网格拼砖 / GridMosaic | 常规程序构造 | 已按原实现恢复内置 | 坐标扭曲后取细胞缝及格点明度，与 PavingStone、CrackedMud 同类 | PavingStone、CrackedMud |
| 图案 | 彩窗铅条 / StainedGlass | 常规程序构造 | 已按原实现恢复内置 | 细胞边界窗与噪声表面相乘；与 VoronoiEdges、Gravel 同类，没有外部彩窗图片 | VoronoiEdges、Gravel |
| 图案 | 迷彩 / Camo | 常规程序构造 | 已按原实现恢复内置 | 噪声域扭曲、阈值映射与灰度量化，是程序纹理构造，不含具体军用迷彩图像 | DomainWarp、GradientRamp |
| 图案 | 水磨石 / Terrazzo | 常规程序构造 | 已按原实现恢复内置 | 邻格随机放置多边形碎粒并描边，与 Speckle、Splatter 同类 | Speckle、Splatter、Polygon |
| 图案 | 苏格兰格纹 / Plaid | 常规程序构造 | 已按原实现恢复内置 | 横竖多组周期条纹及交叉权重，和 Weave、BasketWeave 同类；未据此判定任何特定格纹商标或版权 | Weave、BasketWeave |
| 渐变 | 形状渐变 / ShapeGradient | 常规数学映射 | 已按原实现恢复内置 | 按圆、方、多边形及星状半径求距离，再归一化并做幂映射；此前整项外置依据不足，星状分支的具体幂和限幅仍是代码选择 | SDFShapeMask、GradientRamp |
| 渐变 | 多向线性 / MultiLinear | 常规数学映射 | 已按原实现恢复内置 | 对等分旋转方向的线性渐变取最小、最大或平均，属于线性映射和聚合 | LinearGradient |
| 渐变 | 角向渐变 / ConeGradient | 常规数学映射 | 已按原实现恢复内置 | atan 极角归一化、角偏移、方向反转及径向相位偏移，是常规极坐标映射 | Spiral、PolarFlow |
| 渐变 | 径向阶梯 / RadialSteps | 常规数学映射 | 已按原实现恢复内置 | 半径归一化后量化级数并在级间做 smoothstep，属于分段映射 | RadialGradient、GradientRamp |
| 自然材质 | 云 / Clouds | 复合表现配方 | 已按原实现恢复内置 | 移动域扭曲和 Billow 乘固定上下高度窗，再做对比度整形；需确认这一整套云层配方的采用范围 | Billow、DomainWarp |
| 自然材质 | 烟 / Smoke | 复合表现配方 | 已按原实现恢复内置 | 定向移动 FBM、域扭曲、圆窗和上升淡出组成烟雾配方；不代表这种通用思路本身受限制 | Anisotropic、DomainWarp |
| 自然材质 | 火焰 / Fire | 复合表现配方 | 已按原实现恢复内置 | 移动扭曲噪声配合高度相关幂次和强度，形成特定火焰分布；继续记录源码来源待确认 | DomainWarp、GradientRamp |
| 自然材质 | 锈蚀 / Rust | 常规程序构造 | 已按原实现恢复内置 | 两频噪声加权、阈值和亮度调制；与现有多尺度噪声材质同类 | FBM、GrainNoise |
| 自然材质 | 污渍 / DirtGrunge | 常规程序构造 | 已按原实现恢复内置 | 两频 FBM 混合再做对比度与阈值映射，不能仅因固定权重整项外置 | FBM、GradientRamp |
| 自然材质 | 水渍 / Splotch | 常规程序构造 | 已按原实现恢复内置 | 格点随机圆的轮廓受噪声扰动，再按概率筛选；和 Blob、Speckle 同类 | Blob、Speckle |
| 自然材质 | 苔藓 / Moss | 常规程序构造 | 已按原实现恢复内置 | 细胞团块乘低频噪声阈值遮罩，与 CellularNoise、ErosionMask 同类 | CellularNoise、ErosionMask |
| 自然材质 | 岩石 / Stone | 常规程序构造 | 已按原实现恢复内置 | 脊线和 FBM 混合后做灰度变换，与 Ridged、HammeredMetal 同类 | Ridged、HammeredMetal |
| 自然材质 | 沙粒 / Sand | 常规程序构造 | 已按原实现恢复内置 | 低频域扭曲噪声和高频哈希颗粒混合，与 GrainNoise、PowderNoise 同类 | GrainNoise、PowderNoise |
| 自然材质 | 雪冰 / SnowIce | 常规程序构造 | 已按原实现恢复内置 | 雪模式是 Simplex 倍频与对比度；冰模式是随机旋转单元条带，属于噪声/瓷砖构造 | Simplex、Crystal |
| 自然材质 | 毛皮草 / FurGrass | 常规程序构造 | 已按原实现恢复内置 | 旋转、非等比缩放的 FBM 乘纵向权重，与 Anisotropic、Directional 同类 | Anisotropic、Directional |
| 自然材质 | 皮革 / Leather | 常规程序构造 | 已按原实现恢复内置 | 细胞距离和高频噪声混合，与 CellularNoise、Gravel 同类 | CellularNoise、Gravel |
| 自然材质 | 纸张 / Paper | 常规程序构造 | 已按原实现恢复内置 | 拉伸 FBM 纤维与低频起伏相加，与 FiberPaper、Fibers 同类 | FiberPaper、Fibers |
| 自然材质 | 甲壳纹 / ScaleKeratin | 常规程序构造 | 已按原实现恢复内置 | 错行半圆鳞片加描边和径向明度，与 Scales 同类 | Scales |
| 自然材质 | 树皮 / Bark | 常规程序构造 | 已按原实现恢复内置 | 原始及扭曲脊线噪声混合后做幂映射，与 Ridged、DomainWarp 同类 | Ridged、DomainWarp |
| 自然材质 | 锈斑铁器 / RustPatch | 常规程序构造 | 已按原实现恢复内置 | 噪声阈值凹坑与颗粒调制底色，是多尺度材质映射 | HammeredMetal、ErosionMask |
| 自然材质 | 剥落漆面 / WeatheredPaint | 常规程序构造 | 已按原实现恢复内置 | 扭曲 FBM 的阈值面与高频颗粒相加，与 DissolveNoise、GrainNoise 同类 | DissolveNoise、GrainNoise |
| 自然材质 | 沉积层理 / Sediment | 常规程序构造 | 已按原实现恢复内置 | 噪声位移水平分层后逐层哈希明度并加颗粒，与 DuneRipple、GrainNoise 同类 | DuneRipple、GrainNoise |
| 自然材质 | 蛇皮鳞纹 / SnakeSkin | 常规程序构造 | 已按原实现恢复内置 | 错行菱形距离窗乘逐格随机明度，与 DiamondGrid、Scales 同类 | DiamondGrid、Scales |
| 自然材质 | 卵石地 / PebbleField | 常规程序构造 | 已按原实现恢复内置 | 细胞距离窗口乘径向距离明度，与 Gravel、CellularNoise 同类 | Gravel、CellularNoise |
| 自然材质 | 焦炭 / CharredCoal | 常规程序构造 | 已按原实现恢复内置 | 噪声等值线裂缝和湍流底色叠加，与 ContourLines、Turbulence 同类 | ContourLines、Turbulence |
| 自然材质 | 灰烬沉积 / AshDeposit | 复合表现配方 | 已按原实现恢复内置 | 移动场、正弦积灰层和独立刷新颗粒组成效果，时间颗粒刷新不跟随同一速度参数 | GrainNoise、DuneRipple |
| 自然材质 | 雪花晶体 / Snowflake | 常规程序构造 | 已按原实现恢复内置 | 等角主臂、对称线段分枝与中心环，属于参数化径向分枝构造；与已保留的 FrostFern 应一致处理 | FrostFern、LineSegment |
| 自然材质 | 镜头污渍 / LensDirt | 复合表现配方 | 已按原实现恢复内置 | 噪声底污渍、分组划痕、灰尘点和径向遮罩的整套配方 | Scratch、Speckle |
| 自然材质 | 雨滴玻璃 / RainGlass | 复合表现配方 | 已按原实现恢复内置 | 随机下降水滴的内亮度、亮边和尾迹使用一组固定运动及混合关系 | Speckle、RibbonFade |
| 自然材质 | 盐渍结晶 / SaltFlat | 常规程序构造 | 已按原实现恢复内置 | 细胞距离差裂缝与最近距离颗粒的混合，与 VoronoiEdges、CellularNoise 同类 | VoronoiEdges、CellularNoise |
| 自然材质 | 羽绒纹理 / Feather | 常规程序构造 | 已按原实现恢复内置 | 主轴加沿纵向变化的双侧线段分枝，和 FrostFern 的参数化构造同类 | FrostFern、LineSegment |
| 自然材质 | 沥青颗粒 / Asphalt | 常规程序构造 | 已按原实现恢复内置 | 邻格随机圆粒、亮度和噪声底层，与 Speckle、Gravel 同类 | Speckle、Gravel |
| 自然材质 | 洞石纹理 / Travertine | 常规程序构造 | 已按原实现恢复内置 | 扰动沉积条纹减随机椭圆孔洞，与 DuneRipple、Perforated 同类 | DuneRipple、Perforated |
| 数字 | 故障条纹 / Glitch | 常规程序构造 | 已按原实现恢复内置 | 按行哈希位移和时间分箱产生块门控，和随机块、像素溶解同类；并非对输入视频做故障处理 | RandomBlocks、PixelDissolve |
| 数字 | 数字雨 / Matrix | 常规程序构造 | 已按原实现恢复内置 | 标准七段数字的矩形段编码与逐列移动尾迹；属于显示构造，无字体文件或电影图像；特定尾迹参数仍是代码选择 | LedBar |
| 数字 | 全息扫描 / Hologram | 常规程序构造 | 已按原实现恢复内置 | 正弦扫描线、高斯移动扫描带与逐行噪声相加，和 Scanlines、Halo 同类 | Scanlines、Halo |
| 数字 | HUD框线 / HudFrame | 复合表现配方 | 已按原实现恢复内置 | 方框、边缘刻度和多级亮度构成特定仪表布局；参数名的角段效果不能仅凭名称推定正确 | Grid、CompassTick |
| 数字 | 数据流 / DataStream | 常规程序构造 | 已按原实现恢复内置 | 逐行随机速度、周期线段与行门控，与 ConveyorArrows、RandomBlocks 同类 | ConveyorArrows、RandomBlocks |
| 数字 | 二进制噪块 / BinaryNoise | 常规程序构造 | 已按原实现恢复内置 | 格点随机选择圆环或竖条并按时间刷新，是基本形状的概率选择 | RandomBlocks、Ring |
| 数字 | 同心仪表 / ConcentricUI | 复合表现配方 | 已按原实现恢复内置 | 多圈固定起始半径/间隔、分段缺口和逐圈速度构成仪表配方 | Concentric、CompassTick |
| 数字 | LED点阵 / DiodeGrid | 常规程序构造 | 已按原实现恢复内置 | 周期圆点、逐格随机点亮和行扫描调制，与 Dots、LedBar 同类 | Dots、LedBar |
| 数字 | 百叶格栅 / SlotVent | 常规程序构造 | 已按原实现恢复内置 | 周期圆角槽、纵向明度及方框描边，与 RoundedRect、Grid 同类 | RoundedRect、Grid |
| 数字 | 数据矩阵码 / DataCode | 常规程序构造 | 已按原实现恢复内置 | 随机模块加角落环标，是装饰矩阵纹样；不含数据编码或纠错，不是可扫码的二维码 | QrBlocks、RandomBlocks |
| 数字 | 数据错流 / Datamosh | 常规程序构造 | 已按原实现恢复内置 | 按行哈希门控和周期条段，属于程序故障纹样；不实现真实视频编码数据错流 | RandomBlocks、PixelDissolve |
| 数字 | 雷达扫描 / RadarSweep | 复合表现配方 | 已按原实现恢复内置 | 角向扫光、同心环与时间刷新的点组合成完整雷达仪表配方 | ConeGradient、Concentric |
| 数字 | 光栅扫描 / RasterScan | 常规程序构造 | 已按原实现恢复内置 | 周期扫描线乘移动扫描带及噪声，和 Scanlines 的常规调制同类 | Scanlines |
| 数字 | 音频频谱条 / WaveformBar | 常规程序构造 | 已按原实现恢复内置 | 正弦与噪声控制逐柱高度，并用矩形窗裁切；不采样音频信号 | LedBar |
| 数字 | 列错位故障 / PixelSort | 常规程序构造 | 已按原实现恢复内置 | 逐列随机位移、格点明度和二值化混合；不是对图像像素执行排序 | PixelDissolve、RandomBlocks |
| 数字 | 六角数据格 / HexData | 复合表现配方 | 已按原实现恢复内置 | 六边框、随机中心点层及亮度组成特定数据格布局 | HexGrid |
| 能量 | 闪电分叉 / LightningBranch | 常规程序构造 | 已按原实现恢复内置 | 主干噪声曲线和按主干采样产生的随机分枝，属于同类曲线图元扩展；与 Lightning 应一致考虑 | Lightning |
| 能量 | 电弧 / Arc | 常规程序构造 | 已按原实现恢复内置 | 抛物线中心线受噪声扰动，再按时间哈希断裂，与 Lightning、Slash 同类 | Lightning、Slash |
| 能量 | 电场放射 / ElectricField | 常规程序构造 | 已按原实现恢复内置 | 极角分箱后施加噪声偏转和随机长度，是径向线段的程序构造 | Lightning、CompassTick |
| 能量 | 能量束 / EnergyBeam | 常规程序构造 | 已按原实现恢复内置 | 单轴核心、Gaussian 和外带取大值，与 Halo、LightSaber 的构造同类 | Halo、Swipe |
| 能量 | 速度线 / SpeedLines | 常规程序构造 | 已按原实现恢复内置 | 逐行随机起点、长度及移动的线段窗口，与 ConveyorArrows 同类 | ConveyorArrows |
| 能量 | 冲击裂纹 / ImpactCrack | 常规程序构造 | 已按原实现恢复内置 | 极角分箱、噪声偏移和逐向长度产生裂纹，与 Lightning、ContourLines 同类 | Lightning、ContourLines |
| 能量 | 冲击波面 / ShockwaveFlat | 常规程序构造 | 已按原实现恢复内置 | 噪声位移的一维 Gaussian 加单侧尾部和端部窗，与 ShockwaveRing、Swipe 同类 | ShockwaveRing、Swipe |
| 能量 | 爆炸尖刺 / ExplosionSpikes | 常规程序构造 | 已按原实现恢复内置 | 随机径向胶囊并集与中心圆，与 SpikeBurst、Splat 同类；重复性应在产品收录时单独评估 | SpikeBurst、Splat |
| 能量 | 烟团 / SmokePuff | 常规程序构造 | 已按原实现恢复内置 | 噪声扰动圆轮廓乘密度场，与 Blob、FBM 同类 | Blob、FBM |
| 能量 | 火焰轮廓 / FlameShape | 复合表现配方 | 已按原实现恢复内置 | 高度收尖指数、移动二维噪声撕裂和顶端淡出形成特定火焰轮廓配方 | Blob、RibbonTaper |
| 能量 | 等离子球 / PlasmaBall | 复合表现配方 | 已按原实现恢复内置 | 圆内噪声电弧、径向权重、底色和中心光组成球状特效配方 | ElectricField、Halo |
| 能量 | 传送门 / Portal | 复合表现配方 | 已按原实现恢复内置 | 角向内旋、移动噪声内填充与边环组成传送门配方 | VortexGate、Ring |
| 能量 | 萤火 / Fireflies | 常规程序构造 | 已按原实现恢复内置 | 邻格随机圆点的距离并集乘时间闪烁，与 BlueNoise、Speckle 同类；未模拟生物运动 | BlueNoise、Speckle |
| 能量 | 星场 / Starfield | 常规程序构造 | 已按原实现恢复内置 | 分层稀疏随机点与闪烁，是同一采样规则的多尺度重复；与 Speckle/GrainNoise 一致考虑 | Speckle、GrainNoise |
| 能量 | 枪口闪光 / MuzzleFlash | 常规程序构造 | 已按原实现恢复内置 | 角向周期尖芒、中心圆和高斯光晕，是参数化星形与基本渐变叠加；未模拟火药燃烧 | Star、Halo |
| 能量 | 蓄能 / ChargeGather | 复合表现配方 | 已按原实现恢复内置 | 极角/半径单纯形采样与独立核心、光晕、径向权重组成蓄能配方 | Simplex、Halo |
| 能量 | 离子风暴 / IonStorm | 复合表现配方 | 已按原实现恢复内置 | 双向不同速度域扭曲、脊线和时间闪烁组成效果，具体时序关系未有分发依据 | DomainWarp、Ridged |
| 能量 | 间歇喷发 / GeyserBurst | 复合表现配方 | 已按原实现恢复内置 | 周期喷柱和五个随机粒子的不同运动关系构成喷发配方 | Speckle、GradientRamp |
| 能量 | 极光帷幕 / AuroraVeil | 复合表现配方 | 已按原实现恢复内置 | 两层不同尺度 Simplex 驱动帷幕相位，再做幂次与亮度调制；原理通用，但当前整套配方仍未确认 | Simplex、Plasma |
| 能量 | 光环脉冲 / AuraPulse | 常规程序构造 | 已按原实现恢复内置 | 移动径向重复环乘圆形淡出并补中心圆，与 RingPulse 同类 | RingPulse |
| 能量 | 能量护盾 / ShieldHex | 复合表现配方 | 已按原实现恢复内置 | 六边格轮廓、面亮度、径向脉冲和圆窗构成护盾配方 | HexGrid、RingPulse |
| 能量 | 烟火爆发 / PyroBurst | 复合表现配方 | 已按原实现恢复内置 | 随生命周期扩散的随机烟火头、尾和中心核具有特定时序/混合配方 | Speckle、Sunburst |
| 能量 | 特斯拉线圈 / TeslaCoil | 常规程序构造 | 已按原实现恢复内置 | 逐步随机游走形成折线，再用线段距离描边，是随机路径构造；没有额外线圈模型或物理求解 | LineSegment、Lightning |
| 能量 | 离子球 / IonOrb | 复合表现配方 | 已按原实现恢复内置 | 外环、双层中心核和摆动径向短线组成完整离子球配方 | Ring、CompassTick |
| 能量 | 奇点 / Singularity | 复合表现配方 | 已按原实现恢复内置 | 扁平吸积环、角向运动、暗核和边环组成特定空间表现；不是物理黑洞渲染 | Ring、Spiral |
| 拖尾 | 双层拖尾 / RibbonCore | 常规程序构造 | 已按原实现恢复内置 | 横向核心和外带乘纵向保持段/幂衰减，与 RibbonFade、RibbonTaper 同类 | RibbonFade、RibbonTaper |
| 拖尾 | 能量流线 / RibbonStreak | 常规程序构造 | 已按原实现恢复内置 | 周期纵线乘移动正弦与纵向幂衰减，与 Scanlines、RibbonFade 同类 | Scanlines、RibbonFade |
| 拖尾 | 等离子丝 / RibbonFilament | 常规程序构造 | 已按原实现恢复内置 | 随机多股噪声摆动线的距离并集乘纵向淡出，与 Lightning、RibbonFade 同类 | Lightning、RibbonFade |
| 拖尾 | 彗星尾 / CometRibbon | 复合表现配方 | 已按原实现恢复内置 | 端部头核、锥形尾、FBM 尘埃和哈希颗粒共同组成彗星配方 | RibbonTaper、Speckle |
| 拖尾 | 光刃 / LightSaber | 常规程序构造 | 已按原实现恢复内置 | 两级横向光带与端部淡出相乘，与 RibbonFade、EnergyBeam 同类 | RibbonFade、Halo |
| 拖尾 | 火焰拖尾 / FlameRibbon | 常规程序构造 | 已按原实现恢复内置 | 沿纵向收尖的窗口乘流动 FBM 与幂次权重，和 RibbonTaper、Directional 同类；名称不等于物理火焰 | RibbonTaper、Directional |
| 拖尾 | 烟雾拖尾 / HazeRibbon | 常规程序构造 | 已按原实现恢复内置 | 纵向扩散坐标下的移动噪声阈值乘横纵羽化，和 Anisotropic、RibbonFade 同类 | Anisotropic、RibbonFade |
| 拖尾 | 火星拖尾 / EmberRibbon | 常规程序构造 | 已按原实现恢复内置 | 移动格点稀疏圆点乘纵向衰减，和 Speckle、RibbonFade 同类 | Speckle、RibbonFade |
| 拖尾 | 爪痕 / ClawRake | 常规程序构造 | 已按原实现恢复内置 | 多条二次弯曲、收尖的距离条带，与 Slash、RibbonTaper 同类；逐股偏移是现有代码选择 | Slash、RibbonTaper |
| 拖尾 | 流动光带 / RibbonWave | 常规程序构造 | 已按原实现恢复内置 | 横向核心/外带乘移动正弦调制和纵向淡出，与 RibbonFade、Waves 同类 | RibbonFade、Waves |
| 拖尾 | 水尾迹 / RibbonWake | 常规程序构造 | 已按原实现恢复内置 | 两条对称斜线的距离窗、余弦波纹和纵向衰减，是参数化 V 形条带 | LineSegment、RibbonFade |
| 拖尾 | 风痕 / WindStreak | 常规程序构造 | 已按原实现恢复内置 | 按列随机起点、有限长度的直线窗乘纵向幂衰减，与 Speckle、RibbonFade 同类 | Speckle、RibbonFade |
| 拖尾 | 火花拖尾 / RibbonSpark | 常规程序构造 | 已按原实现恢复内置 | 格点稀疏圆点、时间门控和纵向衰减，与 Speckle、RibbonFade 同类 | Speckle、RibbonFade |
