/** Trippin' printable itinerary — a self-contained HTML page (Trippin colours and fonts) that the
 * browser saves as a PDF. Pure: everything it shows is passed in. */
import { fmtDur, modeWord } from "@/components/ui/plan.utils";
import { DAY_COLORS_LIGHT } from "@/lib/theme";
import type { MealSuggestion } from "@/modules/itinerary/api/itinerary.api";
import type { Itinerary, ItineraryDay, ItineraryStop, MealType } from "@/modules/itinerary/types";
import { dayTripName } from "@/modules/itinerary/utils/route-insights";
import type { Place } from "@/modules/places/types/place.types";
import type { Trip } from "@/modules/trips/types/trip.types";
import type { DayWeather } from "@/modules/trips/types/trip-extras.types";

export interface ItineraryPdfData {
  trip: Trip;
  itinerary: Itinerary;
  /** By date. */
  weather: Map<string, DayWeather>;
  /** Picked places by Google id — for fees and weekly hours. */
  places: Map<string, Place>;
  /** Unpicked meal stop id → nearby ideas. */
  mealIdeas: Map<string, MealSuggestion[]>;
  logoUrl: string;
}

const MEAL_LABELS: Record<MealType, string> = { breakfast: "Breakfast", lunch: "Lunch", tiffin: "Snacks", dinner: "Dinner" };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function fmtDate(date: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", opts);
}

const isVisit = (s: ItineraryStop) => !["meal", "return", "transfer"].includes(s.stopType ?? "") && Boolean(s.placeName);
const text = (s: ItineraryStop, p?: Place) => `${s.category ?? ""} ${p?.category ?? ""} ${(p?.tags ?? []).join(" ")} ${s.placeName}`.toLowerCase();

/** The fee to show: the AI's estimate, then Google's, then a careful guess for places that are free
 * by custom (temples, ghats, markets). */
function entryFee(stop: ItineraryStop, place: Place | undefined): { value: string; guessed?: boolean } {
  if (stop.visitIntel?.entryFee) return { value: stop.visitIntel.entryFee };
  const t = text(stop, place);
  if (place?.entryFee && !/temple|worship|mandir|church|mosque|gurudwara/.test(t)) return { value: place.entryFee };
  if (/temple|worship|mandir|church|mosque|masjid|gurudwara|dargah/.test(t)) return { value: "Usually free (special darshan may be paid)", guessed: true };
  if (/ghat|sangam|chhatri|river/.test(t)) return { value: "Free", guessed: true };
  if (/market|bazaar|bazar|shopping|food|street|dukan|sublocality|square|chowk/.test(t)) return { value: "Free to walk around", guessed: true };
  if (/water ?fall|park|garden|lake|nature|view ?point/.test(t)) return { value: "Free or a small fee", guessed: true };
  return { value: "Not listed — check at the gate", guessed: true };
}

/** Hours on that date: the planner's value, else the place's weekly line for that weekday. */
function hoursOn(stop: ItineraryStop, place: Place | undefined, date: string): string | undefined {
  if (stop.openingHoursToday) return stop.openingHoursToday;
  const weekday = fmtDate(date, { weekday: "long" });
  const line = place?.weekdayDescriptions?.find((l) => l.startsWith(weekday));
  return line ? line.slice(weekday.length + 1).trim() : undefined;
}

/** The AI's outfit note, or one built from the day's places and weather. */
function outfitFor(day: ItineraryDay, weather: DayWeather | undefined, places: Map<string, Place>): string | undefined {
  if (day.dressCode) return day.dressCode;
  const visits = day.stops.filter(isVisit);
  if (visits.length === 0) return undefined;
  const all = visits.map((s) => text(s, places.get(s.placeId))).join(" ");
  const tips: string[] = [];
  if (/temple|worship|mandir|mosque|gurudwara|church|dargah/.test(all))
    tips.push("Modest clothes that cover shoulders and knees, and slip-on footwear — shoes come off at temples");
  else tips.push("Comfortable clothes and good walking shoes");
  if (/water ?fall|trek|hill|nature|valley/.test(all)) tips.push("shoes with good grip for wet rocks");
  if (weather) {
    if (weather.tempMaxC >= 32) tips.push("light cotton, a cap, sunscreen and a water bottle");
    else if (weather.tempMaxC >= 26) tips.push("breathable fabrics");
    if (weather.tempMinC <= 15) tips.push("a light jacket for the evening");
    if ((weather.rainChance ?? 0) >= 40 || (weather.rainMm ?? 0) >= 2) tips.push("an umbrella or rain jacket");
  }
  const [first, ...rest] = tips;
  return rest.length ? `${first}; ${rest.join(", ")}.` : `${first}.`;
}

