import json
import logging
import os
import re
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


def validate_password_strength(pw: str) -> bool:
    if len(pw) < 8:
        return False
    if not re.search(r"[A-Z]", pw):
        return False
    if not re.search(r"[a-z]", pw):
        return False
    return bool(re.search(r"[0-9]", pw))


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

        # 1. Admit Student (Fresh or Legacy)
        if raw_path == "/director/admit-student" and http_method == "POST":
            sid = str(body.get("id") or int(time.time()))
            now = int(time.time())
            item = {
                "PK": f"STUDENT#{sid}",
                "SK": "PROFILE",
                "id": sid,
                "name": body.get("name", "").strip(),
                "class": str(body.get("class", "10")),
                "school": body.get("school", "").strip(),
                "area": body.get("area", "").strip(),
                "fatherName": body.get("fatherName", "").strip(),
                "fatherPhone": body.get("fatherPhone", "").strip(),
                "motherName": body.get("motherName", "").strip(),
                "motherPhone": body.get("motherPhone", "").strip(),
                "primaryContact": body.get("primaryContact", "father"),
                "primaryPhone": body.get("primaryPhone", "").strip(),
                "photo": body.get("photo", ""),
                "subjects": body.get("subjects", []),
                "monthlyFee": int(body.get("monthlyFee", 1500)),
                "feeStatus": "PAID" if body.get("feePaid", False) else "UNPAID",
                "admissionDate": body.get("admissionDate", time.strftime("%Y-%m-%d")),
                "status": "ACTIVE",
                "createdAt": now,
            }
            table.put_item(Item=item)
            return api_response(
                201, {"message": "Student successfully enrolled.", "studentId": sid}
            )

        # 2. Staff Intake (Tutor, Senior Faculty, Associate Director)
        if raw_path == "/director/create-staff" and http_method == "POST":
            name = body.get("name", "").strip()
            role = body.get("role", "tutor").strip().lower()
            phone = body.get("phone", "").strip()
            password = body.get("password", "")
            specialty = body.get("specialty", "")
            now = int(time.time())

            if not name or not phone:
                return api_response(
                    400, {"error": "Staff name and phone number are required."}
                )

            staff_id = f"STAFF-{int(time.time())}"
            table.put_item(
                Item={
                    "PK": "STAFF",
                    "SK": f"USER#{staff_id}",
                    "id": staff_id,
                    "name": name,
                    "name_lower": name.lower(),
                    "role": role,
                    "phone": phone,
                    "password": password,
                    "specialty": specialty,
                    "salary": int(body.get("salary", 12000)),
                    "status": "ACTIVE",
                    "createdAt": now,
                }
            )
            return api_response(
                201, {"message": f"{role.capitalize()} {name} enrolled successfully."}
            )

        # 3. Staff Management (Deactivate, Relieve)
        if raw_path == "/director/manage-staff" and http_method == "POST":
            action = body.get("action")
            staff_id = body.get("staffId")

            if not staff_id:
                return api_response(400, {"error": "staffId is required."})

            if action == "DEACTIVATE":
                table.update_item(
                    Key={"PK": "STAFF", "SK": f"USER#{staff_id}"},
                    UpdateExpression="SET #st = :d, deactivatedAt = :t",
                    ExpressionAttributeNames={"#st": "status"},
                    ExpressionAttributeValues={
                        ":d": "DEACTIVATED",
                        ":t": int(time.time()),
                    },
                )
                return api_response(
                    200, {"message": "Staff credentials revoked immediately."}
                )

        # 4. Fetch Staff List
        if raw_path == "/director/staff-list" and http_method == "GET":
            resp = table.scan(FilterExpression=Attr("PK").eq("STAFF"))
            return api_response(200, {"staff": resp.get("Items", [])})

        # 5. Fetch All Students (Master Floor Registry)
        if raw_path == "/director/students" and http_method == "GET":
            resp = table.scan(
                FilterExpression=Attr("PK").begins_with("STUDENT#")
                & Attr("SK").eq("PROFILE")
            )
            return api_response(200, {"students": resp.get("Items", [])})

        # 6. Single-Tap Toggle Fee Status
        if raw_path == "/director/toggle-fee" and http_method == "POST":
            student_id = body.get("studentId")
            new_status = body.get("feeStatus", "PAID")
            table.update_item(
                Key={"PK": f"STUDENT#{student_id}", "SK": "PROFILE"},
                UpdateExpression="SET feeStatus = :s",
                ExpressionAttributeValues={":s": new_status},
            )
            return api_response(200, {"message": f"Fee marked {new_status}."})

        # 7. Outbound WhatsApp Review Queue
        if raw_path == "/director/dispatch-queue" and http_method == "GET":
            resp = table.scan(
                FilterExpression=Attr("PK").eq("DISPATCH")
                & Attr("status").eq("PENDING")
            )
            return api_response(200, {"queue": resp.get("Items", [])})

        # 8. Resolve Dispatch Item
        if raw_path == "/director/dispatch-resolve" and http_method == "POST":
            sk = body.get("SK", "")
            table.update_item(
                Key={"PK": "DISPATCH", "SK": sk},
                UpdateExpression="SET #s = :sent, dispatchedAt = :t",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":sent": "DISPATCHED",
                    ":t": int(time.time()),
                },
            )
            return api_response(200, {"message": "Dispatch record settled."})

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Director handler failure")
        return api_response(500, {"error": "Director operation execution error."})
