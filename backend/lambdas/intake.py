import json
import logging
import os
import sys
import time
from typing import Any

import boto3

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

        if "/intake/student/admit" in raw_path:
            sid = str(int(time.time()))
            item = {
                "PK": f"STUDENT#{sid}",
                "SK": "PROFILE",
                "id": sid,
                "firstName": body.get("firstName", "").strip(),
                "lastName": body.get("lastName", "").strip(),
                "name": f"{body.get('firstName', '')} {body.get('lastName', '')}".strip(),
                "class": str(body.get("class", "10")),
                "boardStream": body.get("boardStream", "SSC").strip(),
                "gender": body.get("gender", "Male"),
                "expectedTime": body.get("expectedTime", "18:00"),
                "admissionDate": body.get("admissionDate", time.strftime("%Y-%m-%d")),
                "school": body.get("school", "").strip(),
                "area": body.get("area", "").strip(),
                "fatherName": body.get("fatherName", "").strip(),
                "fatherPhone": body.get("fatherPhone", "").strip(),
                "motherName": body.get("motherName", "").strip(),
                "motherPhone": body.get("motherPhone", "").strip(),
                "subjects": body.get("subjects", []),
                "monthlyFee": int(body.get("monthlyFee", 1500)),
                "feeStatus": "UNPAID",
                "paidAmount": 0,
                "nextDueDate": "",
                "status": "ACTIVE",
                "createdAt": int(time.time()),
            }
            table.put_item(Item=item)
            return api_response(
                201, {"message": "Student securely enrolled.", "studentId": sid}
            )

        if "/intake/student/edit" in raw_path:
            sid = body.get("id")
            table.update_item(
                Key={"PK": f"STUDENT#{sid}", "SK": "PROFILE"},
                UpdateExpression="SET firstName=:fn, lastName=:ln, #n=:nm, expectedTime=:et, monthlyFee=:mf, #cls=:c, boardStream=:bs, area=:a, gender=:g",
                ExpressionAttributeNames={"#cls": "class", "#n": "name"},
                ExpressionAttributeValues={
                    ":fn": body.get("firstName", ""),
                    ":ln": body.get("lastName", ""),
                    ":nm": f"{body.get('firstName', '')} {body.get('lastName', '')}".strip(),
                    ":et": body.get("expectedTime", "18:00"),
                    ":mf": int(body.get("monthlyFee", 1500)),
                    ":c": str(body.get("class", "10")),
                    ":bs": body.get("boardStream", "SSC"),
                    ":a": body.get("area", ""),
                    ":g": body.get("gender", "Male"),
                },
            )
            return api_response(
                200, {"message": "Student profile updated successfully."}
            )

        if "/intake/student/delete" in raw_path:
            table.update_item(
                Key={"PK": f"STUDENT#{body.get('studentId')}", "SK": "PROFILE"},
                UpdateExpression="SET #st = :inactive",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={":inactive": "LEFT_TUITION"},
            )
            return api_response(
                200, {"message": "Student moved to Left Students Archive."}
            )

        if "/intake/student/recall" in raw_path:
            table.update_item(
                Key={"PK": f"STUDENT#{body.get('studentId')}", "SK": "PROFILE"},
                UpdateExpression="SET #st = :active",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={":active": "ACTIVE"},
            )
            return api_response(200, {"message": "Student restored to active roster."})

        if "/intake/staff/create" in raw_path:
            staff_id = f"STAFF-{int(time.time())}"
            name = body.get("name", "").strip()
            table.put_item(
                Item={
                    "PK": "STAFF",
                    "SK": f"USER#{staff_id}",
                    "id": staff_id,
                    "name": name,
                    "name_lower": name.lower(),
                    "role": body.get("role", "tutor").strip().lower(),
                    "gender": body.get("gender", "Male"),
                    "phone": body.get("phone", "").strip(),
                    "password": body.get("password", ""),
                    "joinDate": body.get("joinDate", ""),
                    "salary": int(body.get("salary", 15000)),
                    "unpaidLeaves": 0,
                    "paidLeaves": 0,
                    "salaryAdjustments": 0,
                    "status": "ACTIVE",
                    "createdAt": int(time.time()),
                }
            )
            return api_response(201, {"message": "Staff member enrolled successfully."})

        if "/intake/staff/delete" in raw_path:
            table.update_item(
                Key={"PK": "STAFF", "SK": f"USER#{body.get('id')}"},
                UpdateExpression="SET #st = :inact",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={":inact": "INACTIVE"},
            )
            return api_response(
                200, {"message": "Staff access revoked and moved to Inactive."}
            )

        if "/intake/staff/recall" in raw_path:
            table.update_item(
                Key={"PK": "STAFF", "SK": f"USER#{body.get('id')}"},
                UpdateExpression="SET #st = :act, joinDate = :jd",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={
                    ":act": "ACTIVE",
                    ":jd": body.get("joinDate", ""),
                },
            )
            return api_response(
                200, {"message": "Staff access restored with new salary cycle."}
            )

        if "/intake/staff/attendance" in raw_path:
            staff_id = body.get("staffId")
            status = body.get("status")
            reason = body.get("reason", "")
            date_str = body.get("date", time.strftime("%Y-%m-%d"))
            now = int(time.time())

            table.put_item(
                Item={
                    "PK": f"STAFF_ATTENDANCE#{staff_id}",
                    "SK": date_str,
                    "status": status,
                    "reason": reason,
                    "createdAt": now,
                }
            )

            if status == "UNPAID_LEAVE":
                table.update_item(
                    Key={"PK": "STAFF", "SK": f"USER#{staff_id}"},
                    UpdateExpression="SET unpaidLeaves = if_not_exists(unpaidLeaves, :zero) + :inc",
                    ExpressionAttributeValues={":inc": 1, ":zero": 0},
                )
            elif status == "PAID_LEAVE":
                table.update_item(
                    Key={"PK": "STAFF", "SK": f"USER#{staff_id}"},
                    UpdateExpression="SET paidLeaves = if_not_exists(paidLeaves, :zero) + :inc",
                    ExpressionAttributeValues={":inc": 1, ":zero": 0},
                )

            return api_response(
                200, {"message": "Staff attendance logged successfully."}
            )

        if "/intake/generic-delete" in raw_path:
            DB.delete_record(body.get("pk"), body.get("sk"))
            return api_response(
                200, {"message": "Record permanently deleted from database."}
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Intake handler failure")
        return api_response(500, {"error": "Intake operation execution error."})
