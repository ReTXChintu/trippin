import { NextRequest } from "next/server";
import { verifyAccessToken, type JwtPayload } from "@/lib/api/jwt";
import { jsonUnauthorized } from "@/lib/api/response";

export type RouteContext = {
  params: Promise<Record<string, string>>;
};

export async function requireApiAuth(request: NextRequest): Promise<JwtPayload | Response> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return jsonUnauthorized();
  }

  const token = header.slice(7).trim();
  if (!token) {
    return jsonUnauthorized();
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    return jsonUnauthorized();
  }
}

export function isAuthResponse(value: JwtPayload | Response): value is Response {
  return value instanceof Response;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  auth: JwtPayload,
  context: RouteContext,
) => Promise<Response>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: RouteContext): Promise<Response> => {
    const authResult = await requireApiAuth(request);
    if (isAuthResponse(authResult)) {
      return authResult;
    }
    return handler(request, authResult, context);
  };
}