function weatherChip(w: DayWeather | undefined): string {
  if (!w) return "";
  const rain = w.kind === "forecast" && w.rainChance !== undefined ? ` · ${w.rainChance}% rain` : "";
  const sun = w.sunrise && w.sunset ? `<div class="w-sun">↑ Sunrise ${esc(w.sunrise)} &nbsp;·&nbsp; ↓ Sunset ${esc(w.sunset)}</div>` : "";
  return `<div class="weather">
    <span class="w-icon">${esc(w.icon)}</span>
    <div><b>${Math.round(w.tempMaxC)}° / ${Math.round(w.tempMinC)}°</b> · ${esc(w.summary)}${rain}
    ${sun}
    <div class="w-kind">${w.kind === "forecast" ? "Forecast" : "Typical for these dates — the forecast appears ~2 weeks before"}</div></div>
  </div>`;
}

function travelLine(stop: ItineraryStop, trip: Trip): string {
  if (!stop.travelDurationMinutes) return "";
  const km = stop.travelDistanceKm ? ` · ${stop.travelDistanceKm < 10 ? stop.travelDistanceKm.toFixed(1) : Math.round(stop.travelDistanceKm)} km` : "";
  const how = modeWord(trip.transportationMode);
  return `<div class="row travel"><div class="time"></div><div class="rail"><span class="line"></span></div>
    <div class="travel-text">${esc(fmtDur(stop.travelDurationMinutes))}${how ? ` by ${esc(how)}` : ""}${km}</div></div>`;
}

function chip(label: string, value: string, tone = "") {
  return `<span class="chip ${tone}"><span class="chip-label">${esc(label)}</span>${esc(value)}</span>`;
}

