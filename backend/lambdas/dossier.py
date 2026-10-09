import json
import logging
import os
import sys
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

        if "/dossier/fetch" in raw_path and http_method == "POST":
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

        if "/dossier/exam/log" in raw_path and http_method == "POST":
            student_id = body.get("studentId")
            exam_data = body.get("examData")

            table.update_item(
                Key={"PK": f"STUDENT#{student_id}", "SK": "PROFILE"},
                UpdateExpression="SET exams = list_append(if_not_exists(exams, :empty_list), :ex)",
                ExpressionAttributeValues={":empty_list": [], ":ex": [exam_data]},
            )
            return api_response(
                200,
                {"message": "School exam marks securely logged for Delta Progression."},
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Dossier handler failure")
        return api_response(500, {"error": "Dossier operation execution error."})
