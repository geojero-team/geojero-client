#!/usr/bin/env python3
"""
거제시 거점 버스 시간표(xlsx) -> 스팟별 소요시간 JSON.

표준 라이브러리만 씁니다 (openpyxl·pandas 불필요). 시간표가 갱신되면 다시 돌리면 됩니다.

    python3 timetable/build_spot_times.py

범위: 17개 스팟 (남부권 6 · 동부권 4 · 북부권 3 · 서부권 3 · 중부권 포로수용소),
      출발지 고현 고정, 평일 기준.
출력 JSON 각 항목의 뜻과 필요한 이유는 spot_times.schema.json에 있습니다.
"""
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT_FILE = HERE / 'spot_times.json'
SCHEMA_REF = './spot_times.schema.json'

META = {'source': '거제시 BIS 원문', 'baseDate': '2026-08-18'}
SERVICE = 'WEEKDAY'

# (파일, 시트 이름). 요일 구분이 없는 시트는 매일 운행이고, 나뉜 시트는 평일 쪽을 씁니다.
SOURCES = [
    ('40번대50번대.xlsx', '50번대(고현-동부,남부)'),               # 남부권 55·53·54, 식물원 50-2
    ('10번대20번대30번대.xlsx', '32,33번대(고현-두모실,율천-능포)'),  # 매미성·옥포대첩·능포
    ('10번대20번대30번대.xlsx', '10번대(고현→수월,중곡→능포) 평일'),   # 능포
    ('10번대20번대30번대.xlsx', '10번대(능포→수월, 중곡→고현) 평일'),
    ('10번대20번대30번대.xlsx', '20번대 (고현~구조라,망치) 평일'),     # 지세포
    ('3000번4000번.xlsx', '3000번대(고현,상동,아주,능포)'),           # 능포
    ('3000번4000번.xlsx', '4000번대(고현,상동, 아주, 구조라)'),       # 지세포
    ('60번대70번대300번대.xlsx', '60번대(능포-예구,구조라,양화,학동)'),  # 능포·지세포·학동
    ('100번대110번대.xlsx', '(100, 101번)백병원↔수월,중곡(평일)'),    # 포로수용소
    ('100번대110번대.xlsx', '(110,111번)백병원↔장평(평일)'),
    ('10번대20번대30번대.xlsx', '30,31번대(고현-상유,구영)'),          # 맹종죽(하청·실전)
    ('10번대20번대30번대.xlsx', '36,37번대(고현-하청,한내,오비)'),     # 맹종죽(하청·석포)
    ('10번대20번대30번대.xlsx', '35번대(고현-칠천도)'),               # 맹종죽(실전·하청)
    ('60번대70번대300번대.xlsx', '70번대(고현-상문동-거제,둔덕,대교)'),  # 기성관(거제면)
    ('40번대50번대.xlsx', '40번대(고현-대교,옥동)'),                  # 청마기념관(산방)
]

ORIGIN = '고현'
MAX_RIDE_MIN = 90  # 스팟 간 이동: 버스에 탄 시간이 이 값 이상이면 뺍니다

# 시간표마다 고현 터미널을 부르는 이름이 다릅니다.
ALIAS = {'터미널': '고현', '터미널순환': '고현', '터미널홈': '고현'}

# 홍포 칸에 '08:05 (여차)'처럼 적힌 회차는 홍포가 아니라 여차로 가서 그 시각에 닿습니다.
# 괄호 안이 이 목록의 지명일 때만 그렇게 읽습니다 — 다른 괄호는 메모일 수 있어서입니다.
DEST_VARIANTS = {'여차'}

# 시간표에 그 정류장 시각이 적혀 있어도 실제로 그 정류장에 서는 노선만 셉니다 (사용자 확인 2026-09-12).
# 대계마을: 32·34번과 급행 2000번. 33번은 경로 문자열에 대계가 적혀 있어도 뺍니다.
# 맹종죽테마파크: 목록의 노선만. 36번대와 31-1·32-1·32-2·33-1·33-2·35-1번은 뺍니다.
STOP_ROUTES = {
    '대계': {'32', '34', '2000'},
    '맹종죽테마파크': {'30', '30-1', '30-2', '31', '32', '33', '35', '37', '37-2'},
}

