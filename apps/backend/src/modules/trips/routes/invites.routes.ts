import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "@/middleware/auth.middleware";
import { inviteAccept, invitePreview } from "@/modules/trips/controllers/trip-collab.controller";

const router = Router();

// Anyone with the link can see what they're invited to; joining requires an account.
router.get("/:token", optionalAuthMiddleware, invitePreview);
router.post("/:token/accept", authMiddleware, inviteAccept);

export default router;
