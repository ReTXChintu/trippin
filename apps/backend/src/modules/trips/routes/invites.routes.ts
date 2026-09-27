import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { inviteAccept, invitePreview } from "@/modules/trips/controllers/trip-collab.controller";

const router = Router();

router.use(authMiddleware);
router.get("/:token", invitePreview);
router.post("/:token/accept", inviteAccept);

export default router;
