import type { Response } from "express";

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

function statusForError(error: string): number {
  if (error === "Unauthorized") return 401;
  if (error.toLowerCase().includes("not found")) return 404;
  return 400;
}

export function sendOk<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function sendMessage(res: Response, message: string, status = 200) {
  return res.status(status).json({ success: true, message });
}

export function sendError(res: Response, error: string, status = 400) {
  return res.status(status).json({ success: false, error });
}

export function sendUnauthorized(res: Response) {
  return sendError(res, "Unauthorized", 401);
}

export function sendResult<T>(res: Response, result: ActionResult<T>, okStatus = 200) {
  if (!result.success) {
    return sendError(res, result.error, statusForError(result.error));
  }
  if (result.data !== undefined) {
    return sendOk(res, result.data, okStatus);
  }
  return sendOk(res, { message: result.message ?? "OK" }, okStatus);
}
