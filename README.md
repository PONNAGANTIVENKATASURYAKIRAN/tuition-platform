
# Krishna Tuition Institutions - Cloud Management Platform

An enterprise serverless administration platform designed for Krishna Tuition Institutions, engineered with AWS Serverless Architecture and Infrastructure as Code.

## Architecture Highlights
- **Frontend & Edge Delivery:** Amazon S3 Origin fronted by Amazon CloudFront with Origin Access Control (OAC).
- **Authentication & Authorization:** AWS Cognito User Pool with Role-Based Access Control (Director, Tutor, Teacher).
- **API & Compute:** Amazon API Gateway routing to AWS Lambda microservices (Python 3.12).
- **Database:** Amazon DynamoDB Single-Table Design.
- **Media Ingestion:** Amazon S3 presigned PUT/GET URLs for answer sheet uploads.
- **Event Messaging:** Amazon SQS & SNS for staff verification and registration workflows.
- **Grounded AI Engine:** Amazon Bedrock RAG integration strictly answering against local DynamoDB data.
- **Infrastructure as Code (IaC):** Modular Terraform.
- **CI/CD:** Automated GitHub Actions pipeline for linting, Terraform deployment, and CloudFront cache invalidation.
EOF