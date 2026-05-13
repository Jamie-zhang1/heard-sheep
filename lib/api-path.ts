const DEFAULT_BASE_PATH = "/sheep";

export const APP_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || DEFAULT_BASE_PATH).replace(/\/$/, "");

export function withBasePath(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalized}`;
}

export function apiPath(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const apiRoute = normalized.startsWith("/api") ? normalized : `/api${normalized}`;
  return withBasePath(apiRoute);
}