# 급행 2000번은 시간표에 기점 출발 시각만 있습니다. 고현 -> 대계 60분은 사용자가 준 값입니다.
# 대계 -> 고현(부산발)은 부산 하단 -> 대계 소요시간을 몰라 넣지 않았습니다.
EXPRESS_2000 = ('3000번4000번.xlsx', '2000번(거제고현↔부산하단)-', 60)

# 당일 코스에서 뺄 스팟과 이유. 서비스는 당일 코스만 다루므로 코스 추천에서 빠집니다.
DAY_TRIP_EXCLUDED = {
    'CHEONGMA_MEMORIAL': '시간표상 산방에서 고현으로 돌아오는 버스가 06:40 한 번뿐입니다. '
                         '42번은 옥동에서 돌아오지만 그 시각이 시간표에 없습니다.',
}

# 시간표에 시각 칸이 없는 정류장. 시각이 있는 옆 정류장(앵커) 바로 옆에 끼워 넣고
# 앞뒤 정류장 시각으로 범위를 잡습니다. 두 번째 값은 앵커 반대편에 올 수 있는 정류장이고,
# None이면 앵커가 종점이라 이웃이 하나뿐인 경우입니다. 순서를 기준으로 하지 않아서
# 가는 편·오는 편·순환 노선에 똑같이 맞습니다.
VIRTUAL_STOPS = {
    '도장포': ('해금강', None),                        # 55: 학동->도장포->해금강(종점), 55-1: 도장포->해금강(종점). 노선도 확인 2026-09-11
    '식물원': ('외간교회', None),                      # 50-2: …거제면사무소-식물원-외간교회(종점). 시간표 경로 문자열
    '대금교차로': ('외포', {'두모실', '율천', '장목'}),  # 장목-두모실 쪽에서 외포 바로 앞. 사용자 확인 2026-09-11
    '포로수용소': ('백병원', {'시청'}),                # 100·110: 백병원-포로수용소-거제도서관-시청. 시간표 경로 안내
    '옥포대첩기념공원': ('덕포', {'중앙시장'}),         # 덕포와 중앙시장 사이. 사용자 확인 2026-09-11
    '맹종죽테마파크': ('하청', {'실전', '석포', '장목'}),  # 거제북로 위 하청 다음. 옆이 실전·석포면 그 사이, 실전 시각 없이 장목이면 하청과 장목 사이
}

HUB_IDS = {
    '고현': 'GOHYEON',
    '학동': 'HAKDONG', '해금강': 'HAEGEUMGANG', '도장포': 'DOJANGPO',
    '저구': 'JEOGU', '홍포': 'HONGPO', '여차': 'YEOCHA',
    '대금교차로': 'DAEGEUM', '포로수용소': 'POROSUYONGSO', '식물원': 'SIKMULWON',
    '지세포': 'JISEPO', '능포': 'NEUNGPO', '옥포대첩기념공원': 'OKPO_DAECHEOP',
    '맹종죽테마파크': 'MAENGJONGJUK', '대계': 'DAEGYE', '거제': 'GEOJE_MYEON', '산방': 'SANBANG',
}
INTEREST = set(HUB_IDS)
# 원본 오류를 경고로 남길 대상. 우리가 쓰는 거점이나 시각 없는 정류장의 옆 정류장을 지나는 회차만 봅니다.
RELEVANT = (INTEREST | {a for a, _ in VIRTUAL_STOPS.values()}
            | {n for _, side in VIRTUAL_STOPS.values() if side for n in side})

