// Central Free-Tier & White-Label Configuration
window.APP_CONFIG = {
  institutionName: "Krishna Tuition Institutions",
  tagline: "Official Academic Supervision & Outbound Communication Portal",
  directors: [
    { id: "dir_sir", name: "Director Sir", phone: "8008717360" },
    { id: "dir_madam", name: "Director Madam", phone: "9848123450" }
  ],
  workingDaysPerMonth: 26,
  apiEndpoint: "https://api.tuitionplatform.internal/v1", // Dynamically populated by Terraform output
  awsRegion: "ap-south-1",
  bedrockModelId: "anthropic.claude-3-haiku-20240307-v1:0"
};