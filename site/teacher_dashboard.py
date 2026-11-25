"""Teacher-only classroom dashboard, built from submitted records in one snapshot."""
import json
from collections import defaultdict
from knowledge_exam import BANK, LEGACY

def dashboard(server):
    banks = {b['version']: b for b in (BANK, LEGACY)}
    people = {}
    owners = {}
    guests = 0
    with server.store.connect() as db:
        db.execute('BEGIN')
        for r in db.execute("""SELECT s.id,s.started_at,s.updated_at,COALESCE(l.identity_json,s.student_json) AS identity
                FROM sessions s LEFT JOIN learning_sessions l ON l.session_id=s.id
                WHERE COALESCE(l.data_kind,?)='classroom' ORDER BY s.updated_at,s.id""",
                ('test' if server.learning.testing else 'classroom',)):
            identity = json.loads(r['identity'] or '{}') or {}
            sid = str(identity.get('studentId') or '').strip()
            if not sid:
                guests += 1
                continue
            p = people.setdefault(sid, dict(studentId=sid, name='', sessions=0, exams=[],
                                             lastAt='', firstAt=r['started_at'], completedAt=None, clinic='未开始'))
            p['firstAt'] = min(p['firstAt'],r['started_at'])
            p['name'] = identity.get('name') or p['name']
            p['sessions'] += 1
            p['lastAt'] = max(p['lastAt'], r['updated_at'])
            owners[r['id']] = p
        for r in db.execute("""SELECT session_id,version,score,submitted_at FROM kinesiology_exams
                                ORDER BY submitted_at, rowid"""):
            p = owners.get(r['session_id'])
            if p is None:
                continue
            bank = banks.get(r['version'])
            p['exams'].append(dict(version=r['version'], score=r['score'], at=r['submitted_at'],
                                  total=sum(q.get('points',1) for q in bank['items']) if bank else None))
            p['lastAt'] = max(p['lastAt'], r['submitted_at'])
        stages = ['未开始','进行中','提前提交','完整提交']
        for r in db.execute("""SELECT session_id,MAX(CASE type
                WHEN 'clinic3d_learning_complete' THEN 3
                WHEN 'clinic3d_partial_review_saved' THEN 2 ELSE 1 END) AS stage
                ,MIN(CASE WHEN type='clinic3d_learning_complete' THEN at END) AS completed_at
                FROM events WHERE type IN ('clinic3d_node','clinic3d_choice','clinic3d_task_completed',
                'clinic3d_progress_snapshot','clinic3d_learning_complete','clinic3d_partial_review_saved') GROUP BY session_id"""):
            p = owners.get(r['session_id'])
            if p is not None:
                p['clinic'] = stages[max(stages.index(p['clinic']),r['stage'])]
                if r['completed_at']:
                    p['completedAt'] = min(p['completedAt'] or r['completed_at'],r['completed_at'])
    return dict(students=list(people.values()), guestSessions=guests, version=BANK['version'],
                total=sum(q.get('points',1) for q in BANK['items']), passScore=BANK['passScore'])


def student_detail(server, student_id):
    runs = {}
    labs = defaultdict(lambda: {'observations': 0, 'explanations': 0, 'operations': 0})
    with server.store.connect() as db:
        for r in db.execute("""SELECT e.session_id,e.type,e.at,e.payload_json,s.started_at
                FROM sessions s LEFT JOIN learning_sessions l ON l.session_id=s.id
                JOIN events e ON e.session_id=s.id
                WHERE COALESCE(l.data_kind,?)='classroom'
                AND trim(json_extract(COALESCE(l.identity_json,s.student_json),'$.studentId'))=?
                AND e.type IN ('clinic3d_progress_snapshot','clinic3d_node','clinic3d_task_completed',
                    'clinic3d_step_skipped','clinic3d_partial_review_saved','clinic3d_learning_complete',
                    'lab_module_open','lab_observation_saved','lab_explanation_saved','lab_operation')
                ORDER BY s.started_at DESC,e.at,e.rowid""",
                ('test' if server.learning.testing else 'classroom', student_id)):
            kind = r['type']
            payload = json.loads(r['payload_json'])
            if kind.startswith('lab_'):
                module = str(payload.get('module') if payload.get('module') is not None else '未标注')
                counts = labs[module]
                field = {'lab_observation_saved':'observations','lab_explanation_saved':'explanations',
                         'lab_operation':'operations'}.get(kind)
                if field:
                    counts[field] += 1
                continue
            run = runs.setdefault(r['session_id'], dict(start=r['started_at'], steps={}, snapshot=None,
                                                         state='进行中'))
            if kind == 'clinic3d_progress_snapshot':
                ids, marks = payload.get('ids'), payload.get('marks')
                if isinstance(ids,list) and isinstance(marks,str) and len(ids)==len(marks) and all(
                        isinstance(k,str) and mark in '0123' for k,mark in zip(ids,marks)):
                    states = ('待学习','进行中','已完成','已跳过')
                    run['snapshot'] = [{'id':k, 'status':states[int(mark)]} for k,mark in zip(ids,marks)]
            elif kind in ('clinic3d_learning_complete','clinic3d_partial_review_saved'):
                run['state'] = '完整提交' if kind == 'clinic3d_learning_complete' else '提前提交'
            elif payload.get('nodeId'):
                key = str(payload['nodeId'])
                if kind != 'clinic3d_node' or key not in run['steps']:
                    run['steps'][key] = {'clinic3d_node':'已到访','clinic3d_task_completed':'已完成',
                                         'clinic3d_step_skipped':'已跳过'}[kind]
    return {'runs':list(runs.values()), 'labs':labs}
