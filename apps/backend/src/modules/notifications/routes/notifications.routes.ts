import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { addDevice, list, markAllRead, markRead, removeDevice } from "@/modules/notifications/controllers/notifications.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", list);
router.post("/", markAllRead);
router.post("/:id/read", markRead);
// This phone's push token (after sign-in), and dropping it (at sign-out).
router.post("/devices", addDevice);
router.delete("/devices", removeDevice);

export default router;
