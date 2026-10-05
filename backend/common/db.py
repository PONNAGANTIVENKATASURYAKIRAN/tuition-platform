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
    ) -> None:
        now = int(time.time())
        table.put_item(
            Item={
                "PK": f"ATTENDANCE#{date_str}",
                "SK": f"STUDENT#{student_id}",
                "status": status,
                "lateSlot": late_slot,
                "markedBy": marked_by,
                "studentName": student_info.get("name"),
                "class": student_info.get("class"),
                "school": student_info.get("school"),
                "updatedAt": now,
            }
        )

        dispatch_key = {"PK": "DISPATCH", "SK": f"MSG#{student_id}#{date_str}"}

        if status == "ABSENT":
            parent_phone = (
                student_info.get("primaryPhone")
                or student_info.get("fatherPhone")
                or student_info.get("motherPhone")
            )
            msg_text = (
                f"Namaste. Your ward {student_info.get('name')} "
                f"(Class {student_info.get('class')}) has not arrived at tuition "
                f"today ({date_str}). Please contact Director desk to confirm their safety."
            )
            table.put_item(
                Item={
                    **dispatch_key,
                    "type": "ABSENT_ALERT",
                    "studentId": student_id,
                    "studentName": student_info.get("name"),
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
            except ClientError as err:
                logger.warning("Queue cleanup skipped: %s", err)

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

        table.put_item(
            Item={
                "PK": f"STUDENT#{student_id}",
                "SK": f"TEST#{date_str}#{subject}#{now}",
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
            parent_phone = (
                student_info.get("primaryPhone")
                or student_info.get("fatherPhone")
                or student_info.get("motherPhone")
            )
            msg_text = (
                f"Weekly Slip Test Report for {student_info.get('name')}:\n"
                f"Subject: {subject}\n"
                f"Topic: {chapter} ({subtopic})\n"
                f"Score: {m_obt}/{m_max} ({pct}%)\n"
                f"Evaluator: {evaluator}\n"
                f"Remarks: {remarks}"
            )
            table.put_item(
                Item={
                    "PK": "DISPATCH",
                    "SK": f"TEST#{student_id}#{now}",
                    "type": "SLIP_TEST_REPORT",
                    "studentId": student_id,
                    "studentName": student_info.get("name"),
                    "class": student_info.get("class"),
                    "phone": parent_phone,
                    "message": msg_text,
                    "status": "PENDING",
                    "createdAt": now,
                }
            )
        return pct

    @staticmethod
    def get_upcoming_exams(classes: list[str]) -> list[dict[str, Any]]:
        today_epoch = int(time.time())
        three_days_epoch = today_epoch + (3 * 86400)
        resp = table.scan(FilterExpression=Attr("PK").begins_with("EXAM#"))
        items = resp.get("Items", [])
        upcoming = []
        for itm in items:
            exam_epoch = int(itm.get("dateEpoch", 0))
            is_matching = str(itm.get("class")) in [str(c) for c in classes]
            if is_matching and (today_epoch <= exam_epoch <= three_days_epoch):
                days_left = max(1, round((exam_epoch - today_epoch) / 86400))
                itm["daysLeft"] = days_left
                upcoming.append(itm)
        return upcoming
