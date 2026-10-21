import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "@/modules/auth/routes/auth.routes";
import profileRoutes from "@/modules/profile/routes/profile.routes";
import tripsRoutes from "@/modules/trips/routes/trips.routes";
import notificationsRoutes from "@/modules/notifications/routes/notifications.routes";
import placesRoutes from "@/modules/places/routes/places.routes";
import shareRoutes from "@/modules/share/routes/share.routes";
import dashboardRoutes from "@/modules/dashboard/routes/dashboard.routes";
import invitesRoutes from "@/modules/trips/routes/invites.routes";

/** The API, without listening — index.ts serves it, the tests mount it on a random port. */
export function createApp() {
  const app = express();

  // A reverse proxy on the same machine (nginx, Caddy) terminating TLS: trust its X-Forwarded-Proto
  // so req.secure is right and the session cookie gets the `secure` flag.
  app.set("trust proxy", "loopback");

  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get("/api/v1/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/profile", profileRoutes);
  app.use("/api/v1/trips", tripsRoutes);
  app.use("/api/v1/notifications", notificationsRoutes);
  app.use("/api/v1/places", placesRoutes);
  app.use("/api/v1/share", shareRoutes);
  app.use("/api/v1/dashboard", dashboardRoutes);
  app.use("/api/v1/invites", invitesRoutes);

  return app;
}
