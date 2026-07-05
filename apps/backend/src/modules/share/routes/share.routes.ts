import { Router } from "express";
import { getSharedTrip } from "@/modules/share/controllers/share.controller";

const router = Router();

router.get("/:slug", getSharedTrip);

export default router;