# hubs가 여러 개면 그중 어디로 가는 버스든 다 씁니다 (여차·홍포 해안비경).
SPOTS = [
    {'spotId': 'HAKDONG_BEACH', 'name': '학동몽돌해변', 'region': '남부권', 'hubs': ['학동'], 'alight': '학동 정류장'},
    {'spotId': 'HAEGEUMGANG', 'name': '해금강', 'region': '남부권', 'hubs': ['해금강'], 'alight': '해금강 정류장'},
    {'spotId': 'BARAM_HILL', 'name': '바람의언덕', 'region': '남부권', 'hubs': ['도장포'], 'alight': '도장포 정류장'},
    {'spotId': 'DOJANGPO_CRUISE', 'name': '도장포유람선', 'region': '남부권', 'hubs': ['도장포'], 'alight': '도장포 정류장'},
    {'spotId': 'YEOCHA_HONGPO', 'name': '여차·홍포 해안비경', 'region': '남부권', 'hubs': ['홍포', '여차'],
     'alight': '홍포 또는 여차 종점'},
    {'spotId': 'MYEONGSA_BEACH', 'name': '명사해수욕장', 'region': '남부권', 'hubs': ['저구'],
     'alight': '명사 정류장(53·53-1번) 또는 저구 정류장'},
    {'spotId': 'MAEMI_CASTLE', 'name': '매미성', 'region': '북부권', 'hubs': ['대금교차로'], 'alight': '대금교차로 정류장'},
    {'spotId': 'POW_CAMP', 'name': '포로수용소', 'region': '중부권', 'hubs': ['포로수용소'], 'alight': '포로수용소 정류장'},
    {'spotId': 'BOTANIC_GARDEN', 'name': '거제식물원', 'region': '서부권', 'hubs': ['식물원'], 'alight': '식물원 정류장'},
    {'spotId': 'SHIPBUILDING_MUSEUM', 'name': '거제조선해양문화관', 'region': '동부권', 'hubs': ['지세포'],
     'alight': '신촌 정류장'},
    {'spotId': 'SEA_WORLD', 'name': '거제씨월드', 'region': '동부권', 'hubs': ['지세포'], 'alight': '신촌 정류장'},
    {'spotId': 'YANGJIAM_PARK', 'name': '양지암조각공원', 'region': '동부권', 'hubs': ['능포'], 'alight': '능포 정류장'},
    {'spotId': 'OKPO_VICTORY_PARK', 'name': '옥포대첩기념공원', 'region': '동부권', 'hubs': ['옥포대첩기념공원'],
     'alight': '옥포대첩기념공원 정류장'},
    {'spotId': 'MAENGJONGJUK_PARK', 'name': '거제맹종죽테마파크', 'region': '북부권', 'hubs': ['맹종죽테마파크'],
     'alight': '맹종죽테마파크 정류장'},
    {'spotId': 'YS_BIRTHPLACE', 'name': '김영삼 대통령 생가 및 기록전시관', 'region': '북부권', 'hubs': ['대계'],
     'alight': '대계마을 정류장'},
    {'spotId': 'CHEONGMA_MEMORIAL', 'name': '청마기념관', 'region': '서부권', 'hubs': ['산방'],
     'alight': '산방 정류장'},
    {'spotId': 'GISEONGGWAN', 'name': '거제 기성관', 'region': '서부권', 'hubs': ['거제'], 'alight': '거제면 정류장'},
]

# ── xlsx 읽기 (표준 라이브러리) ───────────────────────────────────────────
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
REL = '{http://schemas.openxmlformats.org/package/2006/relationships}'


def _col(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(path, sheet_name):
    z = zipfile.ZipFile(path)
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            strings.append(''.join(t.text or '' for t in si.iter(f"{{{NS['m']}}}t")))
    rels = {r.get('Id'): r.get('Target') for r in
            ET.fromstring(z.read('xl/_rels/workbook.xml.rels')).iter(f'{REL}Relationship')}
    for s in ET.fromstring(z.read('xl/workbook.xml')).iter(f"{{{NS['m']}}}sheet"):
        if s.get('name').strip() == sheet_name:
            target = 'xl/' + rels[s.get(f"{{{NS['r']}}}id")].lstrip('/').replace('xl/', '')
            break
    else:
        raise SystemExit(f'시트를 찾지 못했습니다: {path} :: {sheet_name}')
    rows = []
    for row in ET.fromstring(z.read(target)).iter(f"{{{NS['m']}}}row"):
        cells = {}
        for c in row.findall('m:c', NS):
            t, v = c.get('t'), c.find('m:v', NS)
            if t == 's' and v is not None:
                val = strings[int(v.text)]
            elif t == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter(f"{{{NS['m']}}}t"))
            elif v is not None:
                f = float(v.text)
                if 0 < f < 1:  # 엑셀은 시각을 하루의 분수로 저장합니다
                    m = round(f * 1440)
                    val = f'{m // 60:02d}:{m % 60:02d}'
                else:
                    val = str(int(f)) if f == int(f) else v.text
            else:
                val = ''
            cells[_col(c.get('r'))] = val.replace('\n', ' ').strip()
        if cells:
            rows.append([cells.get(i, '') for i in range(max(cells) + 1)])
    return rows


