/**
 * Drag board: a tray of places on the left and one column per day. Drag a place onto a day, reorder a
 * day, move a stop to another day, or drag it back to the tray to unschedule it. Purely presentational
 * — the parent turns each drop (`onMove`) into whatever it means (a server action on the Plan tab, a
 * local merge on the Compare page). Shows the move straight away and holds it until `onMove` settles.
 */
import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Flex, HStack, Icon, Input, InputGroup, InputLeftElement, Spinner, Text } from "@chakra-ui/react";
import { type ReactNode, useMemo, useState } from "react";
import { LuGripVertical, LuInbox, LuLock, LuSearch, LuTrainFront } from "react-icons/lu";
import { DayBadge, WarnDot } from "@/components/ui";
import { categoryIcon } from "@/components/ui/plan.utils";

export type BoardItemKind = "stop" | "meal" | "place";

export interface BoardItem {
  /** Unique across the whole board (prefix it, e.g. `stop:…`, `place:…`). */
  id: string;
  kind: BoardItemKind;
  title: string;
  /** "10:53" — shown on scheduled stops. */
  time?: string;
  /** Second line: "Fort · 2 h 30". */
  subtitle?: string;
  category?: string;
  /** City the place belongs to — columns of other cities dim while it's dragged. */
  city?: string;
  locked?: boolean;
  /** Small tag on the right ("AI", "Didn't fit"). */
  tag?: string;
  draggable: boolean;
}

export interface BoardColumn {
  key: string;
  dayNumber: number;
  /** "Mon 5 Oct" */
  dateLabel: string;
  city?: string;
  /** "4 stops · 10:53–21:02" */
  summary?: string;
  items: BoardItem[];
  /** Travel days etc. can't take places. */
  droppable: boolean;
  /** Fixed marker above the items (e.g. "Travel to Udaipur"). */
  marker?: string;
  warning?: boolean;
}

export interface BoardTray {
  title: string;
  hint?: string;
  items: BoardItem[];
  /** Dropping a scheduled stop here unschedules it. */
  acceptsDrop: boolean;
  emptyText?: string;
}

export interface BoardMove {
  itemId: string;
  /** "tray" or a column key. */
  from: string;
  to: string;
  /** Position in the target column (among its items). */
  index: number;
  /** The target column's item ids in their new order. */
  order: string[];
}

interface PlanBoardProps {
  tray: BoardTray;
  columns: BoardColumn[];
  onMove: (move: BoardMove) => void | Promise<unknown>;
  readOnly?: boolean;
  /** Shown above the columns (e.g. help text). */
  header?: ReactNode;
}

const TRAY = "tray";
const colId = (key: string) => `col:${key}`;

// ---------------------------------------------------------------------------------------------
// Cards

function ItemCard({ item, dragging, overlay }: { item: BoardItem; dragging?: boolean; overlay?: boolean }) {
  const isMeal = item.kind === "meal";
  return (
    <Flex
      align="center"
      gap={2}
      px={2.5}
      py={2}
      borderWidth="1px"
      borderStyle={isMeal ? "dashed" : "solid"}
      borderColor={overlay ? "accent" : "border.line"}
      borderRadius="md"
      bg={isMeal ? "transparent" : "bg.surface"}
      boxShadow={overlay ? "raised" : undefined}
      opacity={dragging ? 0.35 : 1}
      cursor={item.draggable ? "grab" : "default"}
      minW={0}
    >
      {item.draggable && <Icon as={LuGripVertical} boxSize="14px" color="fg.muted" flexShrink={0} />}
      <Flex
        w="28px"
        h="28px"
        borderRadius="8px"
        bg={isMeal ? "bg.subtle" : "accent.soft"}
        color={isMeal ? "fg.muted" : "accent.text"}
        align="center"
        justify="center"
        flexShrink={0}
      >
        <Icon as={categoryIcon(item.category, isMeal ? "meal" : undefined)} boxSize="14px" />
      </Flex>
      <Box flex={1} minW={0}>
        <HStack spacing={1.5} minW={0}>
          {item.time && (
            <Text fontSize="12px" fontWeight={600} color="fg.muted" flexShrink={0} sx={{ fontVariantNumeric: "tabular-nums" }}>
              {item.time}
            </Text>
          )}
          <Text fontSize="13px" fontWeight={isMeal ? 500 : 600} color={isMeal ? "fg.muted" : "fg.default"} noOfLines={1}>
            {item.title}
          </Text>
          {item.locked && <Icon as={LuLock} boxSize="12px" color="accent.text" flexShrink={0} aria-label="Locked" />}
        </HStack>
        {item.subtitle && (
          <Text fontSize="12px" color="fg.muted" noOfLines={1}>
            {item.subtitle}
          </Text>
        )}
      </Box>
      {item.tag && (
        <Text fontSize="11px" fontWeight={600} color="accent.text" bg="accent.soft" px={1.5} borderRadius="full" flexShrink={0}>
          {item.tag}
        </Text>
      )}
    </Flex>
  );
}

