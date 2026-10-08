import logging
import os
import time
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

TABLE_NAME = os.environ.get("TABLE_NAME", "edudesk-records")
REGION = os.environ.get("REGION_NAME", "ap-south-1")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


class DB:
    @staticmethod
    def get_table() -> Any:
        return table

    @staticmethod
    def get_students_by_classes(classes: list[str]) -> list[dict[str, Any]]:
        if not classes:
            return []
        resp = table.scan(
            FilterExpression=(
                Attr("PK").begins_with("STUDENT#") & Attr("SK").eq("PROFILE")
            )
        )
        all_students = resp.get("Items", [])
        return [
            s for s in all_students if str(s.get("class")) in [str(c) for c in classes]
        ]

    @staticmethod
    def get_student_profile(student_id: str) -> dict[str, Any] | None:
        resp = table.get_item(Key={"PK": f"STUDENT#{student_id}", "SK": "PROFILE"})
        return resp.get("Item")

    @staticmethod
    def record_attendance(
        date_str: str,
        student_id: str,
        status: str,
        late_slot: str,
        marked_by: str,
        student_info: dict[str, Any],
        remarks: str = "",
    ) -> None:
        now = int(time.time())
        table.put_item(
            Item={
                "PK": f"ATTENDANCE#{date_str}",
                "SK": f"STUDENT#{student_id}",
                "status": status,
                "lateSlot": late_slot,
                "markedBy": marked_by,
                "remarks": remarks,
                "studentName": student_info.get("name")
                or f"{student_info.get('firstName', '')} {student_info.get('lastName', '')}",
                "class": student_info.get("class"),
                "school": student_info.get("school"),
                "updatedAt": now,
            }
        )

        dispatch_key = {"PK": "DISPATCH", "SK": f"MSG#{student_id}#{date_str}"}

        if status == "ABSENT":
            parent_phone = student_info.get("fatherPhone") or student_info.get(
                "motherPhone"
            )
            name = student_info.get("name") or student_info.get("firstName", "")
            reason_text = f" Reason noted: {remarks}." if remarks else ""
            msg_text = f"Namaste. Your ward {name} (Class {student_info.get('class')}) was marked absent today ({date_str}).{reason_text} Please contact the Director to confirm."
            table.put_item(
                Item={
                    **dispatch_key,
                    "type": "ABSENT_ALERT",
                    "studentId": student_id,
                    "studentName": name,
                    "class": student_info.get("class"),
                    "school": student_info.get("school"),
                    "phone": parent_phone,
                    "message": msg_text,
                    "status": "PENDING",
                    "createdAt": now,
                }
            )
        else:
            try:
                table.delete_item(Key=dispatch_key)
            except ClientError:
                pass

    @staticmethod
    def log_slip_test(
        student_id: str,
        date_str: str,
        subject: str,
        chapter: str,
        subtopic: str,
        marks_obtained: float,
        max_marks: float,
        evaluator: str,
        photos: list[str],
        confidence: int,
        remarks: str,
        send_to_parent: bool,
        student_info: dict[str, Any],
    ) -> float:
        m_obt = float(marks_obtained)
        m_max = float(max_marks)
        pct = round((m_obt / m_max) * 100, 1) if m_max > 0 else 0.0
        now = int(time.time())

        test_id = f"TEST#{date_str}#{subject}#{now}"
        table.put_item(
            Item={
                "PK": f"STUDENT#{student_id}",
                "SK": test_id,
                "id": test_id,
                "date": date_str,
                "subject": subject,
                "chapter": chapter,
                "subtopic": subtopic,
                "marksObtained": m_obt,
                "maxMarks": m_max,
                "percentage": pct,
                "evaluator": evaluator,
                "photos": photos,
                "confidence": int(confidence),
                "remarks": remarks,
                "createdAt": now,
            }
        )

        if send_to_parent:
            parent_phone = student_info.get("fatherPhone") or student_info.get(
                "motherPhone"
            )
            name = student_info.get("name") or student_info.get("firstName", "")
            msg_text = f"Slip Test Report for {name}:\nSubject: {subject}\nTopic: {chapter} ({subtopic})\nScore: {m_obt}/{m_max} ({pct}%)\nRemarks: {remarks}"
            table.put_item(
                Item={
                    "PK": "DISPATCH",
                    "SK": f"TEST#{student_id}#{now}",
                    "type": "SLIP_TEST_REPORT",
                    "studentId": student_id,
                    "studentName": name,
                    "class": student_info.get("class"),
                    "phone": parent_phone,
                    "message": msg_text,
                    "status": "PENDING",
                    "createdAt": now,
                }
            )
        return pct

    @staticmethod
    def delete_record(pk: str, sk: str) -> None:
        table.delete_item(Key={"PK": pk, "SK": sk})