# ── 파싱 ────────────────────────────────────────────────────────────────
TIME_RE = re.compile(r'^(\d{1,2}):(\d{2})$')
TIME_DEST_RE = re.compile(r'^(\d{1,2}):(\d{2})\s*\(([가-힣]+)\)$')
PLACE_TIME_RE = re.compile(r'([가-힣@]+)\((\d{1,2}):(\d{2})\)')
ROUTE_RE = re.compile(r'^\d+(-\d+)?$')


def hhmm(h, m):
    return f'{int(h):02d}:{int(m):02d}'


def minutes(t):
    h, m = t.split(':')
    return int(h) * 60 + int(m)


def canon(name):
    name = re.sub(r'(발|통과)$', '', name.replace(' ', ''))
    return ALIAS.get(name, name)


def out_of_order(pairs):
    ts = [minutes(t) for _, t in pairs]
    return any(b < a for a, b in zip(ts, ts[1:]))


def parse_trips(rows, sheet):
    """행 하나 = 회차 하나. 그 회차가 지나는 정류장을 (정류장, 시각) 목록으로 모읍니다.

    이름을 키로 모으지 않고 목록으로 두는 이유: 왕복·순환 행은 고현·시청·백병원이 한 행에
    두 번 나옵니다. 이름으로 모으면 가는 편 시각이 오는 편 시각에 덮어써집니다.

    시각이 거꾸로 적힌 곳은 원본 오타입니다. 모르는 시각을 추정하지 않는 것과 같은 원칙으로
    그 부분은 쓰지 않습니다 — 칸이 거꾸로면 회차 전체를, 문자열이 거꾸로면 그 문자열만 버립니다.
    """
    trips, cols, note_col = [], None, None
    for i, r in enumerate(rows):
        if r and r[0] == '번호':
            cols = [(j, canon(v)) for j, v in enumerate(r) if v and v not in ('번호', '비고')]
            note_col = r.index('비고') if '비고' in r else len(r)
            continue
        if not cols or not r or not ROUTE_RE.match(r[0]):
            continue  # 머리행 전, 제목행, 안내문 행
        issues, in_cols = [], []
        for j, name in cols:
            if j >= len(r):
                continue
            if m := TIME_RE.match(r[j]):
                in_cols.append((name, hhmm(*m.groups())))
            elif (m := TIME_DEST_RE.match(r[j])) and m.group(3) in DEST_VARIANTS:
                in_cols.append((m.group(3), hhmm(m.group(1), m.group(2))))
        seen = {n for n, _ in in_cols}
        drop = out_of_order(in_cols)
        if drop:
            issues.append(f'칸 시각 역전 {[t for _, t in in_cols]} — 이 회차는 쓰지 않음')
        stops = [] if drop else list(in_cols)
        # 경로가 한 칸에 문자열로 든 경우 "고현(5:40)-…-학동(6:20)". 칸 위치가 아니라 문자열
        # 안의 지명으로 판단합니다 — 67-1 해금강 칸의 "구조라(09:20)"을 해금강으로 오인하지 않습니다.
        for cell in r[1:note_col]:
            found = [(canon(m.group(1)), hhmm(m.group(2), m.group(3)))
                     for m in PLACE_TIME_RE.finditer(cell.replace('터미널 홈', '터미널홈'))]
            seen |= {n for n, _ in found}
            if out_of_order(found):
                issues.append(f'문자열 시각 역전 {[t for _, t in found]} — 이 문자열은 쓰지 않음')
            elif not drop:
                stops += found
        trips.append({
            'label': f'{sheet} {i + 1}행 {r[0]}번', 'route': r[0], 'issues': issues,
            'touches': bool(seen & RELEVANT),
            'stops': sorted(set(stops), key=lambda s: minutes(s[1])),  # 시각 순 = 실제 운행 순서
        })
    return trips


