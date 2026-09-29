import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  LuArrowRight,
  LuCheck,
  LuClock,
  LuEllipsis,
  LuEye,
  LuFlag,
  LuGripVertical,
  LuHeart,
  LuInfo,
  LuLock,
  LuLockOpen,
  LuMessageSquare,
  LuPencil,
  LuSkipForward,
  LuTrainFront,
  LuTrash2,
  LuTriangleAlert,
  LuUndo2,
  LuUtensils,
} from "react-icons/lu";
import type { ItineraryDay, ItineraryStop, MealType } from "@/modules/itinerary/types";
import { gapBefore } from "@/modules/itinerary/utils/plan.utils";
import { useMealSuggestionsQuery } from "@/modules/itinerary/hooks/useItinerary";
import { PhotoFallback, Pill } from "@/components/ui";
import { dayToken } from "@/components/ui/day";
import { RingMarker, StayMarker } from "@/components/ui/plan";
import { categoryIcon, fmtDur, modeIcon, modeWord } from "@/components/ui/plan.utils";
import { VoteButton } from "@/modules/trips/components/collab/VoteButton";
import { usePlan } from "./PlanContext";

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  tiffin: "Snacks",
  dinner: "Dinner",
};

// ---------------------------------------------------------------------------------------------
// Layout pieces

/** One timeline row: time column, marker column, content. */
export function TimelineRow({
  time,
  endTime,
  marker,
  children,
  offset = 12,
}: {
  time?: string;
  endTime?: string;
  marker: ReactNode;
  children: ReactNode;
  /** Top padding of the time column so it lines up with the card's first line. */
  offset?: number;
}) {
  const { compact } = usePlan();
  return (
    <Flex align="flex-start" gap="10px">
      <Flex direction="column" w={compact ? "44px" : "52px"} flexShrink={0} textAlign="right" pt={`${offset}px`}>
        {time && (
          <Text fontWeight={600} fontSize="13px" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {time}
          </Text>
        )}
        {endTime && !compact && (
          <Text fontSize="12px" color="fg.muted" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {endTime}
          </Text>
        )}
      </Flex>
      <Box pt={`${offset - 3}px`} flexShrink={0}>
        {marker}
      </Box>
      <Box flex={1} minW={0}>
        {children}
      </Box>
    </Flex>
  );
}

/** The dashed line between two rows, with the hop ("22 min · 9.8 km · taxi") or free time. */
function HopRow({ children }: { children?: ReactNode }) {
  const { compact } = usePlan();
  return (
    <Flex minH={children ? "30px" : "12px"} align="stretch">
      <Box w={compact ? "54px" : "62px"} flexShrink={0} />
      <Box
        w="2px"
        flexShrink={0}
        ml={compact ? "12px" : "13px"}
        mr={compact ? "15px" : "17px"}
        bgImage="repeating-linear-gradient(var(--chakra-colors-border-line) 0 4px, transparent 4px 8px)"
      />
      {children && (
        <Flex direction="column" justify="center" py="5px" gap="2px" fontSize="12px" color="fg.muted">
          {children}
        </Flex>
      )}
    </Flex>
  );
}

/** Travel line between two timeline rows, plus any free time before the stop. */
export function TravelConnector({ prev, stop }: { prev?: ItineraryStop; stop: ItineraryStop }) {
  const { trip } = usePlan();
  const gap = gapBefore(prev, stop);

  if (stop.stopType === "transfer" || (stop.travelDurationMinutes <= 0 && gap < 15)) return <HopRow />;

  const estimated = stop.travelSource === "estimate";
  const ModeIcon = modeIcon(trip.transportationMode);
  const word = modeWord(trip.transportationMode);

  return (
    <HopRow>
      {stop.travelDurationMinutes > 0 && (
        <Tooltip
          label={
            estimated
              ? "Estimated from distance — real route times need a Google Maps key (Profile)."
              : `Route by ${trip.transportationMode.toLowerCase()}`
          }
          placement="right"
          hasArrow
        >
          <HStack spacing="6px" w="fit-content">
            <Icon as={ModeIcon} boxSize="14px" />
            <Text>
              {estimated ? "~" : ""}
              {fmtDur(stop.travelDurationMinutes)}
              {stop.travelDistanceKm ? ` · ${stop.travelDistanceKm} km` : ""}
              {word ? ` · ${word}` : ""}
            </Text>
          </HStack>
        </Tooltip>
      )}
      {gap >= 15 && (
        <HStack spacing="6px">
          <Icon as={LuClock} boxSize="13px" />
          <Text fontStyle="italic">Free time · {fmtDur(gap)}</Text>
        </HStack>
      )}
    </HopRow>
  );
}