function visitCard(stop: ItineraryStop, day: ItineraryDay, data: ItineraryPdfData, color: string, n: number): string {
  const place = data.places.get(stop.placeId);
  const hours = hoursOn(stop, place, day.date);
  const fee = entryFee(stop, place);
  const intel = stop.visitIntel;
  const chips = [
    hours ? chip("Open", hours === "Closed" ? "Closed this day" : hours, hours === "Closed" ? "danger" : "") : chip("Open", "Hours not listed", "muted"),
    chip("Entry", fee.value, fee.guessed ? "muted" : ""),
    intel?.bestTime ? chip("Best", intel.bestTime) : "",
    intel?.avoidTime ? chip("Avoid", intel.avoidTime) : "",
  ].join("");
  const hype = intel?.hypeLevel === "hidden-gem" ? `<span class="tag gem">Hidden gem</span>` : intel?.hypeLevel === "overhyped" ? `<span class="tag">Overhyped</span>` : "";
  const why = intel?.why ? `<p class="why">${esc(intel.why)}</p>` : "";
  const tips = intel?.tips?.length ? `<ul class="tips">${intel.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";
  const warn = stop.warnings?.length ? `<p class="warn">⚠ ${esc(stop.warnings.join(" · "))}</p>` : "";
  const address = place?.formattedAddress ? `<p class="addr">${esc(place.formattedAddress)}</p>` : "";
  return `<div class="row stop">
    <div class="time"><b>${esc(stop.arrivalTime)}</b><span>${esc(stop.departureTime)}</span></div>
    <div class="rail"><span class="dot" style="background:${color}">${n}</span></div>
    <div class="card">
      <div class="title"><h3>${esc(stop.placeName)}</h3>${hype}</div>
      <div class="sub">${esc(stop.arrivalTime)} – ${esc(stop.departureTime)} · ${esc(fmtDur(stop.visitDurationMinutes))}${stop.category ? ` · ${esc(stop.category)}` : ""}</div>
      ${address}
      <div class="chips">${chips}</div>
      ${why}${tips}${warn}
    </div>
  </div>`;
}

function mealCard(stop: ItineraryStop, day: ItineraryDay, data: ItineraryPdfData): string {
  const meal = MEAL_LABELS[stop.mealType ?? "lunch"];
  if (stop.placeId) {
    const place = data.places.get(stop.placeId);
    const hours = hoursOn(stop, place, day.date);
    return `<div class="row meal"><div class="time"><b>${esc(stop.arrivalTime)}</b></div><div class="rail"><span class="ring">🍽</span></div>
      <div class="card"><div class="title"><h3>${esc(meal)} · ${esc(stop.placeName)}</h3></div>
      <div class="sub">${esc(stop.arrivalTime)} – ${esc(stop.departureTime)}${hours ? ` · open ${esc(hours)}` : ""}${place?.priceLevel ? ` · ${esc(place.priceLevel)}` : ""}</div>
      ${place?.formattedAddress ? `<p class="addr">${esc(place.formattedAddress)}</p>` : ""}</div></div>`;
  }
  const ideas = (data.mealIdeas.get(stop.id) ?? []).slice(0, 3);
  const list = ideas.length
    ? `<ol class="ideas">${ideas
        .map((s) => {
          const bits = [
            s.rating ? `★ ${s.rating.toFixed(1)}${s.userRatingCount ? ` (${s.userRatingCount >= 1000 ? `${(s.userRatingCount / 1000).toFixed(1)}k` : s.userRatingCount})` : ""}` : "",
            s.cuisine ?? "",
            s.walkMinutes ? `${s.walkMinutes} min walk` : s.distanceKm ? `${s.distanceKm.toFixed(1)} km away` : "",
            s.hoursToday ? `open ${s.hoursToday}` : "",
            s.priceLevel ?? "",
          ].filter(Boolean);
          return `<li><b>${esc(s.name)}</b>${bits.length ? ` <span class="muted">· ${esc(bits.join(" · "))}</span>` : ""}${s.address ? `<div class="addr">${esc(s.address)}</div>` : ""}</li>`;
        })
        .join("")}</ol>`
    : `<p class="muted small">No suggestions saved — pick a place in Trippin.</p>`;
  return `<div class="row meal"><div class="time"><b>${esc(stop.arrivalTime)}</b></div><div class="rail"><span class="ring">🍽</span></div>
    <div class="card dashed"><div class="title"><h3>${esc(meal)}</h3><span class="tag">${ideas.length ? "Nearby ideas" : "Not picked"}</span></div>
    <div class="sub">${esc(stop.arrivalTime)} – ${esc(stop.departureTime)}</div>${list}</div></div>`;
}

function endCard(stop: ItineraryStop, label: string): string {
  return `<div class="row end"><div class="time"><b>${esc(stop.arrivalTime)}</b></div><div class="rail"><span class="ring">⌂</span></div>
    <div class="end-text">${esc(label)} <b>${esc(stop.placeName.replace(/^return to\s+/i, ""))}</b></div></div>`;
}

function dayBlock(day: ItineraryDay, idx: number, data: ItineraryPdfData): string {
  const { trip } = data;
  const color = DAY_COLORS_LIGHT[idx % DAY_COLORS_LIGHT.length];
  const leg = trip.legs.find((l) => l.id === day.legId) ?? (trip.legs.length === 1 ? trip.legs[0] : undefined);
  const trip2 = leg ? dayTripName(day, leg.dayTrips, leg.hotelCoordinates ?? null) : undefined;
  const where = trip2 ? `Day trip to ${trip2} from ${leg?.baseCity ?? day.legName ?? ""}` : day.transferLabel ?? day.legName ?? leg?.baseCity ?? "";
  const visits = day.stops.filter(isVisit);
  const km = day.stops.reduce((s, x) => s + (x.travelDistanceKm ?? 0), 0);
  const weather = data.weather.get(day.date.slice(0, 10));
  const outfit = outfitFor(day, weather, data.places);

  let n = 0;
  const rows = day.stops
    .map((stop, i) => {
      const travel = i > 0 ? travelLine(stop, trip) : "";
      if (stop.stopType === "meal") return travel + mealCard(stop, day, data);
      if (stop.stopType === "return") return travel + endCard(stop, "Back at");
      if (stop.stopType === "transfer") return travel + endCard(stop, "Travel ·");
      n += 1;
      return travel + visitCard(stop, day, data, color, n);
    })
    .join("");

  return `<section class="day">
    <header class="day-head" style="border-color:${color}">
      <div>
        <div class="day-no" style="background:${color}">Day ${day.dayNumber}</div>
        <h2>${esc(fmtDate(day.date, { weekday: "long", day: "numeric", month: "long" }))}</h2>
        <div class="day-sub">${esc(where)}${visits.length ? ` · ${visits.length} place${visits.length === 1 ? "" : "s"}` : ""}${km >= 1 ? ` · ${Math.round(km)} km on the road` : ""}</div>
      </div>
      ${weatherChip(weather)}
    </header>
    ${outfit ? `<div class="outfit"><span class="o-label">What to wear</span>${esc(outfit)}</div>` : ""}
    ${day.stops.length ? `<div class="timeline">${rows}</div>` : `<p class="muted">Free day — nothing planned.</p>`}
  </section>`;
}

export function buildItineraryPdfHtml(data: ItineraryPdfData): string {
  const { trip, itinerary } = data;
  const range = `${fmtDate(trip.startDate, { day: "numeric", month: "short" })} – ${fmtDate(trip.endDate, { day: "numeric", month: "short", year: "numeric" })}`;
  const days = itinerary.days.filter((d) => d.stops.length > 0 || d.dayType === "free");
  const stays = trip.legs.length
    ? trip.legs
        .map((l) => {
          const stay = l.stays?.[0];
          const name = stay?.name ?? l.hotelName;
          const addr = stay?.address ?? l.hotelAddress;
          return name ? `<li><b>${esc(name)}</b>${addr ? ` — ${esc(addr)}` : ""}${trip.legs.length > 1 ? ` <span class="muted">(${esc(l.name || l.baseCity)})</span>` : ""}</li>` : "";
        })
        .join("")
    : trip.hotelName
      ? `<li><b>${esc(trip.hotelName)}</b>${trip.hotelAddress ? ` — ${esc(trip.hotelAddress)}` : ""}</li>`
      : "";
  const dayTrips = trip.legs.flatMap((l) => (l.dayTrips ?? []).map((d) => `${d.name}${d.date ? ` (${fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })})` : ""}`));
  const unscheduled = itinerary.optionalPlaces.length
    ? `<section class="extra"><h2>Not fitted into a day</h2><ul>${itinerary.optionalPlaces.map((p) => `<li><b>${esc(p.placeName)}</b> <span class="muted">— ${esc(p.reason)}</span></li>`).join("")}</ul></section>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(trip.title)} — Itinerary</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 12mm 11mm; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; }
body { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-variant-numeric: tabular-nums lining-nums; color: #18191D; font-size: 11px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3 { margin: 0; }
h1, h2 { font-weight: 600; letter-spacing: -0.01em; }
.muted { color: #67686E; } .small { font-size: 10px; }
.cover { background: #F4F2EC; border: 1px solid #E2DED4; border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 7px; font-weight: 700; color: #0A6E86; font-size: 12px; letter-spacing: -.01em; }
.brand img { width: 22px; height: 22px; border-radius: 6px; }
.cover h1 { font-size: 28px; margin-top: 8px; }
.cover .meta { color: #67686E; margin-top: 3px; font-size: 12px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 12px; }
.fact { background: #fff; border: 1px solid #E2DED4; border-radius: 10px; padding: 8px 10px; }
.fact .k { font-size: 9.5px; letter-spacing: .02em; color: #4C4D53; font-weight: 600; }
.fact ul { margin: 2px 0 0; padding-left: 14px; }
.summary { margin-top: 12px; font-size: 11.5px; }
.day + .day { break-before: page; }
.day-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-left: 4px solid; padding: 2px 0 2px 12px; margin-bottom: 10px; }
.day-no { display: inline-block; color: #fff; font-weight: 600; font-size: 10px; padding: 2px 8px; border-radius: 6px; }
.day-head h2 { font-size: 20px; margin-top: 4px; }
.day-sub { color: #67686E; font-size: 11px; margin-top: 1px; }
.weather { display: flex; gap: 8px; align-items: center; background: #F4F2EC; border: 1px solid #E2DED4; border-radius: 12px; padding: 7px 11px; max-width: 46%; }
.w-icon { font-size: 20px; } .w-kind { font-size: 9px; color: #67686E; }
.w-sun { font-size: 10.5px; font-weight: 600; color: #8F5200; margin-top: 2px; }
.outfit { background: #E0F1F5; color: #0A6E86; border-radius: 10px; padding: 8px 11px; margin-bottom: 10px; }
.o-label { display: block; font-size: 9.5px; font-weight: 600; letter-spacing: .02em; margin-bottom: 1px; }
.timeline { display: flex; flex-direction: column; }
.row { display: grid; grid-template-columns: 44px 26px 1fr; gap: 8px; break-inside: avoid; }
.time { text-align: right; padding-top: 9px; font-size: 11px; } .time span { display: block; color: #67686E; font-size: 9.5px; }
.rail { position: relative; display: flex; justify-content: center; }
.rail::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 2px solid #E2DED4; }
.dot, .ring { position: relative; margin-top: 7px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; }
.ring { background: #fff; border: 2px solid #E2DED4; color: #67686E; font-size: 11px; }
.card { border: 1px solid #E2DED4; border-radius: 12px; padding: 9px 12px; margin: 4px 0; background: #fff; }
.card.dashed { border-style: dashed; background: #FAF9F5; }
.title { display: flex; align-items: center; gap: 8px; } .title h3 { font-size: 13.5px; font-weight: 700; }
.sub { color: #67686E; font-size: 10.5px; margin-top: 1px; }
.addr { color: #67686E; font-size: 9.5px; margin: 2px 0 0; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.chip { background: #ECE9E1; border-radius: 999px; padding: 2px 9px; font-size: 10px; font-weight: 500; }
.chip.muted { color: #67686E; } .chip.danger { background: #FBE5E2; color: #B3302A; }
.chip-label { font-weight: 600; margin-right: 4px; font-size: 9.5px; color: #0A6E86; }
.chip.danger .chip-label { color: #B3302A; }
.tag { font-size: 9px; font-weight: 600; background: #ECE9E1; color: #4C4D53; border-radius: 6px; padding: 1px 7px; }
.tag.gem { background: #E1F0E6; color: #15724A; }
.why { margin: 6px 0 0; font-style: italic; color: #4C4D53; }
.tips { margin: 4px 0 0; padding-left: 15px; color: #4C4D53; } .tips li { margin: 1px 0; }
.warn { margin: 5px 0 0; color: #8F5200; background: #FBEED6; border-radius: 6px; padding: 3px 7px; font-size: 10px; }
.ideas { margin: 6px 0 0; padding-left: 16px; } .ideas li { margin: 3px 0; }
.travel .travel-text { color: #67686E; font-size: 10px; padding: 3px 0; }
.travel .rail::before { border-left-style: dashed; }
.end-text { padding-top: 10px; color: #67686E; }
.extra { break-before: page; } .extra h2 { font-size: 18px; margin-bottom: 6px; }
.foot { margin-top: 16px; padding-top: 8px; border-top: 1px solid #E2DED4; color: #67686E; font-size: 9.5px; }
</style></head><body>
<div class="cover">
  <div class="brand"><img src="${esc(data.logoUrl)}" alt="">Trippin</div>
  <h1>${esc(trip.title)}</h1>
  <div class="meta">${esc(range)} · ${itinerary.days.length} day${itinerary.days.length === 1 ? "" : "s"} · ${esc([trip.destinationCity, trip.destinationState, trip.destinationCountry].filter(Boolean).join(", "))}</div>
  <div class="facts">
    ${stays ? `<div class="fact"><div class="k">Where you stay</div><ul>${stays}</ul></div>` : ""}
    ${dayTrips.length ? `<div class="fact"><div class="k">Day trips</div><ul>${dayTrips.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>` : ""}
    <div class="fact"><div class="k">Getting around</div>${esc(trip.transportationMode)}</div>
  </div>
  ${itinerary.summary ? `<p class="summary">${esc(itinerary.summary)}</p>` : ""}
</div>
${days.map((d, i) => dayBlock(d, i, data)).join("")}
${unscheduled}
<div class="foot">Made with Trippin · ${esc(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))}. Opening hours and fees change — fees marked in grey are a rough guide, so check before you go.</div>
</body></html>`;
}
