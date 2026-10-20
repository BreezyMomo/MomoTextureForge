"""Static inventory plus editorial review. Does not execute reference scripts.

Usage: python tools/audit-builtins.py test-results/reference-site.html
Requires the original 284-entry baseline; do not run against the narrowed
release catalog. Current implementation status lives in builtin-implementation.json.
Review conclusions come from the explicit sets and per-shape notes, never a
similarity score. Outputs are review documents, not a runtime allowlist.
"""
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFS = ROOT / 'web/definitions'
DOCS = ROOT / 'docs'
SOURCE_URL = 'https://easycg-texforge.app.workbuddy.host/'

# Initial local-formula recommendations. All shared libraries are retained by
# the user's project decision, independently of these formula classifications.
KEEP = set('''Circle Ring Polygon Star RoundedRect Gear Ellipse Capsule Squircle
ConeParaboloid Teardrop Leaf BezierRibbon Stripes Checker Dots Grid HexGrid Brick
TriangleGrid DiamondGrid FibonacciDot DottedWave LinearGradient DiamondGradient
SphericalGradient RingGradient FrostFern PositionGradient IrisBlades OgeeFlowerTile'''.split())

# Effects that can be retained via a documented independent implementation or
# a verified licensed primitive. This does not approve the existing code.
REBUILD = set('''RadialGradient Vignette Sunburst Concentric Spiral ShockwaveRing
ArcRing PieSlice RingPulse Halo CompassTick RadialBlurMask RadialWave Cross
Crescent RoundedPolygon Bell Thorn Blob HeartLeafTeardrop BeveledShape
TrapezoidArc Metaballs ArrowHead LineSegment Waves Zigzag Ripple Herringbone
BasketWeave Parquet Scales Chainmail Weave Truchet RoofTiles PavingStone
CrossHatch Halftone WovenMesh Perforated SnakeDots Moire ChainArmor ConveyorArrows
GearTeeth ContourLines Kaleido Sierpinski Seigaiha Maze Guilloche CrackedTiles
Water Caustics Wood Marble Gravel Fibers Scratch Speckle Splatter Tendril
CrackedMud Coral DuneRipple HammeredMetal NaturalWood Scanlines PixelGrid Barcode
PerspectiveGrid RandomBlocks PixelDissolve QrBlocks LedBar Lightning Shatter Slash
Swipe DissolveNoise EnergyRing VortexSpiral ErosionMask RadialErosion DissolveEdge
SDFShapeMask EdgeMask ThicknessMask FresnelMask GradientRamp RibbonFade
RibbonTaper ScimitarRibbon WebSigil VortexGate'''.split())

LABELS = {
    'keep': '建议保留局部实现',
    'rebuild': '保留功能，整理或替换实现',
    'external': '当前版本建议暂外置',
}

def clean(text):
    return re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', text)

def functions_in(text):
    text = clean(text)
    result = defaultdict(list)
    pattern = r'\b(?:float|int|bool|vec[234]|mat[234]|void)\s+(\w+)\s*\([^;{}]*\)\s*\{'
    for match in re.finditer(pattern, text):
        cursor, depth = match.end(), 1
        while cursor < len(text) and depth:
            depth += (text[cursor] == '{') - (text[cursor] == '}')
            cursor += 1
        if depth:
            raise ValueError('Unbalanced function ' + match[1])
        result[match[1]].append(text[match.end():cursor-1])
    return result

def normalized(text):
    text = clean(text)
    text = re.sub(r'\bvec2\s+p\s*=\s*q\s*,\s*uv\s*=\s*u\s*;', '', text)
    text = re.sub(r'\bfloat\s+refP\d\s*=\s*(?:[abcd]|refArgs[01])\.[xyzw]\s*;', '', text)
    text = re.sub(r'\brefP(\d)\b', r'P\1', text)
    text = re.sub(r'\bref_(\w+)\b', r'\1', text)
    text = re.sub(r'\b(?:PI2|TAU)\b', '6.28318530718', text)
    text = re.sub(r'\bPI\b', '3.14159265359', text)
    return re.findall(r'[A-Za-z_]\w*|(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?|[^\s]', text)

