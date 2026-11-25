"""Read classroom conversations and feedback from the teacher's database."""
import json


def message_report(server):
    rows = {}
    with server.store.connect() as db:
        db.execute('BEGIN')
        for r in db.execute("""SELECT s.id, COALESCE(l.identity_json,s.student_json) AS student
                FROM sessions s LEFT JOIN learning_sessions l ON l.session_id=s.id
                WHERE COALESCE(l.data_kind,?)='classroom'""",
                ('test' if server.learning.testing else 'classroom',)):
            student = json.loads(r['student'] or '{}') or {}
            if str(student.get('studentId') or '').strip():
                rows[r['id']] = dict(session={'student':student}, dataKind='classroom',
                    discussions=[], soap={'interviews':[],'tasks':[]}, feedback=[],events=[])
        groups = {}
        for r in db.execute("""SELECT c.session_id,c.id,t.request_id,t.message,t.reply,t.status,t.received_at
                FROM learning_turns t JOIN learning_conversations c ON c.id=t.conversation_id
                ORDER BY t.received_at,t.rowid"""):
            if r['session_id'] not in rows:
                continue
            if r['id'] not in groups:
                groups[r['id']] = {'id':r['id'],'turns':[]}
                rows[r['session_id']]['discussions'].append(groups[r['id']])
            groups[r['id']]['turns'].append(dict(requestId=r['request_id'],message=r['message'],
                reply=r['reply'],status=r['status'],receivedAt=r['received_at']))
        for r in db.execute('SELECT session_id,message,reply,received_at FROM soap_interviews ORDER BY received_at,rowid'):
            if r['session_id'] in rows:
                rows[r['session_id']]['soap']['interviews'].append(dict(question=r['message'],reply=r['reply'],at=r['received_at']))
        for r in db.execute("SELECT session_id,answer_json,received_at FROM soap_tasks WHERE task='reflection'"):
            if r['session_id'] in rows:
                rows[r['session_id']]['soap']['tasks'].append({'task':'reflection',
                    'answer':{'questions':json.loads(r['answer_json']).get('questions','')},'at':r['received_at']})
        for r in db.execute('SELECT session_id,category,rating,text,received_at FROM learning_feedback ORDER BY received_at,rowid'):
            if r['session_id'] in rows:
                rows[r['session_id']]['feedback'].append(dict(category=r['category'],rating=r['rating'],
                    text=r['text'],receivedAt=r['received_at']))
        for r in db.execute("""SELECT session_id,type,payload_json,at FROM events
                WHERE type IN ('student_message','patient_message','learning_problem_outcome') ORDER BY at,rowid"""):
            if r['session_id'] in rows:
                rows[r['session_id']]['events'].append(dict(type=r['type'],payload=json.loads(r['payload_json']),at=r['at']))
    return {'rows':list(rows.values())}
