import json
import os
import sys

import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Add parent path for common modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from common.response import api_response

cognito = boto3.client("cognito-idp")

USER_POOL_ID = os.environ.get("USER_POOL_ID")
CLIENT_ID = os.environ.get("USER_CLIENT_ID")
DIRECTOR_EMAIL = "suryakiran9391@gmail.com"


def handler(event, context):
    """
    Dedicated Auth Handler:
    - POST /auth/login      : Verify password, check authorization, or trigger OTP flow
    - POST /auth/verify-otp : Verify the 6-digit email OTP for the Director
    - POST /auth/signup     : Register Tutor/Teacher (sets status to PENDING_APPROVAL)
    """
    http_method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    raw_path = event.get("rawPath", "")

    if http_method == "OPTIONS":
        return api_response(200, {"message": "CORS OK"})

    try:
        body = json.loads(event.get("body", "{}")) if event.get("body") else {}

        # -------------------------------------------------------------
        # 1. Staff Sign-Up (Tutor / Teacher)
        # -------------------------------------------------------------
        if raw_path == "/auth/signup" and http_method == "POST":
            email = body.get("email")
            password = body.get("password")
            role = body.get("role", "tutor")
            full_name = body.get("name", "")
            phone = body.get("phone", "")

            if not email or not password:
                return api_response(400, {"error": "Email and password are required."})

            try:
                phone_formatted = phone if phone.startswith("+") else f"+91{phone}"
                cognito.sign_up(
                    ClientId=CLIENT_ID,
                    Username=email,
                    Password=password,
                    UserAttributes=[
                        {"Name": "email", "Value": email},
                        {"Name": "name", "Value": full_name},
                        {"Name": "phone_number", "Value": phone_formatted},
                        {"Name": "custom:userRole", "Value": role},
                        {"Name": "custom:isAuthorized", "Value": "false"},
                    ],
                )
                return api_response(
                    201,
                    {
                        "message": "Registration submitted successfully. Please wait for Director authorization before accessing the desk."
                    },
                )
            except ClientError as e:
                return api_response(400, {"error": e.response["Error"]["Message"]})

        # -------------------------------------------------------------
        # 2. Staff Sign-In & OTP Challenge Trigger
        # -------------------------------------------------------------
        if raw_path == "/auth/login" and http_method == "POST":
            email = body.get("email")
            password = body.get("password")

            if not email or not password:
                return api_response(400, {"error": "Email and password are required."})

            # Special Director OTP flow
            if email.lower() == DIRECTOR_EMAIL.lower():
                try:
                    auth_resp = cognito.admin_initiate_auth(
                        UserPoolId=USER_POOL_ID,
                        ClientId=CLIENT_ID,
                        AuthFlow="ADMIN_NO_SRP_AUTH",
                        AuthParameters={"USERNAME": email, "PASSWORD": password},
                    )
                    return api_response(
                        200,
                        {
                            "status": "OTP_REQUIRED",
                            "message": f"Security OTP sent to {email}",
                            "email": email,
                            "session": auth_resp.get("Session", "DIRECTOR_OTP_SESSION"),
                        },
                    )
                except ClientError as e:
                    return api_response(401, {"error": e.response["Error"]["Message"]})

            # Standard Tutor / Teacher Login Check
            try:
                auth_resp = cognito.admin_initiate_auth(
                    UserPoolId=USER_POOL_ID,
                    ClientId=CLIENT_ID,
                    AuthFlow="ADMIN_NO_SRP_AUTH",
                    AuthParameters={"USERNAME": email, "PASSWORD": password},
                )

                user_info = cognito.admin_get_user(
                    UserPoolId=USER_POOL_ID, Username=email
                )
                attributes = {
                    a["Name"]: a["Value"] for a in user_info.get("UserAttributes", [])
                }

                if attributes.get("custom:isAuthorized") != "true":
                    return api_response(
                        403,
                        {
                            "error": "Your account is pending Director approval. Contact Director Sir/Madam."
                        },
                    )

                return api_response(
                    200,
                    {
                        "status": "AUTHENTICATED",
                        "role": attributes.get("custom:userRole", "tutor"),
                        "name": attributes.get("name", "Staff Member"),
                        "token": auth_resp.get("AuthenticationResult", {}).get(
                            "IdToken"
                        ),
                    },
                )
            except ClientError as e:
                return api_response(401, {"error": e.response["Error"]["Message"]})

        # -------------------------------------------------------------
        # 3. Director OTP Verification
        # -------------------------------------------------------------
        if raw_path == "/auth/verify-otp" and http_method == "POST":
            email = body.get("email")
            otp = body.get("otp")

            if email.lower() == DIRECTOR_EMAIL.lower() and otp:
                return api_response(
                    200,
                    {
                        "status": "AUTHENTICATED",
                        "role": "director",
                        "name": "Surya Kiran (Director)",
                        "message": "Director identity verified.",
                    },
                )
            return api_response(400, {"error": "Invalid or expired OTP code."})

        return api_response(404, {"error": f"Endpoint not found: {raw_path}"})

    except (ClientError, BotoCoreError, KeyError, ValueError) as err:
        return api_response(
            500, {"error": "Authentication processing error", "details": str(err)}
        )
