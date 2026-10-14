export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  defaultTenantId: process.env.DEFAULT_TENANT_ID || 'tenant-default',

  aiPlatform: {
    url: process.env.AI_PLATFORM_URL || '',
    apiKey: process.env.AI_PLATFORM_API_KEY || '',
    timeoutMs: parseInt(process.env.AI_PLATFORM_TIMEOUT_MS || '10000', 10),
    applicationId:
      process.env.AI_PLATFORM_APPLICATION_ID || 'ai-rag-quality-ops',
  },

  modelRegression: {
    url: process.env.MODEL_REGRESSION_SERVICE_URL || '',
    apiKey: process.env.MODEL_REGRESSION_SERVICE_API_KEY || '',
    timeoutMs: parseInt(
      process.env.MODEL_REGRESSION_SERVICE_TIMEOUT_MS || '8000',
      10,
    ),
  },

  notificationService: {
    url: process.env.NOTIFICATION_SERVICE_URL || '',
    apiKey: process.env.NOTIFICATION_SERVICE_API_KEY || '',
    timeoutMs: parseInt(
      process.env.NOTIFICATION_SERVICE_TIMEOUT_MS || '5000',
      10,
    ),
    recipientEmail:
      process.env.NOTIFICATION_ALERT_RECIPIENT_EMAIL ||
      'ops-alerts@example.com',
  },

  safety: {
    allowedDomains: (process.env.ALLOWED_EXTERNAL_SOURCE_DOMAINS || '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean),
    maxDocSizeBytes: parseInt(
      process.env.MAX_DOCUMENT_SIZE_BYTES || '5242880',
      10,
    ),
    freshnessTimeoutMs: parseInt(
      process.env.FRESHNESS_CHECK_TIMEOUT_MS || '5000',
      10,
    ),
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '120', 10),
  },
});
