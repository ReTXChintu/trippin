import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getProfileHandler,
  updateProfileHandler,
  updateApiKeysHandler,
} from "@/modules/profile/controllers/profile.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getProfileHandler);
router.patch("/", updateProfileHandler);
router.put("/api-keys", updateApiKeysHandler);

export default router;
