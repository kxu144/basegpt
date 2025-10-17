const ENV_API_BASE = import.meta.env.VITE_API_URL;
export const API_BASE = ENV_API_BASE;
if (!ENV_API_BASE) {
  // eslint-disable-next-line no-console
  console.warn("VITE_API_URL is not set; defaulting to http://127.0.0.1:8000");
}

export function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}
