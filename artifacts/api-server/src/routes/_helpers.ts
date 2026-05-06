import type { Request } from "express";

export function getUserId(req: Request): number | null {
  const val = req.headers["x-user-id"];
  if (!val || Array.isArray(val)) return null;
  const id = parseInt(String(val), 10);
  return isNaN(id) ? null : id;
}
