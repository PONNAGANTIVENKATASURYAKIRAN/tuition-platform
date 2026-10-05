import json
import logging
import os
import time
import zipfile

import boto3
from botocore.exceptions import ClientError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

REGION = "ap-south-1"
APP_NAME = "edudesk"
DIRECTOR_EMAIL = "suryakiran9391@gmail.com"
DIRECTOR_PASS = "Surya@9391"
DIRECTOR_PIN = "939100"

iam = boto3.client("iam", region_name=REGION)
dynamodb = boto3.client("dynamodb", region_name=REGION)
cognito = boto3.client("cognito-idp", region_name=REGION)
lambda_client = boto3.client("lambda", region_name=REGION)
apigw = boto3.client("apigatewayv2", region_name=REGION)
sts = boto3.client("sts", region_name=REGION)


def setup_iam_role(role_name: str) -> str:
    logger.info("Configuring IAM Execution Role: %s", role_name)
    assume_role_doc = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    try:
        iam_resp = iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_doc),
        )
        role_arn = iam_resp["Role"]["Arn"]
    except ClientError as err:
        if err.response["Error"]["Code"] == "EntityAlreadyExists":
            role_arn = iam.get_role(RoleName=role_name)["Role"]["Arn"]
        else:
            raise

    policies = [
        "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    ]
    for p in policies:
        try:
            iam.attach_role_policy(RoleName=role_name, PolicyArn=p)
        except ClientError:
            pass

    bedrock_policy_doc = {
        "Version": "2012-10-17",
        "Statement": [
            {"Effect": "Allow", "Action": ["bedrock:InvokeModel*"], "Resource": "*"}
        ],
    }
    try:
        iam.put_role_policy(
            RoleName=role_name,
            PolicyName="EduDeskBedrockAccess",
            PolicyDocument=json.dumps(bedrock_policy_doc),
        )
    except ClientError:
        pass

    time.sleep(12)
    return role_arn


def package_zip() -> bytes:
    zip_path = "backend_payload.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk("backend"):
            for file in files:
                if "__pycache__" in root or file.endswith(".pyc"):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, "backend")
                z.write(full_path, rel_path)
    with open(zip_path, "rb") as f:
        return f.read()


def wait_for_lambda(fn_name: str) -> None:
    for _ in range(30):
        try:
            res = lambda_client.get_function(FunctionName=fn_name)
            state = res["Configuration"].get("LastUpdateStatus", "Successful")
            if state == "Successful":
                return
        except ClientError:
            pass
        time.sleep(1)


def deploy_lambda(
    fn_name: str,
    handler_path: str,
    role_arn: str,
    zip_bytes: bytes,
    env_vars: dict[str, str],
) -> str:
    logger.info("Deploying Lambda: %s (%s)", fn_name, handler_path)
    for attempt in range(1, 9):
        try:
            res = lambda_client.create_function(
                FunctionName=fn_name,
                Runtime="python3.12",
                Role=role_arn,
                Handler=handler_path,
                Code={"ZipFile": zip_bytes},
                Timeout=25,
                Environment={"Variables": env_vars},
            )
            time.sleep(2)
            return res["FunctionArn"]
        except ClientError as err:
            err_code = err.response["Error"]["Code"]
            if err_code == "InvalidParameterValueException":
                time.sleep(5 * attempt)
                continue
            if err_code == "ResourceConflictException":
                wait_for_lambda(fn_name)
                lambda_client.update_function_code(
                    FunctionName=fn_name, ZipFile=zip_bytes
                )
                wait_for_lambda(fn_name)
                lambda_client.update_function_configuration(
                    FunctionName=fn_name, Environment={"Variables": env_vars}
                )
                wait_for_lambda(fn_name)
                return lambda_client.get_function(FunctionName=fn_name)[
                    "Configuration"
                ]["FunctionArn"]
            raise


def setup_api_gateway(routes: dict[str, str], account_id: str) -> str:
    api_name = f"{APP_NAME}-api"
    apis = apigw.get_apis()["Items"]
    api_id = next((a["ApiId"] for a in apis if a["Name"] == api_name), None)

    if not api_id:
        api_res = apigw.create_api(
            Name=api_name,
            ProtocolType="HTTP",
            CorsConfiguration={
                "AllowOrigins": ["*"],
                "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "AllowHeaders": ["Content-Type", "Authorization", "*"],
            },
        )
        api_id = api_res["ApiId"]
        api_endpoint = api_res["ApiEndpoint"]
    else:
        api_endpoint = next(a["ApiEndpoint"] for a in apis if a["ApiId"] == api_id)

    try:
        apigw.create_stage(ApiId=api_id, StageName="$default", AutoDeploy=True)
    except ClientError:
        pass

    for prefix, fn_arn in routes.items():
        int_res = apigw.create_integration(
            ApiId=api_id,
            IntegrationType="AWS_PROXY",
            IntegrationUri=fn_arn,
            PayloadFormatVersion="2.0",
        )
        int_id = int_res["IntegrationId"]
        route_key = f"ANY /{prefix}/{{proxy+}}" if prefix != "$default" else "$default"
        try:
            apigw.create_route(
                ApiId=api_id, RouteKey=route_key, Target=f"integrations/{int_id}"
            )
        except ClientError:
            pass

        fn_name = fn_arn.split(":")[-1]
        try:
            lambda_client.add_permission(
                FunctionName=fn_name,
                StatementId=f"apigw-{prefix}",
                Action="lambda:InvokeFunction",
                Principal="apigateway.amazonaws.com",
                SourceArn=f"arn:aws:execute-api:{REGION}:{account_id}:{api_id}/*/*",
            )
        except ClientError:
            pass

    return api_endpoint


def main() -> None:
    logger.info("--- Deploying Tuition Desk Cloud Infrastructure ---")
    account_id = sts.get_caller_identity()["Account"]
    table_name = f"{APP_NAME}-records"
    role_name = f"{APP_NAME}-lambda-role"

    role_arn = setup_iam_role(role_name)

    env_vars = {
        "TABLE_NAME": table_name,
        "DIRECTOR_PASS": DIRECTOR_PASS,
        "REGION_NAME": REGION,
    }

    zip_bytes = package_zip()

    auth_arn = deploy_lambda(
        f"{APP_NAME}-fn-auth", "lambdas/auth.handler", role_arn, zip_bytes, env_vars
    )
    tutor_arn = deploy_lambda(
        f"{APP_NAME}-fn-tutor", "lambdas/tutor.handler", role_arn, zip_bytes, env_vars
    )
    director_arn = deploy_lambda(
        f"{APP_NAME}-fn-director",
        "lambdas/director.handler",
        role_arn,
        zip_bytes,
        env_vars,
    )
    ai_arn = deploy_lambda(
        f"{APP_NAME}-fn-ai", "lambdas/ai.handler", role_arn, zip_bytes, env_vars
    )

    routes = {
        "auth": auth_arn,
        "tutor": tutor_arn,
        "director": director_arn,
        "ai": ai_arn,
        "$default": tutor_arn,
    }

    endpoint = setup_api_gateway(routes, account_id)

    print("\n================ DEPLOYMENT COMPLETED ================")
    print(f"API Endpoint : {endpoint}")
    print("======================================================\n")


if __name__ == "__main__":
    main()
