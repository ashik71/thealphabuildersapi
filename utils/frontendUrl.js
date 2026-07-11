// Base URL used to build shareable links (view-link, shareholder-view-link).
// Mirrors how the frontend hardcodes apiBase in environment.prod.ts — no env
// var to set on Render, no restart-to-pick-up-changes gotcha.
const PRODUCTION_FRONTEND_URL = "https://thealphabuildersportal.onrender.com";

export function getFrontendUrl() {
  return process.env.FRONTEND_URL || PRODUCTION_FRONTEND_URL;
}
