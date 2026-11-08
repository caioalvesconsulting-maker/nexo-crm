declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CRM_AUTOMATION_SERVICE_ENABLED?: string;
    CRM_AUTOMATION_SCHEDULE_ACTIVE?: string;
    CRM_EVENT_SECRET?: string;
    INSTAGRAM_APP_SECRET?: string;
    INSTAGRAM_ACCOUNTS_JSON?: string;
    BUCKET?: R2Bucket;
  }
}
