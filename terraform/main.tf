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
  type        = string
  default     = "ap-south-1" # Default AWS Mumbai region
  description = "Target AWS deployment region"
}

# 1. DynamoDB Table
resource "aws_dynamodb_table" "tuition_table" {
  name         = "tuition-app-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Project = "tuition-platform"
  }
}

# 2. S3 Bucket for Static Frontend Web Hosting
resource "aws_s3_bucket" "frontend_bucket" {
  bucket_prefix = "tuition-app-frontend-"
  force_destroy = true

  tags = {
    Project = "tuition-platform"
  }
}

resource "aws_s3_bucket_website_configuration" "frontend_hosting" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_policy" {
  depends_on = [aws_s3_bucket_public_access_block.public_access]
  bucket     = aws_s3_bucket.frontend_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })
}

# 3. IAM Role for Lambda Microservice
resource "aws_iam_role" "lambda_exec_role" {
  name = "tuition-app-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_policy" {
  name        = "tuition-app-lambda-policy"
  description = "Allows Lambda to write CloudWatch logs and access DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Effect   = "Allow"
        Resource = aws_dynamodb_table.tuition_table.arn
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

# 4. Package backend Python code into a deployment zip
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../backend/lambda_handler.py"
  output_path = "${path.module}/lambda_payload.zip"
}

# 5. AWS Lambda Function
resource "aws_lambda_function" "tuition_backend" {
  function_name    = "tuition-app-backend"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "lambda_handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 15

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.tuition_table.name
    }
  }

  tags = {
    Project = "tuition-platform"
  }
}

# 6. HTTP API Gateway & Routes
resource "aws_apigatewayv2_api" "http_api" {
  name          = "tuition-app-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "OPTIONS", "DELETE"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.tuition_backend.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "students_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /students"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tuition_backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# Outputs
output "s3_website_url" {
  description = "Frontend Public Website Endpoint"
  value       = "http://${aws_s3_bucket_website_configuration.frontend_hosting.website_endpoint}"
}

output "api_endpoint" {
  description = "Backend REST API Base URL"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}