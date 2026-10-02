import json
import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Read environment variables injected by Terraform
TABLE_NAME = os.environ.get("TABLE_NAME")
BUCKET_NAME = os.environ.get("BUCKET_NAME")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME) if TABLE_NAME else None
s3_client = boto3.client("s3")


def make_response(status_code, body):
    """Utility function to format standardized HTTP responses with CORS."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "*",
        },
        "body": json.dumps(body),
    }


def handler(event, context):
    """
    Main entry point for API Gateway requests.
    Routes requests by HTTP method and path.
    """
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    raw_path = event.get("rawPath", "/")

    # Handle Preflight OPTIONS requests for CORS
    if http_method == "OPTIONS":
        return make_response(200, {"message": "CORS preflight OK"})

    try:
        # Route 1: Health check
        if raw_path == "/health" or raw_path == "/":
            return make_response(
                200,
                {
                    "status": "online",
                    "service": "tuition-platform-api",
                    "table": TABLE_NAME,
                },
            )

        # Route 2: Get all students
        if raw_path == "/students" and http_method == "GET":
            response = table.scan()
            items = response.get("Items", [])
            return make_response(200, items)

        # Route 3: Enroll / Upsert student
        if raw_path == "/students" and http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            student_id = body.get("id")
            if not student_id:
                return make_response(400, {"error": "Missing student ID"})

            item = {"PK": f"STUDENT#{student_id}", "SK": "METADATA", **body}
            table.put_item(Item=item)
            return make_response(
                201, {"message": "Student record saved successfully", "student": item}
            )

        # Route 4: Generate S3 Presigned URL for camera answer sheet uploads
        if raw_path == "/uploads/presign" and http_method == "POST":
            body = json.loads(event.get("body", "{}"))
            file_name = body.get("fileName", "test_paper.jpg")

            presigned_url = s3_client.generate_presigned_url(
                "put_object",
                Params={"Bucket": BUCKET_NAME, "Key": f"tests/{file_name}"},
                ExpiresIn=300,
            )
            return make_response(
                200, {"uploadUrl": presigned_url, "fileKey": f"tests/{file_name}"}
            )

        # Fallback 404
        return make_response(
            404, {"error": f"Route not found: {http_method} {raw_path}"}
        )

    except (BotoCoreError, ClientError, KeyError, TypeError, ValueError) as e:
        print(f"Error handling request: {e!s}")
        return make_response(500, {"error": "Internal server error", "details": str(e)})
