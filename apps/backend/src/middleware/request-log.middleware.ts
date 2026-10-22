import type { NextFunction, Request, Response } from "express";

/** Where a finished request's line goes — PM2's log by default (it adds the timestamp). */
export type RequestLogSink = (line: string) => void;

/** Answered constantly by monitors; nothing to learn from them. */
const QUIET_PATHS = new Set(["/api/v1/health"]);

/**
 * One line per request once it has been answered: method, path, status, how long it took, who
 * (the token's subject, when signed in) and from where. Never the query string (share tokens,
 * join codes), a header or a body.
 */
export function requestLog(sink: RequestLogSink = (line) => console.log(line)) {
  return (req: Request, res: Response, next: NextFunction) => {
    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const path = req.originalUrl.split("?")[0];
      if (QUIET_PATHS.has(path)) return;
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      const user = req.user?.sub ? ` user=${req.user.sub}` : "";
      sink(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(1)}ms${user} ip=${req.ip ?? "-"}`);
    });
    next();
  };
}
