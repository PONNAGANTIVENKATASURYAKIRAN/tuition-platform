import json
import os
import boto3
from decimal import Decimal


# Helper class to convert Decimal types to standard JSON numbers
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)


# AWS DynamoDB Resource setup
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TABLE_NAME", "tuition-app-table")
table = dynamodb.Table(TABLE_NAME)


# Standard response helper with CORS enabled for frontend calls
def build_response(status_code, body):
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


def lambda_handler(event, context):
    """
    Main Lambda entry point triggered by API Gateway
    """
    http_method = event.get("httpMethod", "")
    path = event.get("path", "")

    # Handle HTTP OPTIONS requests for CORS pre-flight checks
    if http_method == "OPTIONS":
        return build_response(200, {"message": "CORS preflight successful"})

    try:
        # Route 1: GET /students -> List all students
        if http_method == "GET":
            response = table.scan()
            items = response.get("Items", [])
            return build_response(200, {"students": items})

        # Route 2: POST /students -> Enroll a new student
        elif http_method == "POST":
            payload = json.loads(event.get("body", "{}"))
            student_id = payload.get("id")

            if not student_id:
                return build_response(400, {"error": "Missing student ID"})

            table.put_item(Item=payload)
            return build_response(
                201, {"message": "Student registered successfully", "student": payload}
            )

        # Route 3: PUT /students -> Update attendance or tests
        elif http_method == "PUT":
            payload = json.loads(event.get("body", "{}"))
            student_id = payload.get("id")

            if not student_id:
                return build_response(400, {"error": "Missing student ID for update"})

            table.put_item(Item=payload)
            return build_response(
                200, {"message": "Record updated successfully", "student": payload}
            )

        else:
            return build_response(405, {"error": f"Method {http_method} not allowed"})

    except Exception as err:
        return build_response(500, {"error": str(err)})
