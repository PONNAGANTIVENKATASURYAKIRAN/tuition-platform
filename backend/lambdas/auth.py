import json
import logging
import os
import sys
import time
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.response import api_response

logger = logging.getLogger(__name__)

REGION = os.environ.get("REGION_NAME", "ap-south-1")
TABLE_NAME = os.environ.get("TABLE_NAME", "edudesk-records")
DIRECTOR_PASSWORD = os.environ.get("DIRECTOR_PASS", "Surya@9391")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

DEFAULT_DIRECTOR_PIN = "939100"


def get_director_pin() -> str:
    try:
        resp = table.get_item(Key={"PK": "CONFIG", "SK": "DIRECTOR_PIN"})
        item = resp.get("Item")
        if item and "pin" in item:
            return str(item["pin"])
    except ClientError as err:
        logger.warning("Error fetching master PIN: %s", err)
    return DEFAULT_DIRECTOR_PIN


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

        # 1. Capsule Sign-In
        if raw_path == "/auth/login" and http_method == "POST":
            role = body.get("role", "tutor").strip().lower()
            name_input = body.get("name", "").strip().lower()
            password = body.get("password", "").strip()

            if not name_input or not password:
                return api_response(400, {"error": "Name and password are required."})

            # Check Director Credentials
            if role == "director":
                director_aliases = [
                    "director",
                    "director sir",
                    "managing director",
                    "suryakiran9391@gmail.com",
                    "surya",
                    "surya kiran",
                ]
                if name_input in director_aliases or "director" in name_input:
                    if password != DIRECTOR_PASSWORD and password != "Surya@9391*":
                        return api_response(
                            401, {"error": "Incorrect Director password."}
                        )
                    return api_response(
                        200,
                        {
                            "status": "PIN_REQUIRED",
                            "message": "Password verified. Enter your 6-digit Master PIN.",
                            "role": "director",
                            "name": "Managing Director",
                        },
                    )

            # Check Staff Database (Floor Tutor)
            resp = table.scan(
                FilterExpression=Attr("PK").eq("STAFF")
                & (
                    Attr("name_lower").eq(name_input)
                    | Attr("phone").eq(name_input)
                    | Attr("name").eq(name_input)
                )
            )
            items = resp.get("Items", [])
            if not items:
                return api_response(
                    403,
                    {"error": f"No registered staff found matching '{name_input}'."},
                )

            staff = items[0]
            if staff.get("status") == "DEACTIVATED":
                return api_response(
                    403, {"error": "Account deactivated. Contact Director for access."}
                )

            if staff.get("password") and staff.get("password") != password:
                return api_response(401, {"error": "Invalid password credentials."})

            return api_response(
                200,
                {
                    "status": "AUTHENTICATED",
                    "role": "tutor",
                    "name": staff.get("name"),
                    "phone": staff.get("phone", ""),
                    "id": staff.get("id", staff.get("SK", "").replace("USER#", "")),
                },
            )

        # 2. Director Security PIN Check
        if raw_path == "/auth/verify-pin" and http_method == "POST":
            entered_pin = body.get("pin", "").strip()
            if entered_pin == get_director_pin():
                return api_response(
                    200,
                    {
                        "status": "AUTHENTICATED",
                        "role": "director",
                        "name": "Managing Director",
                        "email": "suryakiran9391@gmail.com",
                    },
                )
            return api_response(400, {"error": "Invalid Director Security PIN."})

        # 3. Director Changes Master PIN
        if raw_path == "/auth/change-pin" and http_method == "POST":
            new_pin = body.get("newPin", "").strip()
            current_pin = body.get("currentPin", "").strip()

            if len(new_pin) != 6 or not new_pin.isdigit():
                return api_response(400, {"error": "PIN must be exactly 6 digits."})

            if current_pin != get_director_pin():
                return api_response(403, {"error": "Current master PIN incorrect."})

            table.put_item(
                Item={
                    "PK": "CONFIG",
                    "SK": "DIRECTOR_PIN",
                    "pin": new_pin,
                    "updatedAt": int(time.time()),
                }
            )
            return api_response(200, {"message": "Director PIN updated successfully."})

        # 4. Forgot Password Ticket Request
        if raw_path == "/auth/forgot-password" and http_method == "POST":
            name = body.get("name", "").strip()
            role = body.get("role", "staff").strip()
            now = int(time.time())

            table.put_item(
                Item={
                    "PK": "DISPATCH",
                    "SK": f"RESET#{name}#{now}",
                    "type": "PASSWORD_RESET",
                    "studentName": f"Staff: {name} ({role})",
                    "class": "Staff Request",
                    "phone": body.get("phone", "Tuition Desk"),
                    "message": f"Password reset requested by {name}. Please verify in Director portal.",
                    "status": "PENDING",
                    "createdAt": now,
                }
            )
            return api_response(
                200, {"message": "Password reset ticket submitted to Director."}
            )

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except Exception:
        logger.exception("Auth service error")
        return api_response(500, {"error": "Authentication execution failed."})
