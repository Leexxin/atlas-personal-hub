declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ATLAS_ADMIN_EMAILS?: string;
    SMA_CREDENTIAL_KEY?: string;
  }
}