def express_trips():
    """급행 2000번. 시간표에는 고현 출발 시각만 있어서 사용자가 준 소요시간을 더해 대계 도착을 만듭니다."""
    f, sheet, ride = EXPRESS_2000
    trips = []
    for i, r in enumerate(read_sheet(ROOT / f, sheet)):
        if len(r) > 1 and r[0].isdigit() and (m := TIME_RE.match(r[1])):
            dep = hhmm(*m.groups())
            arr = minutes(dep) + ride
            trips.append({'label': f'{sheet} {i + 1}행 2000번', 'route': '2000', 'issues': [], 'touches': True,
                          'stops': [('고현', dep), ('대계', f'{arr // 60:02d}:{arr % 60:02d}')]})
    return trips


# ── 구간 계산 ────────────────────────────────────────────────────────────
def with_virtuals(stops):
    """시각이 없는 정류장을 끼워 넣습니다. 원소는 (정류장, 탈 때 기준, 내릴 때 기준)입니다.

    실제 정류장은 둘이 같고, 끼워 넣은 정류장은 탈 때 = 앞 정류장 시각(하한),
    내릴 때 = 뒤 정류장 시각(상한)입니다. 도착은 늦게, 승차는 이르게 잡으므로
    실제보다 손해 보는 쪽으로만 틀립니다.
    """
    seq = [(n, t, t) for n, t in stops]
    inserts = []
    for vname, (anchor, side) in VIRTUAL_STOPS.items():
        for k, (n, _, _) in enumerate(seq):
            if n != anchor:
                continue
            if side is None:  # 종점: 이웃이 하나뿐일 때만 (중간에 나오면 판단 불가라 건너뜀)
                nbs = [k - 1] if k == len(seq) - 1 else [k + 1] if k == 0 else []
            else:
                nbs = [nb for nb in (k - 1, k + 1) if 0 <= nb < len(seq) and seq[nb][0] in side]
            for nb in nbs:
                if 0 <= nb < len(seq):
                    lo, hi = min(k, nb), max(k, nb)
                    inserts.append((hi, (vname, seq[lo][1], seq[hi][2])))
    for pos, entry in sorted(inserts, key=lambda x: -x[0]):
        seq.insert(pos, entry)
    return seq


def build_legs(trips):
    """같은 회차 안에서 앞 정류장 -> 뒤 정류장을 구간으로 뽑습니다.

    한 회차가 같은 정류장을 두 번 지나면(왕복·순환) 가장 짧게 타는 경우만 씁니다.
    같은 버스라 도착 시각은 같고, 일찍 타서 한 바퀴 더 도는 건 쓸모가 없습니다.
    """
    legs, bound = defaultdict(list), set()
    for t in trips:
        # 시간표에 적혀 있어도 그 노선이 서지 않는 정류장은 뺍니다 (STOP_ROUTES).
        # 끼워 넣은 정류장(맹종죽)에도 적용해야 해서 끼운 뒤에 거릅니다.
        seq = [x for x in with_virtuals(t['stops']) if t['route'] in STOP_ROUTES.get(x[0], {t['route']})]
        best = {}
        for i, (a, board, _) in enumerate(seq):
            if a not in INTEREST:
                continue
            for b, _, alight in seq[i + 1:]:
                if b not in INTEREST or b == a:
                    continue
                ride = minutes(alight) - minutes(board)
                if ride > 0 and ((a, b) not in best or ride < best[(a, b)][2]):
                    best[(a, b)] = (board, alight, ride)
        for (a, b), (board, alight, _) in best.items():
            key = (a, b, t['route'])
            legs[key].append((board, alight))
            if a in VIRTUAL_STOPS or b in VIRTUAL_STOPS:
                bound.add(key)
        t['used'] = bool(best)
    return legs, bound


