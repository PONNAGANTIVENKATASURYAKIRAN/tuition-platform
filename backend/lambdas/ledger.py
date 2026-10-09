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

        if "/ledger/fee/toggle" in raw_path:
            student_id = body.get("studentId")
            table.update_item(
                Key={"PK": f"STUDENT#{student_id}", "SK": "PROFILE"},
                UpdateExpression="SET feeStatus=:fs, paidAmount=:pa, nextDueDate=:nd",
                ExpressionAttributeValues={
                    ":fs": body.get("feeStatus", "PAID"),
                    ":pa": int(body.get("paidAmount", 0)),
                    ":nd": body.get("nextDueDate", ""),
                },
            )
            return api_response(
                200, {"message": "Student fee status updated successfully."}
            )

        if "/ledger/payroll/update" in raw_path:
            table.update_item(
                Key={"PK": "STAFF", "SK": f"USER#{body.get('staffId')}"},
                UpdateExpression="SET unpaidLeaves=:ul, salaryAdjustments=:sa",
                ExpressionAttributeValues={
                    ":ul": int(body.get("unpaidLeaves", 0)),
                    ":sa": int(body.get("adjustments", 0)),
                },
            )
            return api_response(200, {"message": "Staff payroll payout adjusted."})

        if "/ledger/expense/add" in raw_path:
            exp_id = str(int(time.time()))
            table.put_item(
                Item={
                    "PK": "EXPENSE",
                    "SK": exp_id,
                    "id": exp_id,
                    "description": body.get("description", ""),
                    "amount": int(body.get("amount", 0)),
                    "remarks": body.get("remarks", ""),
                    "date": body.get("date", time.strftime("%Y-%m-%d")),
                }
            )
            return api_response(201, {"message": "Expense securely added to ledger."})

        if "/ledger/data" in raw_path and http_method == "GET":
            exp_resp = table.scan(FilterExpression=Attr("PK").eq("EXPENSE"))
            return api_response(200, {"expenses": exp_resp.get("Items", [])})

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Ledger handler failure")
        return api_response(500, {"error": "Ledger operation execution error."})
