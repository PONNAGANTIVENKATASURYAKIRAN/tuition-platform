import json
import logging
import os
import sys
import time
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.response import api_response

logger = logging.getLogger(__name__)

REGION = os.environ.get("REGION_NAME", "ap-south-1")
TABLE_NAME = os.environ.get("TABLE_NAME", "edudesk-records")

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
        raw_body = event.get("body", {})
        if isinstance(raw_body, str):
            try:
                body = json.loads(raw_body) if raw_body else {}
            except json.JSONDecodeError:
                body = {}
        elif isinstance(raw_body, dict):
            body = raw_body
        else:
            body = {}

        # 1. Fetch Students for Faculty Cohort
        if raw_path == "/faculty/students" and http_method == "GET":
            resp = table.scan(
                FilterExpression=Attr("PK").begins_with("STUDENT#")
                & Attr("SK").eq("PROFILE")
            )
            return api_response(200, {"students": resp.get("Items", [])})

        # 2. Fetch Doubt Resolutions
        if raw_path == "/faculty/doubts" and http_method == "POST":
            resp = table.scan(FilterExpression=Attr("PK").begins_with("DOUBT#"))
            return api_response(200, {"doubts": resp.get("Items", [])})

        # 3. Resolve / Record Doubt Clearance
        if raw_path == "/faculty/resolve-doubt" and http_method == "POST":
            student_id = body.get("studentId", "")
            student_name = body.get("studentName", "Student")
            subject = body.get("subject", "General")
            topic = body.get("topic", "")
            remarks = body.get("remarks", "Concept & problem doubts cleared.")
            teacher_name = body.get("teacherName", "Faculty")
            now = int(time.time())

            table.put_item(
                Item={
                    "PK": f"DOUBT#{student_id}",
                    "SK": f"SOLVED#{now}",
                    "studentId": student_id,
                    "studentName": student_name,
                    "subject": subject,
                    "topic": topic,
                    "remarks": remarks,
                    "teacher": teacher_name,
                    "date": time.strftime("%Y-%m-%d"),
                    "createdAt": now,
                }
            )
            return api_response(
                200, {"message": "Doubt clearance session verified and stored."}
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Faculty handler error")
        return api_response(500, {"error": "Faculty operation failed."})
