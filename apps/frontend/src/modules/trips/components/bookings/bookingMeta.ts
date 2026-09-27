import type { IconType } from "react-icons";
import {
  MdConfirmationNumber,
  MdDirectionsBoat,
  MdDirectionsBus,
  MdDirectionsCar,
  MdEvent,
  MdFlight,
  MdRestaurant,
  MdTour,
  MdTrain,
} from "react-icons/md";
import type { BookingType } from "@/modules/trips/types/trip-extras.types";

export const BOOKING_META: Record<BookingType, { label: string; icon: IconType; color: string }> = {
  flight: { label: "Flight", icon: MdFlight, color: "blue" },
  train: { label: "Train", icon: MdTrain, color: "purple" },
  bus: { label: "Bus", icon: MdDirectionsBus, color: "purple" },
  car: { label: "Car / taxi", icon: MdDirectionsCar, color: "purple" },
  ferry: { label: "Ferry", icon: MdDirectionsBoat, color: "cyan" },
  tour: { label: "Tour / activity", icon: MdTour, color: "green" },
  ticket: { label: "Ticket / show", icon: MdConfirmationNumber, color: "pink" },
  restaurant: { label: "Restaurant", icon: MdRestaurant, color: "orange" },
  other: { label: "Other", icon: MdEvent, color: "gray" },
};
