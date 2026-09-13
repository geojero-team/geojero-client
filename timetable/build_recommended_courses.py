"""
recommended_courses.txt (사람이 읽는 추천 코스) -> recommended_courses.json (API용).

왜 txt에서 만드나
  추천 코스는 탐색 결과를 사람이 검토해 확정한 것이 recommended_courses.txt입니다.
  JSON을 따로 계산하면 두 파일이 어긋날 수 있어서, 확정본(txt)을 그대로 옮겨 적습니다.
  코스를 다시 계산하면 txt를 먼저 갱신하고 이 스크립트를 다시 돌리세요.
  txt 형식이 조금이라도 달라지면 조용히 넘어가지 않고 멈춥니다(아래 check).

직행만
  모든 구간은 갈아타지 않고 버스 한 대로 잇습니다(기획 결정). 그래서 구간마다 버스는 배열이 아니라
  ride 하나이고, txt에 갈아타는 구간('/')이 있으면 멈춥니다.

실행  python3 timetable/build_recommended_courses.py   (표준 라이브러리만 씀)
입력  recommended_courses.txt, spot_times.json (스팟 id·거점 id·출처를 맞추려고 읽음)
출력  recommended_courses.json (항목마다 뜻·이유는 recommended_courses.schema.json)
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from build_spot_times import VIRTUAL_STOPS, minutes  # noqa: E402  시각 칸 없는 정류장 목록은 한 곳에서만 관리

TXT = HERE / 'recommended_courses.txt'
SPOT_TIMES = HERE / 'spot_times.json'
OUT = HERE / 'recommended_courses.json'
SCHEMA_REF = './recommended_courses.schema.json'
COMPUTED_AT = '2026-09-12'  # txt를 계산한 날. txt 첫머리 '계산' 값과 같게 맞출 것

ORIGIN = {'name': '고현터미널', 'stop': '고현', 'hubId': 'GOHYEON'}

# 코스에 나오는 스팟. txt에 적힌 이름 -> (spotId, 짧은 이름, 종류, 거제9경, 코스에서 내리는 거점)
#   spotId  spot_times.json의 spotId와 같게 맞춤. 지심도·내도는 spot_times.json에 없어 여기서 새로 붙임
#   짧은 이름  코스 카드 동그라미 밑(폭 64px)·지도 라벨용
#   종류    island(섬, 최소 150분) / outdoor(야외, 60분) / facility(시설, 60분). 체류·도착 마감이 종류마다 다름
SPOTS = {
    '학동흑진주몽돌해변': ('HAKDONG_BEACH', '학동', 'outdoor', True, '학동'),
    '바람의언덕': ('BARAM_HILL', '바람의언덕', 'outdoor', True, '도장포'),
    '거제해금강/외도': ('HAEGEUMGANG', '해금강', 'island', True, '해금강'),
    '동백섬 지심도': ('JISIMDO', '지심도', 'island', True, '장승포'),
    '내도': ('NAEDO', '내도', 'island', True, '구조라'),
    '포로수용소유적공원': ('POW_CAMP', '포로수용소', 'facility', False, '포로수용소'),
    '거제조선해양문화관': ('SHIPBUILDING_MUSEUM', '조선해양문화관', 'facility', False, '지세포'),
    '거제씨월드': ('SEA_WORLD', '씨월드', 'facility', False, '지세포'),
    '능포양지암조각공원': ('YANGJIAM_PARK', '양지암조각공원', 'outdoor', False, '능포'),
    '매미성': ('MAEMI_CASTLE', '매미성', 'outdoor', False, '대금교차로'),
    '거제맹종죽테마파크': ('MAENGJONGJUK_PARK', '맹종죽테마파크', 'facility', False, '맹종죽테마파크'),
    '거제 기성관': ('GISEONGGWAN', '기성관', 'facility', False, '거제면'),
}
# spot_times.json에 없는 스팟의 '타는 곳' 안내. 배 타는 항구 근처 정류장을 임시 거점으로 씀
TEMP_ALIGHT = {
    'JISIMDO': '장승포 (지심도 배는 장승포항에서 탐)',
    'NAEDO': '구조라 (내도 배는 구조라항에서 탐)',
}
# 시각 칸이 없어 앞뒤 정류장으로 잡은 정류장. 장승포는 코스 계산 때 10번의 두모~능포 사이로 추가한 것
ESTIMATED_STOPS = set(VIRTUAL_STOPS) | {'장승포'}

RULES = {
    'departAfter': '11:00',
    'returnToOrigin': True,
    'directOnly': True,  # 모든 구간은 버스 한 대(직행). 환승 코스는 만들지 않음
    'minStayMin': {'island': 150, 'outdoor': 60, 'facility': 60},
    'maxWaitMin': 90,
    'maxLegMin': 90,
    'arrivalDeadline': {'island': '15:00', 'facility': '17:00', 'outdoor': '18:00'},
}
SELECTION_ORDER = [
    '거제9경이 많이 들어간 순',
    '널리 알려진 곳(매미성·거제씨월드·포로수용소유적공원·거제식물원)이 많이 들어간 순',
    '버스를 기다리는 시간이 적은 순',
    '고현터미널에 일찍 돌아오는 순',
]
SELECTION_DEDUPE = [
    '같은 거제9경 조합은 2개까지만',
    '조선해양문화관과 거제씨월드만 서로 바꾼 코스는 한 번만',
]
ASSUMPTIONS = [
    '시각 칸이 없는 정류장(estimatedStops)은 앞뒤 정류장 시각으로 잡은 값입니다. 실제 버스는 적힌 승차 시각보다 늦게 오고, 적힌 도착 시각보다 일찍 닿습니다.',
    '지심도(장승포)·내도(구조라)는 배 타는 항구 근처 정류장을 임시 거점으로 썼습니다. 유람선·배 시각은 어느 코스에도 반영하지 않았습니다.',
    '도착 마감(섬 15:00·시설 17:00·야외 18:00)은 운영시간 데이터가 없어 정한 가정입니다.',
    '평일 시간표로 계산했습니다. 주말·방학에는 버스 시각이 달라 성립하지 않을 수 있습니다.',
    '스팟 체류(stayMin)에는 정류장과 스팟 사이를 걷는 시간이 들어 있습니다.',
]
EXCLUDED = [
    '청마기념관: 당일에 고현터미널로 돌아올 수 없음',
    '도장포유람선: 해금강/외도 유람선과 겹침',
    '공곶이: 예구에서 나가는 버스가 하루 3회(07:35·12:50·18:50)라 11시 출발 코스에 넣을 수 없음',
    '여차·홍포 해안비경: 홍포 막차 두 대가 17:20·19:30으로 벌어져 있어 가능한 코스가 1개뿐이고, 추천 코스에는 들지 못함',
]

# txt 한 줄씩 읽는 규칙
HEAD = re.compile(r'^\[(\d)곳-(\d\d)\] 9경 (\d)곳 · 고현 (\d\d:\d\d) 출발 → (\d\d:\d\d) 복귀')
RIDE = re.compile(r'^(\S+) (\d\d:\d\d) (\S+)번 → (\S+) (\d\d:\d\d)$')   # "고현 11:05 55번 → 학동 11:45"
SAME = re.compile(r'^\(같은 정류장에서 (\d\d:\d\d)\)$')                  # 버스 없이 옆 스팟으로
TARGET = re.compile(r'^(.+) (\d+)분(  ※ 운영시간 확인)?$')                 # "학동흑진주몽돌해변 120분" (+ 시설 17시 이후 도착 경고)
SUMMARY = re.compile(r'(\d)곳( 이상)? (\d+)개\(가능한 (\d+)개 중\)')
RETURN = '고현터미널 도착'
SPLIT = '   → '  # 구간(왼쪽)과 도착 스팟(오른쪽) 사이. 구간 안의 화살표는 공백 한 칸이라 겹치지 않음


def check(ok, msg):
    if not ok:
        raise SystemExit(f'recommended_courses.txt를 읽다가 멈춤: {msg}')


def approx30(m):
    """30분 단위 반올림(15분은 올림). 화면의 '약 8시간 30분'."""
    return (m + 15) // 30 * 30


def build_course(n, rank, g9, dep, ret, names, body, stop_hub):
    cid = f'{n}-{rank:02d}'

    def end(stop, at):
        return {'stop': stop, 'hubId': stop_hub.get(stop), 'at': at, 'estimated': stop in ESTIMATED_STOPS}

    legs, stops, prev = [], [], 'ORIGIN'
    for line in body:
        check(SPLIT in line, f'{cid} 줄 형식: {line!r}')
        where, target = line.split(SPLIT, 1)
        same = SAME.match(where)
        if same:
            mode, ride, d = 'SAME_STOP', None, same[1]
            a = d
        else:
            check(' / ' not in where, f'{cid} 갈아타는 구간이 있음(직행만 허용): {where!r}')
            r = RIDE.match(where)
            check(r, f'{cid} 구간 형식: {where!r}')
            mode, ride = 'BUS', {'routeNo': r[3], 'board': end(r[1], r[2]), 'alight': end(r[4], r[5])}
            d, a = r[2], r[5]
            check(minutes(a) >= minutes(d), f'{cid} 내리는 시각이 타는 시각보다 이름')
        if stops:
            stops[-1]['leaveAt'] = d  # 앞 스팟을 떠나는 시각 = 이 구간 출발
        if target == RETURN:
            to = 'ORIGIN'
        else:
            t = TARGET.match(target)
            check(t and t[1] in SPOTS, f'{cid} 모르는 스팟: {target!r} (SPOTS에 추가 필요)')
            to = SPOTS[t[1]][0]
        legs.append({
            'from': prev, 'to': to, 'mode': mode, 'departAt': d, 'arriveAt': a,
            'durationMin': minutes(a) - minutes(d), 'ride': ride,
        })
        if to != 'ORIGIN':
            stops.append({'order': len(stops) + 1, 'spotId': to, 'arriveAt': a, 'leaveAt': None, 'stayMin': int(t[2]),
                          'checkHours': bool(t[3])})
        prev = to

    # txt 머리줄과 몸통이 서로 맞는지 확인
    byid = {v[0]: v for v in SPOTS.values()}
    check([s['spotId'] for s in stops] == [SPOTS[x][0] for x in names], f'{cid} 스팟 순서가 머리줄과 다름')
    check(len(stops) == n, f'{cid} 스팟 수가 {n}곳이 아님')
    check(sum(byid[s['spotId']][3] for s in stops) == g9, f'{cid} 거제9경 수가 머리줄과 다름')
    check(legs[0]['from'] == 'ORIGIN' and legs[-1]['to'] == 'ORIGIN', f'{cid} 고현터미널 출발·복귀가 아님')
    check(legs[0]['departAt'] == dep and legs[-1]['arriveAt'] == ret, f'{cid} 출발·복귀 시각이 머리줄과 다름')
    for s in stops:
        check(minutes(s['leaveAt']) - minutes(s['arriveAt']) == s['stayMin'], f"{cid} {s['spotId']} 체류 분이 시각과 다름")
    for x, y in zip(legs, legs[1:]):
        check(minutes(y['departAt']) >= minutes(x['arriveAt']), f'{cid} 구간 시각이 거꾸로임')
    total = minutes(ret) - minutes(dep)
    return {
        'courseId': cid, 'spotCount': n, 'rank': rank, 'nineScenicCount': g9,
        'departAt': dep, 'returnAt': ret, 'totalMin': total, 'approxTotalMin': approx30(total),
        'stops': stops, 'legs': legs,
    }


def main():
    st = json.loads(SPOT_TIMES.read_text(encoding='utf-8'))
    hubs = {h['name']: h['hubId'] for h in st['hubs']}
    # txt는 '거제' 거점을 '거제면', '대계'를 '대계마을'로 적음(화면 표기)
    stop_hub = {**hubs, '거제면': hubs['거제'], '대계마을': hubs['대계']}
    st_spots = {s['spotId']: s for s in st['spots']}

    lines = TXT.read_text(encoding='utf-8').splitlines()
    summary = next((l for l in lines if l.startswith('요약')), None)
    check(summary, "'요약' 줄이 없음")
    per = [{'label': f"{m[1]}곳{m[2] or ''}", 'spotCount': int(m[1]), 'picked': int(m[3]), 'candidates': int(m[4])}
           for m in SUMMARY.finditer(summary)]

    courses, i = [], 0
    while i < len(lines):
        m = HEAD.match(lines[i])
        if not m:
            i += 1
            continue
        names = lines[i + 1].strip().split(' → ')
        j, body = i + 2, []
        while j < len(lines) and lines[j].startswith('    '):
            body.append(lines[j].strip())
            j += 1
        courses.append(build_course(int(m[1]), int(m[2]), int(m[3]), m[4], m[5], names, body, stop_hub))
        i = j

    for p in per:
        got = sum(c['spotCount'] == p['spotCount'] for c in courses)
        check(got == p['picked'], f"{p['label']}: 요약은 {p['picked']}개인데 코스는 {got}개")
    check(len({c['courseId'] for c in courses}) == len(courses), 'courseId가 겹침')

    used = {s['spotId'] for c in courses for s in c['stops']}
    spots = []
    for name, (sid, short, kind, g9, hub) in SPOTS.items():
        if sid not in used:
            continue
        spots.append({
            'spotId': sid, 'name': name, 'shortName': short, 'kind': kind, 'nineScenic': g9,
            'hubStop': hub, 'hubId': stop_hub.get(hub),
            'alight': st_spots[sid]['alight'] if sid in st_spots else TEMP_ALIGHT[sid],
            'inSpotTimes': sid in st_spots, 'temporaryHub': sid in TEMP_ALIGHT,
        })

    out = {
        '$schema': SCHEMA_REF,
        'meta': {
            'source': st['meta']['source'], 'baseDate': st['meta']['baseDate'], 'service': st['meta']['service'],
            'computedAt': COMPUTED_AT, 'sourceFile': TXT.name, 'origin': ORIGIN, 'rules': RULES,
            'selection': {'order': SELECTION_ORDER, 'dedupe': SELECTION_DEDUPE, 'perSpotCount': per},
            'estimatedStops': sorted(ESTIMATED_STOPS), 'assumptions': ASSUMPTIONS, 'excluded': EXCLUDED,
        },
        'spots': spots,
        'courses': courses,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{OUT.name}: 코스 {len(courses)}개 · 스팟 {len(spots)}곳 · '
          + ' · '.join(f"{p['label']} {p['picked']}/{p['candidates']}" for p in per))


if __name__ == '__main__':
    main()
