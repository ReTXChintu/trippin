import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import * as trips from "@/modules/trips/controllers/trips.controller";
import * as members from "@/modules/trips/controllers/trip-members.controller";
import * as places from "@/modules/trips/controllers/trip-places.controller";
import * as stays from "@/modules/trips/controllers/trip-stays.controller";
import * as logistics from "@/modules/trips/controllers/trip-logistics.controller";
import * as collab from "@/modules/trips/controllers/trip-collab.controller";
import { tripWriteGuard } from "@/middleware/trip-write.middleware";
import {
  get as getItinerary,
  act as actItinerary,
  getRoutes as getItineraryRoutes,
  mealSuggestions as getMealSuggestions,
} from "@/modules/itinerary/controllers/itinerary.controller";

const router = Router();

router.use(authMiddleware);
// View-only members can read everything under /:id but not change it.
router.use("/:id", tripWriteGuard);

router.get("/", trips.list);
router.post("/", trips.create);
router.post("/generate-from-prompt", trips.generateFromPrompt);

router.get("/:id", trips.getById);
router.patch("/:id", trips.update);
router.delete("/:id", trips.remove);
router.delete("/:id/legs/:legId", trips.removeLeg);
router.put("/:id/legs/:legId/stays", stays.updateStays);
router.post("/:id/legs/:legId/hotels/search", stays.searchHotels);

router.post("/:id/archive", trips.archive);
router.post("/:id/duplicate", trips.duplicate);
router.post("/:id/share", trips.share);
router.delete("/:id/share", trips.unshare);
router.post("/:id/leave", members.leave);

router.get("/:id/members", members.list);
router.post("/:id/members", members.add);
router.delete("/:id/members", members.remove);
router.patch("/:id/members/:userId/role", collab.setRole);
router.post("/:id/invites", collab.invite);
router.post("/:id/votes", collab.vote);
router.get("/:id/comments", collab.comments);
router.post("/:id/comments", collab.comment);
router.delete("/:id/comments/:commentId", collab.removeComment);

router.get("/:id/places", places.list);
router.post("/:id/places", places.add);
router.delete("/:id/places", places.remove);
router.post("/:id/places/discover", places.discover);
router.post("/:id/places/from-search", places.addFromSearch);
router.post("/:id/places/vehicle-rentals", places.discoverVehicleRentals);
router.post("/:id/places/search-area", places.searchArea);

router.get("/:id/itinerary", getItinerary);
router.post("/:id/itinerary", actItinerary);
router.get("/:id/itinerary/routes", getItineraryRoutes);
router.get("/:id/itinerary/meal-suggestions", getMealSuggestions);

router.post("/:id/bookings", logistics.createBooking);
router.put("/:id/bookings/:bookingId", logistics.editBooking);
router.delete("/:id/bookings/:bookingId", logistics.deleteBooking);

router.get("/:id/checklist/suggestions", logistics.checklistSuggestions);
router.post("/:id/checklist", logistics.createChecklistItems);
router.patch("/:id/checklist/:itemId", logistics.editChecklistItem);
router.delete("/:id/checklist/:itemId", logistics.deleteChecklistItem);

router.get("/:id/budget", logistics.budget);
router.post("/:id/expenses", logistics.createExpense);
router.put("/:id/expenses/:expenseId", logistics.editExpense);
router.delete("/:id/expenses/:expenseId", logistics.deleteExpense);

router.get("/:id/weather", logistics.weather);

export default router;
