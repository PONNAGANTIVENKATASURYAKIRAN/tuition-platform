terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "ap-south-1" # Mumbai
}

variable "director_email" {
  type    = string
  default = "suryakiran9391@gmail.com"
}

variable "director_temp_pass" {
  type      = string
  default   = "Surya@9391"
  sensitive = true
}

# -----------------------------------------------------------------------------
# 1. AWS Cognito: User Pool & Client
# -----------------------------------------------------------------------------
resource "aws_cognito_user_pool" "pool" {
  name = "krishna-tuition-user-pool"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Krishna Tuitions - Verification Code"
    email_message        = "Your security passcode is {####}."
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  schema {
    attribute_data_type = "String"
    name                = "userRole"
    mutable             = true
  }

  schema {
    attribute_data_type = "String"
    name                = "isAuthorized"
    mutable             = true
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "krishna-tuition-web-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user" "main_director" {
  user_pool_id = aws_cognito_user_pool.pool.id
  username     = var.director_email

  attributes = {
    email                 = var.director_email
    email_verified        = "true"
    "custom:userRole"     = "director"
    "custom:isAuthorized" = "true"
  }

  temporary_password = var.director_temp_pass
  message_action     = "SUPPRESS"
}

# -----------------------------------------------------------------------------
# 2. DynamoDB: Single-Table Architecture
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "tuition_table" {
  name         = "krishna-tuition-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
}

# -----------------------------------------------------------------------------
# 3. IAM: Execution Role for Lambda
# -----------------------------------------------------------------------------
resource "aws_iam_role" "lambda_exec_role" {
  name = "krishna-tuition-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "lambda_policy" {
  name = "krishna-tuition-lambda-policy-v1"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.tuition_table.arn
      },
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminInitiateAuth",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.pool.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# -----------------------------------------------------------------------------
# 4. Lambda Packaging & Resource
# -----------------------------------------------------------------------------
data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend"
  output_path = "${path.module}/backend_payload.zip"
}

resource "aws_lambda_function" "backend_lambda" {
  filename         = data.archive_file.backend_zip.output_path
  function_name    = "krishna-tuition-backend-api"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "lambdas/auth.handler"
  runtime          = "python3.12"
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.tuition_table.name
      USER_POOL_ID   = aws_cognito_user_pool.pool.id
      USER_CLIENT_ID = aws_cognito_user_pool_client.client.id
      DIRECTOR_EMAIL = var.director_email
    }
  }
}

# -----------------------------------------------------------------------------
# 5. API Gateway (HTTP API v2) with Complete Edge CORS Support
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "http_api" {
  name          = "krishna-tuition-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins  = ["*"]
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers  = ["Content-Type", "Authorization", "*"]
    expose_headers = ["*"]
    max_age        = 300
  }
}

resource "aws_apigatewayv2_stage" "api_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.backend_lambda.invoke_arn
}

resource "aws_apigatewayv2_route" "default_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# -----------------------------------------------------------------------------
# 6. Outputs
# -----------------------------------------------------------------------------
output "api_endpoint" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.client.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.tuition_table.name
}