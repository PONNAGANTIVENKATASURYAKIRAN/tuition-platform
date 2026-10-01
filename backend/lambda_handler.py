"""AWS Lambda microservice for Tuition Platform backend."""

import json
import os
from decimal import Decimal

import boto3
from botocore.exceptions import BotoCoreError, ClientError


# Custom JSON encoder to handle DynamoDB Decimal types
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


# AWS DynamoDB Resource setup
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TABLE_NAME", "krishna-tuition-table")
table = dynamodb.Table(TABLE_NAME)


def build_response(status_code, body):
    """Return standard API Gateway proxy response with CORS enabled."""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Content-Type": "application/json",
        },
        "body": json.dumps(body, cls=DecimalEncoder),
    }


def lambda_handler(event, _context):
    """Main Lambda entry point triggered by API Gateway."""
    http_method = event.get("httpMethod", "")

    if http_method == "OPTIONS":
        return build_response(200, {"message": "CORS preflight successful"})

    try:
        if http_method == "GET":
            response = table.scan()
            items = response.get("Items", [])
            return build_response(200, {"students": items})

        if http_method in ("POST", "PUT"):
            payload = json.loads(event.get("body", "{}"))
            student_id = payload.get("id")

            if not student_id:
                return build_response(400, {"error": "Missing student ID"})

            table.put_item(Item=payload)
            msg = "Student registered" if http_method == "POST" else "Record updated"
            return build_response(200, {"message": msg, "student": payload})

        return build_response(405, {"error": f"Method {http_method} not allowed"})

    except (ClientError, BotoCoreError, json.JSONDecodeError) as err:
        return build_response(500, {"error": str(err)})
