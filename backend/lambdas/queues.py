import json
import logging
import os
import sys
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

        if "/queues/list" in raw_path and http_method == "GET":
            queue_resp = table.scan(
                FilterExpression=Attr("PK").eq("DISPATCH")
                & Attr("status").eq("PENDING")
            )
            return api_response(200, {"queue": queue_resp.get("Items", [])})

        if "/queues/resolve" in raw_path and http_method == "POST":
            sk = body.get("SK", "")
            reply = body.get("reply", "Dispatched")
            table.update_item(
                Key={"PK": "DISPATCH", "SK": sk},
                UpdateExpression="SET parentReply = :r, #s = :sent",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":r": reply, ":sent": "RESOLVED"},
            )
            return api_response(
                200, {"message": "Message successfully logged and cleared from queue."}
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Queues handler failure")
        return api_response(500, {"error": "Queues operation execution error."})
