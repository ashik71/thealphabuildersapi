// Resolve the base URL used to build shareable links (view-link, shareholder-view-link).
// In production this must come from FRONTEND_URL — silently falling back to localhost
// would hand out broken links to whoever the admin shares them with.
export function getFrontendUrl() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (process.env.NODE_ENV === "production") {
    throw new Error("FRONTEND_URL must be set in production");
  }
  return "http://localhost:4200";
}
