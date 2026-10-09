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

        if "/holidays/publish" in raw_path:
            hol_id = str(int(time.time()))
            table.put_item(
                Item={
                    "PK": "HOLIDAY",
                    "SK": hol_id,
                    "id": hol_id,
                    "date": body.get("date", ""),
                    "occasion": body.get("occasion", ""),
                    "exemptClasses": body.get("exemptClasses", []),
                }
            )
            return api_response(
                201, {"message": "Holiday successfully published to all calendars."}
            )

        if "/holidays/list" in raw_path and http_method == "GET":
            hol_resp = table.scan(FilterExpression=Attr("PK").eq("HOLIDAY"))
            return api_response(200, {"holidays": hol_resp.get("Items", [])})

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Holidays handler failure")
        return api_response(500, {"error": "Holidays operation execution error."})
