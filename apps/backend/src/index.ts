import "@/lib/load-env";
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

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
