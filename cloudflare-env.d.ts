declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CRM_EVENT_SECRET?: string;
    BUCKET?: R2Bucket;
  }
}