def summarize(pairs):
    # 같은 시각에 출발하는 회차는 같은 버스로 보고 가장 늦은 도착만 씁니다. 시트 두 곳에 같은
    # 회차가 나오고 시각이 조금 다를 때(67·67-1) 보수적인 쪽이 남습니다.
    latest = {}
    for d, a in pairs:
        if d not in latest or minutes(a) > minutes(latest[d]):
            latest[d] = a
    pairs = sorted(latest.items(), key=lambda p: minutes(p[0]))
    rides = [minutes(a) - minutes(d) for d, a in pairs]
    deps = [minutes(d) for d, _ in pairs]
    gaps = [b - a for a, b in zip(deps, deps[1:])]
    return {
        'rideMin': {'min': min(rides), 'max': max(rides)},
        # 소요시간보다 이게 더 중요합니다. 하루 몇 회뿐인 노선은 한 번 놓치면 몇 시간을 기다립니다.
        # 코스 계산은 rideMin이 아니라 trips(출발 시각 목록)로 해야 합니다.
        'maxGapMin': max(gaps) if gaps else None,
        'firstDepart': pairs[0][0],
        'lastDepart': pairs[-1][0],
        'count': len(pairs),
        'trips': [{'depart': d, 'arrive': a} for d, a in pairs],
    }


def combine(legs, bound, frms, tos):
    """출발 거점들 -> 도착 거점들을 노선 구분 없이 합친 요약."""
    frms, tos = set(frms), set(tos)
    keys = [k for k in legs if k[0] in frms and k[1] in tos]
    if not keys:
        return None
    merged = summarize([p for k in keys for p in legs[k]])
    merged['routes'] = sorted({k[2] for k in keys})
    merged['bound'] = any(k in bound for k in keys)
    return merged


def spot_to_spot(a, b, legs, bound):
    """스팟 간 이동. 같은 회차로 바로 가는 버스만 봅니다 (환승은 고려하지 않음).
    환승을 넣게 되면 대기시간까지 합쳐야 합니다 — 탄 시간만 더하면 55번처럼 몇 시간씩
    기다리는 구간이 짧아 보입니다."""
    base = {'from': a['spotId'], 'to': b['spotId']}
    shared = [h for h in a['hubs'] if h in b['hubs']]
    if shared:
        where = a['alight'] if a['alight'] == b['alight'] else f'{shared[0]} 정류장'
        return 'matrix', {**base, 'mode': 'SAME_STOP',
                          'note': f'둘 다 {where}에서 내려서 버스가 필요 없습니다. 도보 거리는 계산하지 않았습니다.'}
    direct = combine(legs, bound, a['hubs'], b['hubs'])
    if not direct:
        return 'excluded', {**base, 'reason': 'NO_ROUTE'}
    if direct['rideMin']['max'] >= MAX_RIDE_MIN:
        return 'excluded', {**base, 'reason': 'OVER_MAX_RIDE', 'rideMaxMin': direct['rideMin']['max']}
    return 'matrix', {**base, 'mode': 'BUS', **direct}


