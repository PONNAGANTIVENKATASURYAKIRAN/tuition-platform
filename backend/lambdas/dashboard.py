import logging
import os
import sys
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
        if "/dashboard/master-data" in raw_path and http_method == "GET":
            stu_resp = table.scan(
                FilterExpression=Attr("PK").begins_with("STUDENT#")
                & Attr("SK").eq("PROFILE")
            )
            staff_resp = table.scan(FilterExpression=Attr("PK").eq("STAFF"))
            exp_resp = table.scan(FilterExpression=Attr("PK").eq("EXPENSE"))
            hol_resp = table.scan(FilterExpression=Attr("PK").eq("HOLIDAY"))
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
                    "holidays": hol_resp.get("Items", []),
                    "queue": queue_resp.get("Items", []),
                },
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})
    except Exception:
        logger.exception("Dashboard handler failure")
        return api_response(500, {"error": "Failed to sync dashboard master data."})
