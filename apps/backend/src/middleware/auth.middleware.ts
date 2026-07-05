import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken, type JwtPayload } from "@/lib/jwt";
import { sendUnauthorized } from "@/lib/response";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  const cookieToken = req.cookies?.access_token;
  return typeof cookieToken === "string" && cookieToken ? cookieToken : null;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return sendUnauthorized(res);
  }

  try {
    req.user = await verifyAccessToken(token);
    next();
  } catch {
    return sendUnauthorized(res);
  }
}
