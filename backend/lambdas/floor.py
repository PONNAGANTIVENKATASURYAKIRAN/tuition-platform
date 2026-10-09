import json
import logging
import os
import sys
import time
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.db import DB
from common.response import api_response

logger = logging.getLogger(__name__)

TABLE_NAME = os.environ.get("TABLE_NAME", "edudesk-records")
REGION = os.environ.get("REGION_NAME", "ap-south-1")
dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


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

        if "/floor/students" in raw_path and http_method == "POST":
            classes = body.get("classes", [])
            students = DB.get_students_by_classes(classes)
            active_students = [s for s in students if s.get("status") != "LEFT_TUITION"]

            hol_resp = table.scan(FilterExpression=Attr("PK").eq("HOLIDAY"))

            return api_response(
                200,
                {"students": active_students, "holidays": hol_resp.get("Items", [])},
            )

        if "/floor/attendance/mark" in raw_path and http_method == "POST":
            DB.record_attendance(
                date_str=body.get("date") or time.strftime("%Y-%m-%d"),
                student_id=body.get("studentId", ""),
                status=body.get("status", "present"),
                late_slot=body.get("lateSlot", ""),
                marked_by=body.get("markedBy", "Floor Tutor"),
                student_info=body.get("studentInfo", {}),
                remarks=body.get("remarks", ""),
            )
            return api_response(
                200, {"message": "Attendance successfully recorded on the floor."}
            )

        if "/floor/sliptest/log" in raw_path and http_method == "POST":
            pct = DB.log_slip_test(
                student_id=body.get("studentId", ""),
                date_str=body.get("date") or time.strftime("%Y-%m-%d"),
                subject=body.get("subject", "General"),
                chapter=body.get("chapter", "Unit"),
                subtopic=body.get("subtopic", "General"),
                marks_obtained=body.get("marksObtained", 0),
                max_marks=body.get("maxMarks", 20),
                evaluator=body.get("evaluator", "Floor Tutor"),
                photos=body.get("photos", []),
                confidence=int(body.get("confidence", 50)),
                remarks=body.get("remarks", ""),
                send_to_parent=body.get("sendToParent", False),
                student_info=body.get("studentInfo", {}),
            )
            return api_response(
                200, {"message": "Test securely stored.", "percentage": pct}
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Floor handler failure")
        return api_response(500, {"error": "Floor operation execution error."})
