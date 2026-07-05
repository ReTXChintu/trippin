import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { search, getDetailRich, getDetails } from "@/modules/places/controllers/places.controller";
import { getPhoto } from "@/modules/places/controllers/photo.controller";

const router = Router();

router.use(authMiddleware);
router.get("/search", search);
router.post("/search", getDetailRich);
router.get("/details", getDetails);
router.get("/photo", getPhoto);

export default router;
