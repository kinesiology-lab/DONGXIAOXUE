"""Exercise the classroom HTTP API with an optional, independently stopped Chatflow."""
from contextlib import ExitStack
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "site"))
from serve_lab import create_server, now
from knowledge_exam import BANK


class PrivateClassroomTest(unittest.TestCase):
    def test_classroom_keeps_saving_while_agent_waits_and_after_shutdown(self):
        entered, release = threading.Event(), threading.Event()
        requests = []

        class Agent(BaseHTTPRequestHandler):
            def do_POST(self):
                requests.append((self.path, json.loads(self.rfile.read(int(self.headers["Content-Length"])))))
                entered.set()
                release.wait(8)
                body = json.dumps({"answer": "课程测试回复"}).encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *args):
                pass

        agent = ThreadingHTTPServer(("127.0.0.1", 0), Agent)
        threading.Thread(target=agent.serve_forever, daemon=True).start()
        with ExitStack() as stack:
            stack.callback(agent.server_close)
            stack.callback(agent.shutdown)
            stack.callback(release.set)
            stack.enter_context(patch.dict("os.environ", {
                "LAB_AI_MODE": "private-dify", "LAB_DIFY_KEY": "test-only",
                "LAB_DIFY_BASE_URL": f"http://127.0.0.1:{agent.server_port}/v1"}))
            folder = stack.enter_context(tempfile.TemporaryDirectory())
            def start_classroom():
                srv = create_server(0, folder, token="test-teacher")
                threading.Thread(target=srv.serve_forever, daemon=True).start()
                stack.callback(srv.server_close)
                stack.callback(srv.shutdown)
                return srv

            classroom = start_classroom()
            def call(path, data=None, headers=None):
                req = urllib.request.Request(f"http://127.0.0.1:{classroom.server_port}" + path,
                    data=json.dumps(data).encode() if data else None,
                    headers={"Content-Type": "application/json", **(headers or {})})
                try:
                    result = urllib.request.urlopen(req, timeout=5)
                except urllib.error.HTTPError as error:
                    with error:
                        return error.code, json.load(error)
                with result:
                    return result.status, json.load(result)

            student = {"name":"测试学生", "teacher":"测试老师", "studentId":"S00012"}
            session = {"id":"student-test", "caseId":"cai", "startedAt":now(), "student":student}
            code, enrollment = call("/api/learning/start", {"session":session})
            self.assertEqual(code, 200)
            self.assertEqual(enrollment["state"]["ai"]["provider"], "dify")
            token = {"X-Learner-Token":enrollment["accessToken"]}
            teacher = {"X-Teacher-Token":"test-teacher"}

            def ask(rid):
                return call("/api/learning/discussion", {"session":session, "consent":True,
                    "provider":"dify", "objectiveId":"O2", "mode":"deepen",
                    "message":"测试学生想比较足踝背伸", "requestId":rid}, token)

            def observe(i):
                event = {"id":f"event-{i}", "sessionId":session["id"], "at":now(),
                         "type":"lab_observation_saved", "payload":{"module":"踝运动"}}
                self.assertEqual(call("/api/learning/events", {"session":session, "events":[event]})[0], 200)
                return call("/api/teacher/classroom-dashboard?studentId=S00012", headers=teacher)[1]["labs"]["踝运动"]["observations"]

            replies = []
            worker = threading.Thread(target=lambda: replies.append(ask("online")))
            worker.start()
            self.assertTrue(entered.wait(4))
            self.assertEqual(observe(1), 1)
            release.set()
            worker.join(5)
            self.assertEqual(replies[0][1]["reply"], "课程测试回复")
            path, payload = requests[0]
            self.assertEqual(path, "/v1/chat-messages")
            self.assertIn("course_context", payload["inputs"])
            self.assertNotIn("测试学生", json.dumps(payload, ensure_ascii=False))
            agent.shutdown()
            agent.server_close()
            code, failure = ask("offline")
            self.assertEqual((code, failure["errorCode"]), (503, "agent_unavailable"))
            self.assertEqual(observe(2), 2)
            exam = {"sessionId":session["id"], "attemptId":"without-gpu", "version":BANK["version"],
                    "answers":[q["key"] for q in BANK["items"]]}
            code, grade = call("/api/learning/quiz", exam, token)
            self.assertEqual(code, 200)
            self.assertEqual(grade["score"], grade["total"])
            _, dashboard = call("/api/teacher/classroom-dashboard", headers=teacher)
            self.assertEqual(dashboard["students"][0]["exams"][0]["score"], grade["score"])
            classroom.shutdown()
            classroom.server_close()
            classroom = start_classroom()
            code, record = call("/api/teacher/learning?sessionId=student-test", headers=teacher)
            self.assertEqual(code, 200)
            statuses = [t["status"] for c in record["conversations"] for t in c["turns"]]
            self.assertCountEqual(statuses, ["succeeded", "failed"])
            self.assertEqual(observe(3), 3)


if __name__ == "__main__":
    unittest.main()
