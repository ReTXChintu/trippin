import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import {
  getProfileHandler,
  updateProfileHandler,
  updateApiKeysHandler,
  updateAiSettingsHandler,
  listAiModelsHandler,
  googleUsageHandler,
} from "@/modules/profile/controllers/profile.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getProfileHandler);
router.patch("/", updateProfileHandler);
router.put("/api-keys", updateApiKeysHandler);
router.put("/ai-settings", updateAiSettingsHandler);
router.get("/ai-models", listAiModelsHandler);
router.get("/google-usage", googleUsageHandler);

export default router;
