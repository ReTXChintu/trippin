import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { list, markAllRead, markRead } from "@/modules/notifications/controllers/notifications.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", list);
router.post("/", markAllRead);
router.post("/:id/read", markRead);

export default router;
