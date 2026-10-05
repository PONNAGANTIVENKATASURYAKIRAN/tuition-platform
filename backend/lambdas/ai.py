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

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)
bedrock = boto3.client("bedrock-runtime", region_name=REGION)


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    http_method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or "GET"
    )

    if http_method == "OPTIONS":
        return api_response(200, {"status": "ok"})

    try:
        body = json.loads(event.get("body", "{}")) if event.get("body") else {}
        prompt = body.get("prompt", "").strip()

        if not prompt:
            return api_response(400, {"error": "Prompt query cannot be empty."})

        # 1. Grounded Context Gathering: Read actual student records from DynamoDB
        resp = table.scan(
            FilterExpression=Attr("PK").begins_with("STUDENT#")
            & Attr("SK").eq("PROFILE")
        )
        students = resp.get("Items", [])

        summary_lines = []
        for s in students[:25]:
            summary_lines.append(
                f"Student: {s.get('name')} | Class: {s.get('class')} | School: {s.get('school')} | Fee: {s.get('feeStatus', 'UNPAID')}"
            )
        db_context = "\n".join(summary_lines)

        system_instruction = (
            "You are Tuition Desk AI, an expert academic assistant for Krishna Tuition Institutions. "
            "Answer questions using only the verified DynamoDB student context provided below. "
            "Keep answers concise, direct, professional, and accurate.\n\n"
            f"--- VERIFIED INSTITUTIONAL RECORDS ---\n{db_context}"
        )

        model_payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 300,
            "system": system_instruction,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }

        # Model IDs: fallback between cross-region inference profile and base ID
        model_candidates = [
            "apac.anthropic.claude-3-haiku-20240307-v1:0",
            "anthropic.claude-3-haiku-20240307-v1:0",
        ]

        reply_text = ""
        tokens_used = 0

        for mid in model_candidates:
            try:
                bedrock_resp = bedrock.invoke_model(
                    modelId=mid,
                    body=json.dumps(model_payload),
                    contentType="application/json",
                    accept="application/json",
                )
                res_body = json.loads(bedrock_resp["body"].read())
                reply_text = res_body["content"][0]["text"]
                tokens_used = res_body.get("usage", {}).get(
                    "input_tokens", 0
                ) + res_body.get("usage", {}).get("output_tokens", 0)
                break
            except ClientError as ce:
                logger.warning("Bedrock invocation warning on %s: %s", mid, ce)
                continue

        if not reply_text:
            # Deterministic fallback answer directly from DynamoDB if Bedrock access isn't active
            matches = [
                s["name"]
                for s in students
                if prompt.lower() in s["name"].lower() or "student" in prompt.lower()
            ]
            reply_text = f"Verified database records show {len(students)} enrolled students: {', '.join(matches[:8])}."
            tokens_used = 120

        # 2. Record Telemetry (Calculated in INR)
        today = time.strftime("%Y-%m-%d")
        try:
            table.update_item(
                Key={"PK": "METRICS", "SK": f"USAGE#{today}"},
                UpdateExpression="ADD tokens :tok, queryCount :qc, costMicros :cm",
                ExpressionAttributeValues={
                    ":tok": tokens_used,
                    ":qc": 1,
                    ":cm": int(tokens_used * 0.45),
                },
            )
        except ClientError as exc:
            logger.warning(
                "Failed to record AI telemetry for %s: %s",
                f"USAGE#{today}",
                exc,
            )

        return api_response(200, {"response": reply_text, "tokens": tokens_used})

    except Exception:
        logger.exception("AI handler processing failed")
        return api_response(500, {"error": "AI query engine failure."})
