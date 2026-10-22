import type { Place, PlaceDetail } from "@/modules/places/types/place.types";

/** Strip Mongoose subdocument prototypes for RSC → client serialization. */
export function toPlainPlace(place: Place): Place {
  return {
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    city: place.city,
    state: place.state,
    country: place.country,
    category: place.category,
    subCategory: place.subCategory,
    coordinates: place.coordinates
      ? { lat: place.coordinates.lat, lng: place.coordinates.lng }
      : undefined,
    averageVisitDurationMinutes: place.averageVisitDurationMinutes,
    openingTime: place.openingTime,
    closingTime: place.closingTime,
    openingPeriods: place.openingPeriods
      ? place.openingPeriods.map((p) => ({
          open: { day: p.open.day, hour: p.open.hour, minute: p.open.minute },
          ...(p.close ? { close: { day: p.close.day, hour: p.close.hour, minute: p.close.minute } } : {}),
        }))
      : undefined,
    weekdayDescriptions: place.weekdayDescriptions ? [...place.weekdayDescriptions] : undefined,
    weeklyClosedDays: place.weeklyClosedDays ? [...place.weeklyClosedDays] : undefined,
    description: place.description,
    tags: place.tags ? [...place.tags] : undefined,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    imageUrl: place.imageUrl,
    priceLevel: place.priceLevel,
    recommendedVisitTime: place.recommendedVisitTime,
    bestSeason: place.bestSeason,
    entryFee: place.entryFee,
    isMustVisit: place.isMustVisit,
    source: place.source,
    formattedAddress: place.formattedAddress,
  };
}

export function toPlainPlaceDetail(detail: PlaceDetail): PlaceDetail {
  return {
    ...toPlainPlace(detail),
    priceRange: detail.priceRange,
    websiteUri: detail.websiteUri,
    googleMapsUri: detail.googleMapsUri,
    googleMapsUrl: detail.googleMapsUrl,
    googleSearchUrl: detail.googleSearchUrl,
    photoNames: detail.photoNames ? [...detail.photoNames] : undefined,
    photoUrls: detail.photoUrls ? [...detail.photoUrls] : undefined,
    reviews: detail.reviews
      ? detail.reviews.map((r) => ({
          rating: r.rating,
          text: r.text,
          authorName: r.authorName,
          relativeTime: r.relativeTime,
        }))
      : undefined,
    reviewSummary: detail.reviewSummary,
    richVersion: detail.richVersion,
  };
}

export function toPlainPlaces(places: Place[]): Place[] {
  return places.map(toPlainPlace);
}