/** Start / return at the stay: dark rounded square + title + note. */
export function StayRow({ time, title, subtitle, action }: { time?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <TimelineRow time={time} marker={<StayMarker />} offset={6}>
      <Flex justify="space-between" align="center" gap={2} pt="2px" flexWrap="wrap">
        <Box minW={0}>
          <Text fontWeight={600} noOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="12px" color="fg.muted">
              {subtitle}
            </Text>
          )}
        </Box>
        {action}
      </Flex>
    </TimelineRow>
  );
}

// ---------------------------------------------------------------------------------------------
// Actions

function StopMenu({ stop, day, canOpenDetails }: { stop: ItineraryStop; day: ItineraryDay; canOpenDetails: boolean }) {
  const plan = usePlan();
  const moveTargets = plan.moveTargets(day);
  const isMeal = stop.stopType === "meal";
  return (
    <Menu isLazy placement="bottom-end">
      <MenuButton
        as={IconButton}
        aria-label={`Actions for ${stop.placeName}`}
        icon={<LuEllipsis size={16} />}
        variant="ghost"
        size="sm"
        w={plan.compact ? "36px" : "32px"}
        h={plan.compact ? "36px" : "32px"}
        color="fg.muted"
        isLoading={plan.busyStopId === stop.id}
        onClick={(e) => e.stopPropagation()}
      />
      <MenuList fontSize="13px" maxH="380px" overflowY="auto" zIndex={1500}>
        {canOpenDetails && (
          <MenuItem icon={<LuInfo />} onClick={() => plan.openDetails(stop, day)}>
            Details, photos & reviews
          </MenuItem>
        )}
        <MenuItem icon={<LuMessageSquare />} onClick={() => plan.openComments(stop)}>
          Comments{plan.commentCount(stop.id) ? ` (${plan.commentCount(stop.id)})` : ""}
        </MenuItem>
        {!plan.readOnly && (
          <>
            {isMeal && (
              <MenuItem icon={<LuUtensils />} onClick={() => plan.openMealPicker(stop, day)}>
                {stop.placeId ? "Change place" : "Pick a place"}
              </MenuItem>
            )}
            <MenuItem icon={<LuPencil />} onClick={() => plan.openEdit(stop, day)}>
              Edit time, cost & notes
            </MenuItem>
            {!isMeal && (
              <MenuItem icon={stop.locked ? <LuLockOpen /> : <LuLock />} onClick={() => plan.toggleLock(stop, day)}>
                {stop.locked ? "Unlock" : "Lock to this day"}
              </MenuItem>
            )}
            {stop.status !== "done" && (
              <MenuItem icon={<LuCheck />} onClick={() => plan.setStatus(stop, day, "done")}>
                Mark done
              </MenuItem>
            )}
            {stop.status !== "skipped" && (
              <MenuItem icon={<LuSkipForward />} onClick={() => plan.setStatus(stop, day, "skipped")}>
                Skip — re-time the rest
              </MenuItem>
            )}
            {stop.status && (
              <MenuItem icon={<LuUndo2 />} onClick={() => plan.setStatus(stop, day, null)}>
                Back to planned
              </MenuItem>
            )}
            {moveTargets.length > 0 && (
              <>
                <MenuDivider />
                <MenuGroup title="Move to">
                  {moveTargets.map((target) => (
                    <MenuItem key={target.dayNumber} pl={6} onClick={() => plan.moveStop(stop, day, target.dayNumber)}>
                      {target.label}
                    </MenuItem>
                  ))}
                </MenuGroup>
              </>
            )}
            <MenuDivider />
            <MenuItem icon={<LuTrash2 />} color="danger" onClick={() => plan.removeStop(stop, day)}>
              Remove from this day
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  );
}

function MoveToDayButton({ stop, day, onDone }: { stop: ItineraryStop; day: ItineraryDay; onDone?: () => void }) {
  const plan = usePlan();
  const targets = plan.moveTargets(day);
  if (targets.length === 0) return null;
  return (
    <Menu isLazy placement="bottom-start">
      <MenuButton as={Button} variant="outline" leftIcon={<LuArrowRight size={16} />}>
        Move to day…
      </MenuButton>
      <MenuList fontSize="13px" maxH="320px" overflowY="auto" zIndex={1500}>
        {targets.map((t) => (
          <MenuItem
            key={t.dayNumber}
            onClick={() => {
              plan.moveStop(stop, day, t.dayNumber);
              onDone?.();
            }}
          >
            {t.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}

/** Plan actions shown in the stop's details modal: Edit time & cost, Lock, Move to day…. */
export function StopQuickActions({ stop, day, onDone }: { stop: ItineraryStop; day: ItineraryDay; onDone: () => void }) {
  const plan = usePlan();
  if (plan.readOnly) return null;
  return (
    <Flex gap={2} flexWrap="wrap">
      <Button
        variant="outline"
        leftIcon={<LuPencil size={16} />}
        onClick={() => {
          onDone();
          plan.openEdit(stop, day);
        }}
      >
        Edit time & cost
      </Button>
      {stop.stopType !== "meal" && (
        <Button
          variant="outline"
          leftIcon={stop.locked ? <LuLockOpen size={16} /> : <LuLock size={16} />}
          onClick={() => plan.toggleLock(stop, day)}
          isLoading={plan.busyStopId === stop.id}
        >
          {stop.locked ? "Unlock" : "Lock"}
        </Button>
      )}
      <MoveToDayButton stop={stop} day={day} onDone={onDone} />
    </Flex>
  );
}

/** The action row under the selected stop. */
function StopActionRow({ stop, day, canOpenDetails }: { stop: ItineraryStop; day: ItineraryDay; canOpenDetails: boolean }) {
  const plan = usePlan();
  return (
    <>
      <Divider borderColor="border.line" mt="10px" mb="8px" />
      <Flex gap="6px" flexWrap="wrap" onClick={(e) => e.stopPropagation()}>
        {canOpenDetails && (
          <Button variant="outline" leftIcon={<LuEye size={16} />} onClick={() => plan.openDetails(stop, day)}>
            Details
          </Button>
        )}
        {plan.readOnly ? (
          <Button variant="outline" leftIcon={<LuMessageSquare size={16} />} onClick={() => plan.openComments(stop)}>
            Comment
          </Button>
        ) : (
          <>
            <Button variant="outline" leftIcon={<LuPencil size={16} />} onClick={() => plan.openEdit(stop, day)}>
              Edit time & cost
            </Button>
            <Button
              variant="outline"
              leftIcon={stop.locked ? <LuLockOpen size={16} /> : <LuLock size={16} />}
              onClick={() => plan.toggleLock(stop, day)}
              isLoading={plan.busyStopId === stop.id}
            >
              {stop.locked ? "Unlock" : "Lock"}
            </Button>
            <MoveToDayButton stop={stop} day={day} />
            <Button variant="danger" leftIcon={<LuTrash2 size={16} />} onClick={() => plan.removeStop(stop, day)}>
              Remove
            </Button>
          </>
        )}
      </Flex>
    </>
  );
}

function CommentButton({ stop }: { stop: ItineraryStop }) {
  const plan = usePlan();
  const n = plan.commentCount(stop.id);
  return (
    <Tooltip label="Comments" hasArrow openDelay={300}>
      <Button
        size="sm"
        h="32px"
        variant="ghost"
        color="fg.muted"
        leftIcon={<LuMessageSquare size={16} />}
        iconSpacing={n > 0 ? "4px" : 0}
        minW="auto"
        px={2}
        fontSize="12px"
        onClick={(e) => {
          e.stopPropagation();
          plan.openComments(stop);
        }}
        aria-label={`Comments on ${stop.placeName}${n ? `, ${n}` : ""}`}
      >
        {n || ""}
      </Button>
    </Tooltip>
  );
}

function DragHandle({ listeners, attributes }: { listeners?: object; attributes?: object }) {
  return (
    <Box
      {...attributes}
      {...listeners}
      cursor="grab"
      color="fg.muted"
      _hover={{ color: "fg.default" }}
      display="flex"
      alignItems="center"
      aria-label="Drag to reorder"
      title="Drag to reorder"
      onClick={(e) => e.stopPropagation()}
      flexShrink={0}
    >
      <Icon as={LuGripVertical} boxSize="16px" />
    </Box>
  );
}

// ---------------------------------------------------------------------------------------------
// Rows

interface StopRowProps {
  stop: ItineraryStop;
  day: ItineraryDay;
  /** Number shown in the dot for visits (matches the map pin). */
  visitNumber?: number;
  draggable: boolean;
}

function isInteractiveTarget(e: React.MouseEvent): boolean {
  return Boolean((e.target as HTMLElement).closest("button, a, input, [role='menuitem'], [role='menu']"));
}

export function StopRow({ stop, day, visitNumber, draggable }: StopRowProps) {
  const plan = usePlan();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id, disabled: !draggable });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const handle = draggable ? <DragHandle listeners={listeners} attributes={attributes} /> : null;

  let content: ReactNode;
  if (stop.stopType === "return") {
    content = <StayRow time={stop.arrivalTime} title={stop.placeName.startsWith("Return") ? stop.placeName.replace(/^Return to /, "Return · ") : `Return · ${stop.placeName}`} subtitle="Back at your stay" />;
  } else if (stop.stopType === "transfer") {
    content = <TransferRow stop={stop} day={day} />;
  } else if (stop.status) {
    content = <StatusRow stop={stop} day={day} />;
  } else if (stop.stopType === "meal") {
    content = <MealBlock stop={stop} day={day} handle={handle} />;
  } else {
    content = <VisitRow stop={stop} day={day} visitNumber={visitNumber} handle={handle} />;
  }

  return (
    <Box
      ref={setNodeRef}
      data-stop-id={stop.id}
      scrollMarginTop="140px"
      scrollMarginBottom="200px"
      style={style}
      opacity={isDragging ? 0.5 : 1}
      position="relative"
      zIndex={isDragging ? 2 : undefined}
      onMouseEnter={() => stop.coordinates && plan.setHighlightedStopId(stop.id)}
      onMouseLeave={() => plan.setHighlightedStopId(null)}
    >
      {content}
    </Box>
  );
}

function TransferRow({ stop, day }: { stop: ItineraryStop; day: ItineraryDay }) {
  return (
    <TimelineRow time={stop.arrivalTime} endTime={stop.departureTime} marker={<StayMarker icon={LuTrainFront} bg={dayToken(day.dayNumber)} color="pin.fg" />} offset={10}>
      <Box bg="bg.subtle" borderRadius="xl" px={3} py="10px">
        <Text fontWeight={600}>{stop.placeName}</Text>
        <Text fontSize="12px" color="fg.muted">
          {stop.notes ? `${stop.notes} · ` : ""}
          {fmtDur(stop.visitDurationMinutes)}
        </Text>
      </Box>
    </TimelineRow>
  );
}

/** A stop marked done / skipped while travelling. */
function StatusRow({ stop, day }: { stop: ItineraryStop; day: ItineraryDay }) {
  const plan = usePlan();
  const done = stop.status === "done";
  return (
    <TimelineRow time={stop.arrivalTime} marker={<Box w={plan.compact ? "26px" : "28px"} />} offset={10}>
      <Flex align="center" gap="10px" bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" px={3} py="10px" opacity={0.75}>
        {done ? (
          <Flex w="26px" h="26px" borderRadius="full" bg="success" color="accent.fg" align="center" justify="center" flexShrink={0}>
            <Icon as={LuCheck} boxSize="14px" />
          </Flex>
        ) : (
          <Flex w="26px" h="26px" borderRadius="full" borderWidth="2px" borderColor="fg.muted" color="fg.muted" align="center" justify="center" flexShrink={0}>
            <Icon as={LuFlag} boxSize="12px" />
          </Flex>
        )}
        <Text fontWeight={600} flex={1} minW={0} noOfLines={1} textDecoration={done ? "line-through" : undefined} color={done ? undefined : "fg.muted"}>
          {stop.placeName}
        </Text>
        <Pill tone={done ? "success" : "neutral"}>{done ? "Done" : "Skipped"}</Pill>
        <StopMenu stop={stop} day={day} canOpenDetails={Boolean(stop.placeId)} />
      </Flex>
    </TimelineRow>
  );
}

function VisitRow({ stop, day, visitNumber, handle }: { stop: ItineraryStop; day: ItineraryDay; visitNumber?: number; handle: ReactNode }) {
  const plan = usePlan();
  const selected = plan.selectedStopId === stop.id;
  const hovered = plan.highlightedStopId === stop.id;
  const canOpenDetails = Boolean(stop.placeId);
  const CatIcon = categoryIcon(stop.category, stop.stopType);
  const hoursClosed = stop.openingHoursToday === "Closed";
  const showCategory = stop.category && stop.category !== "Transfer";
  const votes = stop.placeId ? (plan.trip.placeVotes?.[stop.placeId]?.length ?? 0) : 0;

  const marker = (
    <Flex
      w={plan.compact ? "26px" : "28px"}
      h={plan.compact ? "26px" : "28px"}
      borderRadius="full"
      bg={dayToken(day.dayNumber)}
      color="pin.fg"
      align="center"
      justify="center"
      fontWeight={700}
      fontSize={plan.compact ? "12px" : "13px"}
      flexShrink={0}
    >
      {visitNumber ?? "•"}
    </Flex>
  );

  const extras = (
    <>
      {stop.warnings?.map((warning) => (
        <HStack key={warning} spacing="6px" mt={1} fontSize="12px" color="warn" align="start">
          <Icon as={LuTriangleAlert} boxSize="13px" mt="2px" />
          <Text>{warning}</Text>
        </HStack>
      ))}
      {stop.aiNotes && (
        <Text fontSize="12px" color="fg.muted" mt="6px" fontStyle="italic">
          {stop.aiNotes}
        </Text>
      )}
      {stop.notes && (
        <Text fontSize="12px" mt="6px" whiteSpace="pre-wrap">
          {stop.notes}
        </Text>
      )}
    </>
  );

  return (
    <TimelineRow time={stop.arrivalTime} endTime={stop.departureTime !== stop.arrivalTime ? stop.departureTime : undefined} marker={marker}>
      <Box
        bg="bg.surface"
        borderWidth={selected ? "1.5px" : "1px"}
        borderColor={selected ? "accent" : hovered ? "fg.muted" : "border.line"}
        boxShadow={selected ? "0 0 0 3px var(--chakra-colors-accent-soft), var(--chakra-shadows-raised)" : undefined}
        borderRadius="xl"
        px={3}
        py="10px"
        minH={plan.compact ? "64px" : undefined}
        cursor="pointer"
        transition="border-color .15s, box-shadow .15s"
        onClick={(e) => {
          if (isInteractiveTarget(e)) return;
          plan.selectStop(selected ? null : stop, day);
        }}
        aria-expanded={selected}
      >
        {plan.compact ? (
          <>
            <Flex align="center" gap={2}>
              <Text fontWeight={600} flex={1} minW={0} noOfLines={1} title={stop.placeName}>
                {stop.placeName}
              </Text>
              {stop.locked && <Icon as={LuLock} boxSize="13px" color="accent" aria-label="Locked" />}
              <Box mr="-8px" my="-6px">
                <StopMenu stop={stop} day={day} canOpenDetails={canOpenDetails} />
              </Box>
            </Flex>
            <HStack spacing="10px" fontSize="12px" color="fg.muted" mt={1} flexWrap="wrap">
              <Text>
                {showCategory ? `${stop.category} · ` : ""}
                {stop.fixedStartTime ? "fixed start" : fmtDur(stop.visitDurationMinutes)}
              </Text>
              {stop.placeId && (
                <HStack spacing="4px" color="danger">
                  <Icon as={LuHeart} boxSize="12px" />
                  <Text>{votes}</Text>
                </HStack>
              )}
              {hoursClosed && <Text color="danger">Closed today</Text>}
            </HStack>
            {extras}
          </>
        ) : (
          <>
            <Flex align="center" gap="10px">
              {handle}
              <PhotoFallback seed={stop.placeName} icon={CatIcon} w="52px" h="52px" borderRadius="10px" flexShrink={0} aria-hidden />
              <Box flex={1} minW={0}>
                <HStack spacing={2} minW={0}>
                  <Text fontWeight={600} fontSize="15px" noOfLines={1} title={stop.placeName}>
                    {stop.placeName}
                  </Text>
                  {stop.locked && (
                    <Tooltip label="Locked — replanning keeps it on this day" hasArrow>
                      <span>
                        <Icon as={LuLock} boxSize="13px" color="accent" aria-label="Locked" />
                      </span>
                    </Tooltip>
                  )}
                  {stop.fixedStartTime && <Icon as={LuClock} boxSize="13px" color="accent" aria-label="Fixed time" />}
                </HStack>
                <Flex gap={2} fontSize="12px" color="fg.muted" align="center" flexWrap="wrap" mt="2px">
                  {showCategory && (
                    <HStack spacing="4px">
                      <Icon as={CatIcon} boxSize="13px" />
                      <Text>{stop.category}</Text>
                    </HStack>
                  )}
                  {showCategory && <Text>·</Text>}
                  <Text>{fmtDur(stop.visitDurationMinutes)}</Text>
                  {stop.fixedStartTime && <Pill tone="warn">Fixed {stop.fixedStartTime}</Pill>}
                  {stop.userAdded && !stop.fixedStartTime && <Pill>Added by you</Pill>}
                  {stop.openingHoursToday && (
                    <Text color={hoursClosed ? "danger" : undefined}>· {hoursClosed ? "Closed today" : `Open ${stop.openingHoursToday}`}</Text>
                  )}
                </Flex>
              </Box>
              <HStack spacing="2px" flexShrink={0}>
                {stop.placeId && <VoteButton trip={plan.trip} placeId={stop.placeId} />}
                <CommentButton stop={stop} />
                <StopMenu stop={stop} day={day} canOpenDetails={canOpenDetails} />
              </HStack>
            </Flex>
            {extras}
          </>
        )}
        {selected && <StopActionRow stop={stop} day={day} canOpenDetails={canOpenDetails} />}
      </Box>
    </TimelineRow>
  );
}

/** Meal slot: dashed placeholder with suggestions, or the picked restaurant. */
function MealBlock({ stop, day, handle }: { stop: ItineraryStop; day: ItineraryDay; handle: ReactNode }) {
  const plan = usePlan();
  const meal = MEAL_LABELS[stop.mealType ?? "lunch"];
  const picked = Boolean(stop.placeId);
  const hints = !picked && !plan.readOnly && plan.mealHints(day);
  const suggestions = useMealSuggestionsQuery(plan.trip.id, day.dayNumber, stop.id, hints);
  const list = suggestions.data?.suggestions ?? [];
  const nearby = list.filter((s) => s.source === "nearby" && s.openAtMealTime !== false).slice(0, 2);
  const saved = list.filter((s) => s.source === "saved").length;
  const marker = <RingMarker icon={LuUtensils} size={plan.compact ? 26 : 28} />;

  if (picked) {
    return (
      <TimelineRow time={stop.arrivalTime} marker={marker} offset={10}>
        <Flex align="center" gap="10px" bg="bg.surface" borderWidth="1px" borderColor="border.line" borderRadius="xl" px={3} py="10px">
          {!plan.compact && handle}
          <Box flex={1} minW={0}>
            <Text
              fontWeight={600}
              noOfLines={1}
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
              onClick={() => plan.openDetails(stop, day)}
            >
              {meal} · {stop.placeName}
            </Text>
            <Text fontSize="12px" color="fg.muted">
              Picked · {fmtDur(stop.visitDurationMinutes)}
              {stop.openingHoursToday ? ` · ${stop.openingHoursToday === "Closed" ? "closed today" : `open ${stop.openingHoursToday}`}` : ""}
            </Text>
          </Box>
          {!plan.readOnly && (
            <Button variant="ghost" onClick={() => plan.openMealPicker(stop, day)}>
              Change
            </Button>
          )}
          <StopMenu stop={stop} day={day} canOpenDetails />
        </Flex>
      </TimelineRow>
    );
  }

  const anchor = suggestions.data?.anchorLabel;
  return (
    <TimelineRow time={plan.compact ? undefined : stop.arrivalTime} marker={plan.compact ? <Box w="26px" /> : marker} offset={10}>
      <Flex direction="column" gap={plan.compact ? "6px" : 2} borderWidth="1.5px" borderStyle="dashed" borderColor="border.line" borderRadius="xl" px={3} py="10px">
        <Flex align="center" gap="10px" flexWrap={plan.compact ? "wrap" : "nowrap"}>
          <Box flex={1} minW={0}>
            <Text fontWeight={600}>{plan.compact ? `${meal} · ${stop.arrivalTime}` : meal}</Text>
            <Text fontSize="12px" color="fg.muted">
              {plan.compact
                ? "Not picked yet"
                : anchor
                  ? `Around ${stop.arrivalTime} · ${anchor}${list.length ? `, ${list.length} place${list.length === 1 ? "" : "s"} nearby` : ""}`
                  : `Placeholder · around ${stop.arrivalTime} · choose a place`}
            </Text>
          </Box>
          {!plan.readOnly && (
            <Button leftIcon={<LuUtensils size={16} />} onClick={() => plan.openMealPicker(stop, day)} h={plan.compact ? "40px" : undefined}>
              Pick a place
            </Button>
          )}
          {!plan.compact && !plan.readOnly && <StopMenu stop={stop} day={day} canOpenDetails={false} />}
        </Flex>
        {!plan.compact && (nearby.length > 0 || saved > 0) && (
          <Flex gap="6px" flexWrap="wrap">
            {nearby.map((s) => (
              <SuggestionChip
                key={s.googlePlaceId}
                onClick={() => plan.chooseMeal(stop, day, s.googlePlaceId, s.name)}
                soft
                label={`Plan ${s.name} for ${meal.toLowerCase()}`}
              >
                {s.name}
                {s.distanceKm !== undefined ? ` · ${s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m` : `${s.distanceKm} km`}` : ""}
              </SuggestionChip>
            ))}
            {saved > 0 && (
              <SuggestionChip onClick={() => plan.openMealPicker(stop, day, "saved")} icon={LuHeart} label={`Saved restaurants (${saved})`}>
                Saved ({saved})
              </SuggestionChip>
            )}
          </Flex>
        )}
      </Flex>
    </TimelineRow>
  );
}

function SuggestionChip({ children, onClick, soft, icon, label }: { children: ReactNode; onClick: () => void; soft?: boolean; icon?: IconType; label: string }) {
  return (
    <Flex
      as="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      align="center"
      gap="6px"
      h="32px"
      px={3}
      borderRadius="full"
      borderWidth="1px"
      borderColor={soft ? "transparent" : "border.line"}
      bg={soft ? "accent.soft" : "bg.surface"}
      color={soft ? "accent.text" : "fg.default"}
      fontSize="13px"
      fontWeight={500}
      whiteSpace="nowrap"
      _hover={{ filter: "brightness(.97)" }}
    >
      {icon && <Icon as={icon} boxSize="14px" />}
      {children}
    </Flex>
  );
}
