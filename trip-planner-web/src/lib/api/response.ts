import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonMessage(message: string, status = 200) {
  return NextResponse.json({ success: true, message }, { status });
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export function jsonUnauthorized() {
  return jsonError("Unauthorized", 401);
}

export function jsonNotFound(message = "Not found") {
  return jsonError(message, 404);
}

export type ActionLike<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export function fromActionResult<T>(result: ActionLike<T>, okStatus = 200) {
  if (!result.success) {
    const status = result.error === "Unauthorized" ? 401 : result.error.includes("not found") ? 404 : 400;
    return jsonError(result.error, status);
  }
  if (result.data !== undefined) {
    return jsonOk(result.data, okStatus);
  }
  return jsonMessage(result.message ?? "OK", okStatus);
}