def audit(snapshot):
    raw = snapshot.read_bytes()
    reference = raw.decode('utf-8')
    start = reference.index('const TYPES = [')
    end = reference.index('\n];', start)
    ref_types = re.findall(r'\{\s*id\s*:\s*(\d+)\s*,\s*name\s*:\s*"([^"]+)"\s*,\s*zh\s*:\s*"([^"]+)"', reference[start:end])
    ref_by_id = {name: {'index': int(i), 'name': name_zh} for i, name, name_zh in ref_types}
    region = reference[reference.index('const TYPE_SRC'):reference.index('const TYPE_DEPS')]
    ref_bodies = dict(re.findall(r'^\s*(\d+)\s*:\s*`([\s\S]*?)`', region, re.M))
    assert len(ref_types) == len(ref_by_id) == 307
    index = json.loads((DEFS / 'builtin.json').read_text(encoding='utf-8'))
    notes = dict(line.split('|', 1) for line in (ROOT / 'tools/builtin-review-notes.tsv').read_text(encoding='utf-8').splitlines())
    ids = {item['id'] for item in index['patterns']}
    assert ids == set(notes) and len(ids) == 284
    assert not KEEP & REBUILD
    functions, libraries, owners = defaultdict(list), {}, defaultdict(set)
    for path in sorted((DEFS / 'libraries').glob('*.glsl')):
        text = path.read_text(encoding='utf-8')
        libraries[path.stem] = {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes': len(path.read_bytes()),
                                'projectDecision': '按用户决定整库保留，保留现有署名和许可文本'}
        for name, bodies in functions_in(text).items():
            functions[name].extend(bodies)
            owners[name].add(path.stem)

    def calls(text):
        return set(re.findall(r'\b(\w+)\s*\(', clean(text))) & functions.keys()

    def closure(text):
        pending, seen = list(calls(text)), set()
        while pending:
            name = pending.pop()
            if name in seen:
                continue
            seen.add(name)
            pending.extend(calls('\n'.join(functions[name])) - seen)
        return sorted(seen)

    categories = {c['id']: c['name'] for c in index['categories']}
    records = []
    for entry in index['patterns']:
        pid = entry['id']
        path = DEFS / entry['file']
        d = json.loads(path.read_text(encoding='utf-8'))
        if d['category'] in {'noise', 'vector'} and pid not in KEEP:
            decision = 'rebuild'
        else:
            decision = 'keep' if pid in KEEP else 'rebuild' if pid in REBUILD else 'external'
        if decision == 'external':
            reason = '当前组合实现来源未获明确分发确认；存在具体构图、造型、运动或权重选择，建议暂外置当前版本，日后可授权或独立设计。'
        elif decision == 'keep':
            reason = '局部实现为常规数学、几何或参数化曲线，可优先保留；公共库按用户决定全部保留。'
        elif decision == 'rebuild':
            reason = '主体初审建议保留功能并整理或替换局部公式；公共库按用户决定全部保留，不再要求替换公共依赖。'
        if pid == 'OgeeFlowerTile':
            reason = '用户于本次会话确认参考图案为本人原创，固定控制点造型列入保留项；公共库按用户决定全部保留。'
        scalar = path.parent / d['outputs']['scalar']['file']
        text = scalar.read_text(encoding='utf-8')
        periodic_file = path.parent / 'periodic.glsl'
        periodic = periodic_file.read_text(encoding='utf-8') if periodic_file.exists() else ''
        helper = 'ref_vector_' + pid
        vector_text = '\n'.join(functions[helper]) if helper in functions else ''
        deps = closure(text + '\n' + periodic + '\n' + (helper + '();' if vector_text else ''))
        flags = []
        ref = ref_by_id.get(pid)
        comparison = '无同名ID，不能据此认定无同类效果'
        if ref:
            body = ref_bodies.get(str(ref['index']))
            if not body:
                raise ValueError('Missing reference formula for ' + pid)
            extracted = functions_in(body)
            name = 'getVec' if vector_text else 'evalType'
            candidate = (extracted.get(name) or [''])[0]
            if not candidate:
                comparison = '同名ID，输出形式不同，未作主体等同性判定'
            else:
                same = normalized(vector_text or text) == normalized(candidate)
                comparison = '去注释、包装和前缀后主体token相同' if same else '同名ID，但主体token不同；差异不证明独立创作'
        active_periodic = d['seamless'].get('source')
        actions = []
        if decision == 'external':
            actions.append('当前版本仅留外部库，不随工具及Skill分发')
        elif decision == 'rebuild':
            actions.append('保留能力，按主体初审建议整理局部公式；公共库保留')
        else:
            actions.append('保留局部图形及现有公共依赖')
        if pid in {'BlueNoise', 'Gabor', 'ReactionDiffusion'}:
            actions.append('保留真实功能说明，不将装饰近似当成严格算法')
        if pid in {'Teardrop', 'Leaf'}:
            actions.append('对方合并图形HeartLeafTeardrop含同类轮廓；核查独立参数化实现')
        if pid == 'NaturalWood':
            actions.append('核实本地节疤年轮主体设计；现有公共噪声及哈希保留')
        records.append({
            'id': pid, 'name': d['name'], 'category': categories[d['category']],
            'recommendation': decision, 'label': LABELS[decision],
            'formulaSummary': notes[pid], 'reason': reason,
            'referenceSameId': bool(ref), 'referenceComparison': comparison,
            'helpers': deps, 'attention': flags,
            'acceptedDependencies': deps,
            'periodicFilePresent': bool(periodic), 'periodicActive': bool(active_periodic),
            'vectorPath': helper if vector_text else 'renderer Sobel normal' if pid == 'HeightNormal' else 'UV RGB' if pid == 'PositionGradient' else None,
            'actions': actions, 'source': scalar.relative_to(ROOT).as_posix(),
            'sha256': hashlib.sha256(scalar.read_bytes()).hexdigest(),
            'definitionSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'designSourceEvidence': '用户确认参考图案为本人原创；非独立权属鉴定' if pid == 'OgeeFlowerTile' else None,
            'readyToPublish': False,
        })

    assert KEEP | REBUILD <= ids
    counts = Counter(r['recommendation'] for r in records)
    usage = {name: [r['id'] for r in records if name in r['helpers']] for name in sorted(functions)}
    # This inventory records graph roots only; an empty graph list is not proof
    # that the renderer/arranger/authoring runtime never uses a helper.
    common_ref = reference[reference.index('const GLSL_CORE'):reference.index('const TYPE_SRC')]
    reference_helpers = functions_in(common_ref)
    helper_rows = []
    for name in sorted(functions):
        ref_name = name.removeprefix('ref_')
        ref_impl = reference_helpers.get(ref_name, [])
        helper_rows.append({'name': name, 'libraries': sorted(owners[name]), 'patterns': usage[name],
                            'projectDecision': '按用户决定保留全部公共库及现有署名；此记录不是新增许可证明',
                            'referenceSameNameFound': bool(ref_impl),
                            'referenceBodyTokenMatch': bool(ref_impl) and normalized('\n'.join(functions[name])) == normalized('\n'.join(ref_impl)),
                            'bodiesSha256': hashlib.sha256('\n'.join(functions[name]).encode()).hexdigest()})
    snapshot_info = {'url': SOURCE_URL, 'sha256': hashlib.sha256(raw).hexdigest(), 'catalogEntries': len(ref_types)}
    result = {'schema': 'momo.builtin-review/v1', 'baseline': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'scope': '局部公式、独立periodic文件、公共函数及矢量分支；非法律结论或运行时允许清单',
              'reference': snapshot_info, 'counts': dict(counts), 'patterns': records,
              'projectDecisions': ['按用户决定全部保留 5 个公共库及其全部函数，包括现有专用效果函数和矢量分支，保留现有署名及许可文本，不再列为清理或替换任务。此决定不自动批准全部图形主体，也不记录为已核实许可证。'],
              'libraries': libraries, 'helperInventory': helper_rows}
    DOCS.mkdir(exist_ok=True)
    (DOCS / 'builtin-review.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write_report(result)
    print(json.dumps({'patterns': len(records), 'recommendations': dict(counts),
                      'sameId': sum(r['referenceSameId'] for r in records),
                      'equalNormalizedBodies': sum(r['referenceComparison'].startswith('去注释') for r in records),
                      'helpers': len(functions), 'notReachedByPatternRoots': [name for name in functions if not usage[name]],
                      'periodicFiles': sum(r['periodicFilePresent'] for r in records),
                      'activePeriodic': sum(r['periodicActive'] for r in records)}, ensure_ascii=False))

def write_report(result):
    lines = ['# 内置图形发布范围核对', '',
             '本表记录初审基线。初审中的公式重写建议已撤回：当前 284 项内置图形全部使用原实现。实际范围以[当前内置图形范围](builtin-release.md)和[实现清单](builtin-implementation.json)为准，下文分类与“尚缺工作”不是当前待执行指令。', '',
             '本表是发布前的工程建议，不是对作品原创性、侵权与否或全部授权的法律认定。没有任何条目被标为当前已可直接公开分发。网站收录与否、代码长短、改过变量名或本地有提交均不能单独证明授权。', '',
             f"代码基线：`{result['baseline']}`；本次审阅范围内的主体和定义指纹见配套 JSON。", '',
             '## 结果', '', '| 建议 | 数量 | 含义 |', '| --- | ---: | --- |']
    meanings = {'keep': '图形局部可优先保留，公共库按用户决定全部保留',
                'rebuild': '主体初审建议保留功能并整理局部公式；公共库全部保留',
                'external': '当前具体组合版本暂不分发，后续仍可授权或独立设计'}
    for code in LABELS:
        lines.append(f"| {LABELS[code]} | {result['counts'].get(code, 0)} | {meanings[code]} |")
    same = sum(r['referenceSameId'] for r in result['patterns'])
    equal = sum(r['referenceComparison'].startswith('去注释') for r in result['patterns'])
    lines += ['', '## 依据与范围', '',
              f"当前 284 个图形逐项核对主体、19 个独立周期文件（实际启用 16 个）和 5 个公共库。参考目录有 307 项，本地 {same} 项有同名 ID；还原坐标包装、参数别名、函数前缀并去注释后，{equal} 项主体 token 相同。此比较不证明权属，也没有宣称不同 token 就属于独立创作。", '',
              '没有同名 ID 的 6 项为 Teardrop、Leaf、BezierRibbon、OgeeFlowerTile、LineSegment、NaturalWood。对方 HeartLeafTeardrop 包含叶片、水滴，Wood 属同类木纹；不同 ID 不代表不同效果。未完成逐项视觉相似性判断。', '',
              '弧菱花砖 OgeeFlowerTile 的参考图案已由用户在本次会话确认是本人原创，因此固定花型列入保留项。该结论记录用户陈述，不是独立权属鉴定。', '',
              '每行的 helper 是主体、周期文件和专属矢量函数的可达公共函数集合，重载取并集。包括目录未启用但仍留在源码中的周期文件，以避免遗漏分发内容；没有把矢量分发器的所有其他图形误算成某一行依赖。HeightNormal 的渲染器 Sobel、PositionGradient 的 RGB UV 路径另作说明。helper 没有图形调用记录不代表整个工具不用它，例如 vectorAt 由渲染器调用；不能据此自动删除。', '',
              '保留建议由人工审阅公式原理及实现选择制定，脚本只整理目录、token 对比、指纹与依赖，不按相似度分数自动决定法律风险。“保留功能”类也可能需要改动外观或参数，不能承诺独立整理后逐像素一致。暂外置是当前实现的工程处置建议，不是断言该类效果一定受保护或永远不能内置。', '',
              '## 公共函数', '',
              '| 项目 | 核对结果 | 建议 |', '| --- | --- | --- |',
              '| math-v1 | 数学、哈希、噪声及现有专用效果函数 | 按用户决定整库保留 |',
              '| reference-v1 | 共享辅助函数，包括 Dave Hoskins hash12、Simplex、距离函数 | 按用户决定整库保留 |',
              '| periodic-v1 | 周期噪声与周期辅助函数 | 按用户决定整库保留 |',
              '| vector-v1 | 现有矢量输出函数及分发分支 | 按用户决定整库保留 |',
              '| natural-wood-v1 | 木纹专用辅助函数 | 按用户决定整库保留 |', '',
              '上述 5 个库及全部函数均不再列为清理或替换任务，保留现有署名和许可文本。此处记录项目采用决定，不是新增许可证明。图形主体仍按逐项建议处理，当前数量沿用主体初审分类。', '',
              '## 发布尚缺的工作', '',
              '- 图形主体调整、示例及测试调整均未执行；公共库确定全部保留，本报告不会改变程序行为。',
              '- 尚未取得对方整套组合效果的明确再分发许可；网页中的使用/导出授权不能推定为源码许可。',
              '- 当前公开阅读页面的静态快照只放在忽略的 test-results 中，不进入源码提交或分发。报告只保留元数据、结论和指纹。',
              '- root LICENSE、第三方声明、源仓库历史和生成物仍需单独复核，不能仅凭本表判断整个工具可公开发布。', '',
              '## 资料', '',
              f'- [参考网站]({SOURCE_URL})；快照 SHA256：`{result["reference"]["sha256"]}`。',
              '- [Ashima MIT 许可](https://github.com/ashima/webgl-noise/blob/master/LICENSE)及[二维单纯形源码](https://github.com/ashima/webgl-noise/blob/master/src/noise2D.glsl)。',
              '- [计算机软件保护条例](https://xzfg.moj.gov.cn/front/law/detail?LawID=913)：保护不延及思想、方法、数学概念，表达方式有限的相似有相应规定；不等于所有具体实现都可无条件复制。', '',
              '## 全部图形', '',
              '完整 helper 调用链、字段指纹和后续动作见 [JSON 清单](builtin-review.json)。', '',
              '| 分类 | 图形 / ID | 建议 | 公式原理 | 公共依赖处理 | 参考对照 |', '| --- | --- | --- | --- | --- | --- |']
    for row in result['patterns']:
        att = '公共库全部保留'
        lines.append(f"| {row['category']} | {row['name']} / {row['id']} | {row['label']} | {row['formulaSummary']} | {att} | {row['referenceComparison']} |")
    (DOCS / 'builtin-review.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    audit(Path(sys.argv[1]))
