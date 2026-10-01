# Serverless Tuition & Academic Management Platform

A production-grade, multi-tier tuition management platform engineered with AWS Serverless services and standard DevOps practices.

## System Architecture

- **Frontend & Edge Delivery**: Single-page application hosted on Amazon S3 and distributed via Amazon CloudFront with Origin Access Control (OAC).
- **Identity & Access Management**: AWS Cognito User Pools with Role-Based Access Control (Director, Tutor, Teacher).
- **API & Compute Layer**: Amazon API Gateway routing to AWS Lambda microservices written in Python 3.12.
- **Database Layer**: Amazon DynamoDB using single-table design principles.
- **Media Ingestion**: Amazon S3 presigned URLs for multi-page test uploads.
- **Infrastructure as Code (IaC)**: Modular Terraform scripts.
- **CI/CD Automation**: Dual GitHub Actions workflows separating frontend static delivery from backend infrastructure updates.