# ── 실행 ────────────────────────────────────────────────────────────────
def main():
    warnings = [
        '67·67-1번은 50번대와 60번대 시트에 같은 회차가 두 번 나오고 시각이 2~5분 다릅니다 '
        '(예: 학동 07:35 출발 -> 고현 08:33 vs 08:31). 같은 시각에 출발하는 회차는 같은 버스로 보고 '
        '더 늦은 도착을 씁니다.',
        '원문 표지 안내: 중간통과시간은 도로사정 및 교통혼잡에 따라 다소 차이가 있을 수 있습니다. '
        '기점 외 시각은 근사값입니다.',
    ]
    trips = []
    for f, sheet in SOURCES:
        trips += parse_trips(read_sheet(ROOT / f, sheet), sheet)
    trips += express_trips()
    legs, bound = build_legs(trips)
    # 우리 거점을 지나지 않는 노선의 원본 오류까지 적으면 정작 봐야 할 경고가 묻힙니다.
    warnings += [f"{t['label']}: {x}" for t in trips if t['touches'] for x in t['issues']]

    spots = [{
        'spotId': s['spotId'], 'name': s['name'], 'region': s['region'],
        'hubIds': [HUB_IDS[h] for h in s['hubs']], 'alight': s['alight'],
        'dayTrip': s['spotId'] not in DAY_TRIP_EXCLUDED,
        **({'dayTripNote': DAY_TRIP_EXCLUDED[s['spotId']]} if s['spotId'] in DAY_TRIP_EXCLUDED else {}),
        'fromOrigin': combine(legs, bound, [ORIGIN], s['hubs']),
        'toOrigin': combine(legs, bound, s['hubs'], [ORIGIN]),
    } for s in SPOTS]

    matrix, excluded = [], []
    for a in SPOTS:
        for b in SPOTS:
            if a is not b:
                kind, row = spot_to_spot(a, b, legs, bound)
                (matrix if kind == 'matrix' else excluded).append(row)

    out = {
        '$schema': SCHEMA_REF,
        'meta': {
            **META,
            'service': SERVICE,
            'origin': {'hubId': HUB_IDS[ORIGIN], 'name': ORIGIN},
            'maxRideMin': MAX_RIDE_MIN,
            'sources': [f'{f} :: {s}' for f, s in SOURCES] + [f'{EXPRESS_2000[0]} :: {EXPRESS_2000[1]}'],
            'assumptions': [
                '평일 기준입니다. 10·20·100·110번대는 평일/주말 시트가 나뉘어 있어 평일 시트를 썼고, '
                '30~37·40·50·60·70·2000·3000·4000번대는 요일 구분이 없어 매일 운행으로 봅니다. 원문 기준 공휴일은 '
                '토·일·법정공휴일이고 방학에는 전 노선이 주말공휴일 시간표로 운행하므로, 주말·공휴일·방학용은 '
                '따로 만들어야 합니다.',
                '시간표에 시각 칸이 없는 정류장(도장포·식물원·대금교차로·포로수용소·옥포대첩기념공원·맹종죽테마파크)은 시각이 '
                '있는 옆 정류장 사이에 끼워 넣고, 도착은 뒤 정류장 시각(상한)·승차는 앞 정류장 시각(하한)으로 '
                '잡았습니다. 실제보다 손해 보는 쪽으로만 틀립니다. bound=true 인 값이 여기에 해당합니다.',
                '시간표·노선도로 확인한 위치: 55번은 학동 -> 도장포 -> 해금강(종점), 55-1번은 도장포 -> '
                '해금강(종점)입니다. 식물원은 50-2번 외간교회(종점) 바로 앞, 포로수용소는 100·110번 백병원과 '
                '시청 사이입니다.',
                '사용자가 정한 위치: 매미성은 대금교차로(장목·두모실 쪽에서 외포 바로 앞), 옥포대첩기념공원은 '
                '덕포와 중앙시장 사이, 여차·홍포 해안비경은 홍포·여차 어느 종점이든 됩니다. 거제조선해양문화관·'
                '거제씨월드는 신촌 정류장에서 내리지만 지세포 시각을, 명사해수욕장은 저구 시각을 그대로 씁니다. '
                '양지암조각공원은 능포 종점으로 봤습니다.',
                '홍포 칸에 "08:05 (여차)"처럼 적힌 회차는 홍포가 아니라 여차로 가서 그 시각에 닿는 것으로 '
                '읽습니다. 55-1번은 저구를 지나지만 시간표에 저구 시각이 없어서 명사해수욕장 계산에서 빠집니다.',
                '사용자가 정한 위치(2026-09-12): 거제맹종죽테마파크는 하청 다음 거제북로 위이고 '
                '30·30-1·30-2·31·32·33·35·37·37-2번만 셉니다(36번대, 31-1·32-1·32-2·33-1·33-2·35-1번 제외). '
                '하청 옆이 실전이면 하청과 실전 사이, 석포면 하청과 석포 사이, 실전 시각 없이 장목이면 '
                '하청과 장목 사이로 잡았습니다. 청마기념관은 산방(40번대), 거제 기성관은 거제면(50·70번대 '
                '거제 칸)입니다.',
                '김영삼 대통령 생가는 대계마을 정류장에서 내리고, 이 정류장에 서는 32·34·2000번만 셉니다. '
                '33번은 시간표에 대계가 적혀 있어도 뺐습니다. 급행 2000번은 시간표에 기점 출발 시각만 있어서 '
                '고현 출발에 사용자가 준 60분을 더해 대계 도착으로 넣었습니다. 대계 -> 고현 방향은 부산 하단 '
                '-> 대계 소요시간을 몰라 넣지 않았습니다.',
                '스팟 간 이동은 같은 회차로 바로 가는 버스만 봅니다. 환승 경로는 고려하지 않아서 바로 가는 '
                '버스가 없는 스팟끼리는 excluded(NO_ROUTE)로 빠집니다. 바로 가는 버스라도 탄 시간 최댓값이 '
                f'{MAX_RIDE_MIN}분 이상이면 excluded(OVER_MAX_RIDE)로 뺍니다.',
                '한 회차가 같은 정류장을 두 번 지나면(왕복·순환 노선) 가장 짧게 타는 경우만 씁니다.',
            ],
            'warnings': warnings,
        },
        'hubs': [{'hubId': HUB_IDS[h], 'name': h, 'inTimetable': h not in VIRTUAL_STOPS} for h in HUB_IDS],
        'spots': spots,
        'matrix': matrix,
        'excluded': excluded,
        'legs': [{'from': HUB_IDS[f], 'to': HUB_IDS[t], 'routeNo': r, 'bound': (f, t, r) in bound,
                  **summarize(p)} for (f, t, r), p in sorted(legs.items())],
    }
    OUT_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

    # ── 요약 출력 ──
    def rng(r):
        return f"{r['min']}분" if r['min'] == r['max'] else f"{r['min']}~{r['max']}분"

    def fmt(x):
        if not x:
            return '— 없음'
        g = x['maxGapMin']
        gap = f" · 최대대기 {g // 60}시간{g % 60:02d}분" if g else ''
        return (f"{rng(x['rideMin'])} · 첫 {x['firstDepart']} · 막 {x['lastDepart']} · "
                f"{x['count']}회{gap} · {'/'.join(x['routes'])}{' (범위값)' if x['bound'] else ''}")

    print(f'회차 {len(trips)}개 파싱 · 구간에 쓰인 회차 {sum(t["used"] for t in trips)}개 -> '
          f'{OUT_FILE.relative_to(ROOT)}\n')
    for s in spots:
        print(f"[{s['region']} {s['name']}]  {s['alight']}")
        print(f"   고현 -> 스팟 : {fmt(s['fromOrigin'])}")
        print(f"   스팟 -> 고현 : {fmt(s['toOrigin'])}")
    name = {s['spotId']: s['name'] for s in SPOTS}
    print(f'\n[스팟 간 직행 — {len(matrix)}건]')
    by = defaultdict(list)
    for m in matrix:
        by[name[m['from']]].append(f"{name[m['to']]} {rng(m['rideMin'])}({'/'.join(m['routes'])})"
                                   if m['mode'] == 'BUS' else f"{name[m['to']]} 같은정류장")
    for f, xs in by.items():
        print(f'   {f} -> ' + ', '.join(xs))
    over = [e for e in excluded if e['reason'] == 'OVER_MAX_RIDE']
    none = [e for e in excluded if e['reason'] == 'NO_ROUTE']
    print(f'\n[제외 — 탄 시간 {MAX_RIDE_MIN}분 이상 {len(over)}건 · 바로 가는 버스 없음 {len(none)}건]')
    for e in over:
        print(f"   {name[e['from']]} -> {name[e['to']]} 탄 시간 최대 {e['rideMaxMin']}분")
    extra = warnings[2:]
    print('\n[검증] ' + ('쓰인 회차에 시각 역전 없음' if not extra else f'{len(extra)}건'))
    for w in extra[:10]:
        print(f'   - {w}')


if __name__ == '__main__':
    main()
