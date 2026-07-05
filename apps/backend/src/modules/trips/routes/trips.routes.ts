import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import * as trips from "@/modules/trips/controllers/trips.controller";
import * as members from "@/modules/trips/controllers/trip-members.controller";
import * as places from "@/modules/trips/controllers/trip-places.controller";
import { get as getItinerary, act as actItinerary } from "@/modules/itinerary/controllers/itinerary.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", trips.list);
router.post("/", trips.create);
router.post("/generate-from-prompt", trips.generateFromPrompt);

router.get("/:id", trips.getById);
router.patch("/:id", trips.update);
router.delete("/:id", trips.remove);

router.post("/:id/archive", trips.archive);
router.post("/:id/duplicate", trips.duplicate);
router.post("/:id/share", trips.share);
router.delete("/:id/share", trips.unshare);
router.post("/:id/leave", members.leave);

router.get("/:id/members", members.list);
router.post("/:id/members", members.add);
router.delete("/:id/members", members.remove);

router.get("/:id/places", places.list);
router.post("/:id/places", places.add);
router.delete("/:id/places", places.remove);
router.post("/:id/places/discover", places.discover);
router.post("/:id/places/from-search", places.addFromSearch);

router.get("/:id/itinerary", getItinerary);
router.post("/:id/itinerary", actItinerary);

export default router;
