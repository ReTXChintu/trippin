export interface VehicleRentalSuggestion {
  googlePlaceId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUrl?: string;
  phone?: string;
  distanceKm?: number;
  vehicleTypes: string[];
}

export interface LegMarketGuide {
  placeId?: string;
  name: string;
  whatToBuy: string[];
}

export interface LegDestinationBrief {
  specialties: string[];
  localFood: string[];
  markets: LegMarketGuide[];
  festivals: string[];
  generalTips: string[];
  generatedAt?: string;
}
