import json
import logging
import os
import sys
import time
from typing import Any

from boto3.dynamodb.conditions import Attr

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.db import DB
from common.response import api_response

logger = logging.getLogger(__name__)

TABLE_NAME = os.environ.get("TABLE_NAME", "edudesk-records")
table = DB.get_table()


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )
    raw_path = event.get("rawPath") or event.get("path") or ""

    if http_method == "OPTIONS":
        return api_response(200, {"status": "ok"})

    try:
        body = json.loads(event.get("body", "{}")) if event.get("body") else {}

        # 1. Light Floor Roster Query
        if raw_path == "/tutor/students" and http_method == "POST":
            classes = body.get("classes", [])
            students = DB.get_students_by_classes(classes)
            active_students = [s for s in students if s.get("status") != "LEFT_TUITION"]
            return api_response(200, {"students": active_students})

        # 2. State-Reconciling Floor Attendance
        if raw_path == "/tutor/attendance" and http_method == "POST":
            date_str = body.get("date") or time.strftime("%Y-%m-%d")
            student_id = body.get("studentId", "")
            status = body.get("status", "present")
            late_slot = body.get("lateSlot", "")
            marked_by = body.get("markedBy", "Floor Tutor")
            student_info = body.get("studentInfo", {})

            DB.record_attendance(
                date_str=date_str,
                student_id=student_id,
                status=status,
                late_slot=late_slot,
                marked_by=marked_by,
                student_info=student_info,
            )
            return api_response(200, {"message": f"Attendance recorded as {status}."})

        # 3. Save Slip Test / Assessment with Photos
        if raw_path == "/tutor/sliptest" and http_method == "POST":
            pct = DB.log_slip_test(
                student_id=body.get("studentId", ""),
                date_str=body.get("date") or time.strftime("%Y-%m-%d"),
                subject=body.get("subject", "General"),
                chapter=body.get("chapter", "Unit 1"),
                subtopic=body.get("subtopic", "General"),
                marks_obtained=body.get("marksObtained", 0),
                max_marks=body.get("maxMarks", 20),
                evaluator=body.get("evaluator", "Floor Tutor"),
                photos=body.get("photos", []),
                confidence=int(body.get("confidence", 3)),
                remarks=body.get("remarks", ""),
                send_to_parent=body.get("sendToParent", False),
                student_info=body.get("studentInfo", {}),
            )
            return api_response(200, {"message": "Test stored.", "percentage": pct})

        # 4. Fetch On-Demand Student Profile
        if raw_path == "/tutor/student-drawer" and http_method == "POST":
            student_id = body.get("studentId", "")
            profile = DB.get_student_profile(student_id)
            if not profile:
                return api_response(404, {"error": "Student profile not found."})

            tests_resp = table.scan(
                FilterExpression=Attr("PK").eq(f"STUDENT#{student_id}")
                & Attr("SK").begins_with("TEST#")
            )
            profile["slipTests"] = tests_resp.get("Items", [])
            return api_response(200, {"profile": profile})

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Tutor handler failure")
        return api_response(500, {"error": "Tutor operation failed."})