function SortableCard({ item, disabled }: { item: BoardItem; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: disabled || !item.draggable });
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-roledescription={item.draggable ? "Draggable place" : undefined}
      aria-label={item.draggable ? `${item.title} — press space to pick up` : item.title}
    >
      <ItemCard item={item} dragging={isDragging} />
    </Box>
  );
}

function DropArea({ id, children, enabled, highlight, ...rest }: { id: string; children: ReactNode; enabled: boolean; highlight: boolean } & Record<string, unknown>) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !enabled });
  return (
    <Flex
      ref={setNodeRef}
      direction="column"
      gap={1.5}
      p={2}
      minH="96px"
      borderRadius="lg"
      bg={isOver && enabled ? "accent.soft" : highlight ? "bg.subtle" : "transparent"}
      outline={isOver && enabled ? "2px dashed" : undefined}
      outlineColor="accent"
      transition="background .12s"
      {...rest}
    >
      {children}
    </Flex>
  );
}

// ---------------------------------------------------------------------------------------------
// Board

export function PlanBoard({ tray, columns, onMove, readOnly, header }: PlanBoardProps) {
  const [override, setOverride] = useState<Record<string, string[]> | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ container: string; index: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const itemsById = useMemo(() => {
    const map = new Map<string, BoardItem>();
    for (const i of tray.items) map.set(i.id, i);
    for (const c of columns) for (const i of c.items) map.set(i.id, i);
    return map;
  }, [tray.items, columns]);

  const base = useMemo(() => {
    const out: Record<string, string[]> = { [TRAY]: tray.items.map((i) => i.id) };
    for (const c of columns) out[colId(c.key)] = c.items.map((i) => i.id);
    return out;
  }, [tray.items, columns]);

  const containers = override ?? base;
  const droppable = (container: string) =>
    container === TRAY ? tray.acceptsDrop || origin?.container === TRAY : (columns.find((c) => colId(c.key) === container)?.droppable ?? false);

  const findContainer = (id: string) => (id in containers ? id : Object.keys(containers).find((k) => containers[k].includes(id)));

  const active = activeId ? itemsById.get(activeId) : undefined;

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const id = String(a.id);
    const container = findContainer(id);
    if (!container) return;
    setActiveId(id);
    setOrigin({ container, index: containers[container].indexOf(id) });
    setOverride(containers);
  };

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    if (!over) return;
    const id = String(a.id);
    const overId = String(over.id);
    const from = findContainer(id);
    const to = findContainer(overId);
    if (!from || !to || from === to || !droppable(to)) return;
    setOverride((prev) => {
      const cur = prev ?? containers;
      const toItems = cur[to];
      let at = toItems.length;
      if (overId !== to) {
        const overIndex = toItems.indexOf(overId);
        const translated = a.rect.current.translated;
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        at = overIndex >= 0 ? overIndex + (below ? 1 : 0) : toItems.length;
      }
      return { ...cur, [from]: cur[from].filter((x) => x !== id), [to]: [...toItems.slice(0, at), id, ...toItems.slice(at)] };
    });
  };

  const reset = () => {
    setActiveId(null);
    setOrigin(null);
    setOverride(null);
  };

  const onDragEnd = async ({ active: a, over }: DragEndEvent) => {
    const id = String(a.id);
    const start = origin;
    setActiveId(null);
    if (!over || !start || !override) return reset();
    let current = override;
    const container = findContainer(id);
    const overContainer = findContainer(String(over.id));
    if (!container) return reset();
    if (overContainer === container && String(over.id) !== container) {
      const oldIndex = current[container].indexOf(id);
      const newIndex = current[container].indexOf(String(over.id));
      if (oldIndex !== newIndex && newIndex >= 0) current = { ...current, [container]: arrayMove(current[container], oldIndex, newIndex) };
    }
    const index = current[container].indexOf(id);
    // Back where it started, or shuffled inside the tray: nothing to do.
    if ((container === start.container && index === start.index) || (container === TRAY && start.container === TRAY)) return reset();
    setOverride(current);
    setSaving(true);
    try {
      await onMove({
        itemId: id,
        from: start.container === TRAY ? TRAY : start.container.slice(4),
        to: container === TRAY ? TRAY : container.slice(4),
        index,
        order: current[container],
      });
    } finally {
      setSaving(false);
      reset();
    }
  };

  const trayIds = containers[TRAY].filter((id) => {
    if (!query.trim()) return true;
    const item = itemsById.get(id);
    return item ? `${item.title} ${item.city ?? ""} ${item.category ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()) : true;
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={reset}>
      {(header || saving) && (
        <HStack mb={3} spacing={2} minH="20px">
          <Box flex={1}>{header}</Box>
          {saving && (
            <HStack spacing={1.5} fontSize="12px" color="fg.muted" flexShrink={0}>
              <Spinner size="xs" />
              <Text>Saving…</Text>
            </HStack>
          )}
        </HStack>
      )}
      <Flex direction={{ base: "column", lg: "row" }} gap={4} align="stretch" minW={0}>
        {/* Tray */}
        <Flex
          role="region"
          aria-label={tray.title}
          direction="column"
          w={{ base: "full", lg: "280px" }}
          flexShrink={0}
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.line"
          borderRadius="xl"
          maxH={{ base: "320px", lg: "calc(100vh - 220px)" }}
          position={{ lg: "sticky" }}
          top={{ lg: "140px" }}
          alignSelf="flex-start"
        >
          <Box px={3} pt={3} pb={2}>
            <HStack justify="space-between">
              <Text fontWeight={600}>{tray.title}</Text>
              <Text fontSize="12px" color="fg.muted">
                {containers[TRAY].length}
              </Text>
            </HStack>
            {tray.hint && (
              <Text fontSize="12px" color="fg.muted" mt={0.5}>
                {tray.hint}
              </Text>
            )}
            {tray.items.length > 6 && (
              <InputGroup size="sm" mt={2}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={LuSearch} color="fg.muted" />
                </InputLeftElement>
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter places" aria-label="Filter places" borderRadius="md" />
              </InputGroup>
            )}
          </Box>
          <Box overflowY="auto" flex={1} minH={0}>
            <SortableContext id={TRAY} items={trayIds} strategy={verticalListSortingStrategy}>
              <DropArea id={TRAY} enabled={tray.acceptsDrop} highlight={Boolean(active) && active?.kind === "stop" && tray.acceptsDrop}>
                {trayIds.length === 0 ? (
                  <Flex direction="column" align="center" justify="center" gap={1.5} py={6} color="fg.muted" textAlign="center">
                    <Icon as={LuInbox} boxSize="20px" />
                    <Text fontSize="12px">{active?.kind === "stop" && tray.acceptsDrop ? "Drop here to unschedule" : (tray.emptyText ?? "Everything is on a day.")}</Text>
                  </Flex>
                ) : (
                  trayIds.map((id) => {
                    const item = itemsById.get(id);
                    return item ? <SortableCard key={id} item={item} disabled={Boolean(readOnly)} /> : null;
                  })
                )}
              </DropArea>
            </SortableContext>
          </Box>
        </Flex>

        {/* Day columns */}
        <Box flex={1} minW={0}>
          <Flex gap={3} overflowX="auto" pb={3} align="flex-start" sx={{ scrollSnapType: { base: "x mandatory", lg: "none" } }}>
            {columns.map((col) => {
              const ids = containers[colId(col.key)] ?? [];
              const dim = Boolean(active?.city && col.city && active.city !== col.city);
              return (
                <Flex
                  key={col.key}
                  role="group"
                  aria-label={`Day ${col.dayNumber}, ${col.dateLabel}`}
                  direction="column"
                  w={{ base: "82vw", sm: "260px" }}
                  flexShrink={0}
                  bg="bg.surface"
                  borderWidth="1px"
                  borderColor="border.line"
                  borderRadius="xl"
                  opacity={active && (!col.droppable || dim) ? 0.55 : 1}
                  transition="opacity .15s"
                  sx={{ scrollSnapAlign: "start" }}
                >
                  <HStack spacing={2.5} px={3} pt={3} pb={2} align="center">
                    <DayBadge dayNumber={col.dayNumber} size={32} />
                    <Box minW={0} flex={1}>
                      <HStack spacing={1.5}>
                        <Text fontWeight={600} fontSize="14px" noOfLines={1}>
                          {col.dateLabel}
                        </Text>
                        {col.warning && <WarnDot />}
                      </HStack>
                      <Text fontSize="12px" color="fg.muted" noOfLines={1}>
                        {[col.city, col.summary].filter(Boolean).join(" · ")}
                      </Text>
                    </Box>
                  </HStack>
                  {col.marker && (
                    <HStack mx={3} mb={1} spacing={1.5} fontSize="12px" color="fg.muted">
                      <Icon as={LuTrainFront} boxSize="13px" />
                      <Text noOfLines={1}>{col.marker}</Text>
                    </HStack>
                  )}
                  <SortableContext id={colId(col.key)} items={ids} strategy={verticalListSortingStrategy}>
                    <DropArea id={colId(col.key)} enabled={col.droppable && !readOnly} highlight={false}>
                      {ids.length === 0 && (
                        <Flex align="center" justify="center" minH="72px" borderWidth="1px" borderStyle="dashed" borderColor="border.line" borderRadius="md" color="fg.muted" fontSize="12px" textAlign="center" px={3}>
                          {col.droppable ? "Drop places here" : "Travel day"}
                        </Flex>
                      )}
                      {ids.map((id) => {
                        const item = itemsById.get(id);
                        return item ? <SortableCard key={id} item={item} disabled={Boolean(readOnly)} /> : null;
                      })}
                    </DropArea>
                  </SortableContext>
                </Flex>
              );
            })}
          </Flex>
        </Box>
      </Flex>
      <DragOverlay dropAnimation={null}>{active ? <ItemCard item={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
