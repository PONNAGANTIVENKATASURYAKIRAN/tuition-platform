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
        body = json.loads(event.get("body", "{}")) if event.get("body") else {}

        # ==========================================
        # 1. STUDENT INTAKE, EDIT & DELETE
        # ==========================================
        if raw_path == "/director/admit-student" and http_method == "POST":
            sid = str(int(time.time()))
            item = {
                "PK": f"STUDENT#{sid}",
                "SK": "PROFILE",
                "id": sid,
                "surname": body.get("surname", "").strip(),
                "givenName": body.get("givenName", "").strip(),
                "class": str(body.get("class", "10")),
                "admissionDate": body.get("admissionDate", time.strftime("%Y-%m-%d")),
                "school": body.get("school", "").strip(),
                "area": body.get("area", "").strip(),
                "fatherPhone": body.get("fatherPhone", "").strip(),
                "motherPhone": body.get("motherPhone", "").strip(),
                "primaryContact": body.get("primaryContact", "father"),
                "expectedTime": body.get("expectedTime", "18:00"),
                "subjects": body.get("subjects", []),
                "weakSubjects": body.get("weakSubjects", []),
                "monthlyFee": int(body.get("monthlyFee", 1500)),
                "feeStatus": "UNPAID",
                "status": "ACTIVE",
                "createdAt": int(time.time()),
            }
            table.put_item(Item=item)
            return api_response(201, {"message": "Student securely enrolled."})

        if raw_path == "/director/edit-student" and http_method == "POST":
            sid = body.get("id")
            if not sid:
                return api_response(400, {"error": "Student ID required."})

            table.update_item(
                Key={"PK": f"STUDENT#{sid}", "SK": "PROFILE"},
                UpdateExpression="SET givenName=:gn, surname=:sn, #cls=:c, area=:a, fatherPhone=:fp, expectedTime=:et, monthlyFee=:mf",
                ExpressionAttributeNames={"#cls": "class"},
                ExpressionAttributeValues={
                    ":gn": body.get("givenName", ""),
                    ":sn": body.get("surname", ""),
                    ":c": str(body.get("class", "10")),
                    ":a": body.get("area", ""),
                    ":fp": body.get("fatherPhone", ""),
                    ":et": body.get("expectedTime", "18:00"),
                    ":mf": int(body.get("monthlyFee", 1500)),
                },
            )
            return api_response(200, {"message": "Student profile updated."})

        if raw_path == "/director/delete-student" and http_method == "POST":
            sid = body.get("id")
            table.delete_item(Key={"PK": f"STUDENT#{sid}", "SK": "PROFILE"})
            return api_response(200, {"message": "Student record deleted."})

        # ==========================================
        # 2. STAFF INTAKE, EDIT & DELETE
        # ==========================================
        if raw_path == "/director/create-staff" and http_method == "POST":
            role = body.get("role", "tutor").strip().lower()
            staff_id = f"STAFF-{int(time.time())}"
            name = body.get("name", "").strip()

            table.put_item(
                Item={
                    "PK": "STAFF",
                    "SK": f"USER#{staff_id}",
                    "id": staff_id,
                    "name": name,
                    "name_lower": name.lower(),
                    "role": role,
                    "phone": body.get("phone", "").strip(),
                    "password": body.get("password", ""),
                    "classes": body.get("classes", []),
                    "subjects": body.get("subjects", []),
                    "status": "ACTIVE",
                    "createdAt": int(time.time()),
                }
            )
            return api_response(201, {"message": "Staff enrolled."})

        if raw_path == "/director/edit-staff" and http_method == "POST":
            staff_id = body.get("id")
            if not staff_id:
                return api_response(400, {"error": "Staff ID required."})

            table.update_item(
                Key={"PK": "STAFF", "SK": f"USER#{staff_id}"},
                UpdateExpression="SET #n=:n, phone=:p, classes=:c, subjects=:s",
                ExpressionAttributeNames={"#n": "name"},
                ExpressionAttributeValues={
                    ":n": body.get("name", ""),
                    ":p": body.get("phone", ""),
                    ":c": body.get("classes", []),
                    ":s": body.get("subjects", []),
                },
            )
            return api_response(200, {"message": "Staff profile updated."})

        if raw_path == "/director/delete-staff" and http_method == "POST":
            staff_id = body.get("id")
            table.delete_item(Key={"PK": "STAFF", "SK": f"USER#{staff_id}"})
            return api_response(200, {"message": "Staff permanently deleted."})

        # ==========================================
        # 3. EXPENSES LEDGER (ADD, EDIT, DELETE)
        # ==========================================
        if raw_path == "/director/add-expense" and http_method == "POST":
            exp_id = str(int(time.time()))
            table.put_item(
                Item={
                    "PK": "EXPENSE",
                    "SK": exp_id,
                    "id": exp_id,
                    "description": body.get("description", "Misc"),
                    "amount": int(body.get("amount", 0)),
                    "date": body.get("date", time.strftime("%Y-%m-%d")),
                }
            )
            return api_response(201, {"message": "Expense added."})

        if raw_path == "/director/edit-expense" and http_method == "POST":
            exp_id = body.get("id")
            table.update_item(
                Key={"PK": "EXPENSE", "SK": exp_id},
                UpdateExpression="SET description=:d, amount=:a",
                ExpressionAttributeValues={
                    ":d": body.get("description", ""),
                    ":a": int(body.get("amount", 0)),
                },
            )
            return api_response(200, {"message": "Expense updated."})

        if raw_path == "/director/delete-expense" and http_method == "POST":
            exp_id = body.get("id")
            table.delete_item(Key={"PK": "EXPENSE", "SK": exp_id})
            return api_response(200, {"message": "Expense deleted."})

        # ==========================================
        # 4. MASTER DATA & OPERATIONS
        # ==========================================
        if raw_path == "/director/master-data" and http_method == "GET":
            stu_resp = table.scan(
                FilterExpression=Attr("PK").begins_with("STUDENT#")
                & Attr("SK").eq("PROFILE")
            )
            staff_resp = table.scan(FilterExpression=Attr("PK").eq("STAFF"))
            exp_resp = table.scan(FilterExpression=Attr("PK").eq("EXPENSE"))
            queue_resp = table.scan(
                FilterExpression=Attr("PK").eq("DISPATCH")
                & Attr("status").eq("PENDING")
            )

            return api_response(
                200,
                {
                    "students": stu_resp.get("Items", []),
                    "staff": staff_resp.get("Items", []),
                    "expenses": exp_resp.get("Items", []),
                    "queue": queue_resp.get("Items", []),
                },
            )

        if raw_path == "/director/toggle-fee" and http_method == "POST":
            student_id = body.get("studentId")
            new_status = body.get("feeStatus", "PAID")
            table.update_item(
                Key={"PK": f"STUDENT#{student_id}", "SK": "PROFILE"},
                UpdateExpression="SET feeStatus = :s",
                ExpressionAttributeValues={":s": new_status},
            )
            return api_response(200, {"message": f"Fee marked {new_status}."})

        if raw_path == "/director/log-reply" and http_method == "POST":
            sk = body.get("SK", "")
            reply = body.get("reply", "")
            table.update_item(
                Key={"PK": "DISPATCH", "SK": sk},
                UpdateExpression="SET parentReply = :r, #s = :sent",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":r": reply, ":sent": "RESOLVED"},
            )
            return api_response(200, {"message": "Reply logged & cleared."})

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Director handler failure")
        return api_response(500, {"error": "Director operation execution error."})
