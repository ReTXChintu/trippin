import { Box, Button, Flex, Icon, IconButton, Menu, MenuButton, MenuItem, MenuList, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FiCheck, FiClock, FiCornerUpLeft, FiFlag, FiMoreVertical, FiNavigation } from "react-icons/fi";
import { categoryIcon } from "@/components/ui/plan.utils";
import type { ItineraryStop } from "@/modules/itinerary/types";
import type { TransportationMode } from "@/types";
import { isActionable, isOpenMeal, stopSubline } from "./today.utils";

/** One stop in "Coming up" / "Earlier today": time, name, one line of context and a small actions menu. */
export function TodayStopRow({
  stop,
  mode,
  directionsUrl,
  canEdit,
  planHref,
  onMark,
}: {
  stop: ItineraryStop;
  mode: TransportationMode;
  directionsUrl?: string;
  canEdit: boolean;
  /** Where "Pick" sends you for an open meal slot. */
  planHref: string;
  onMark: (status: "done" | "skipped" | null) => void;
}) {
  const openMeal = isOpenMeal(stop) && !stop.status;
  const actionable = isActionable(stop);
  const StatusIcon = stop.status === "done" ? FiCheck : stop.status === "skipped" ? FiFlag : stop.fixedStartTime ? FiClock : categoryIcon(stop.category, stop.stopType);
  const iconColor = stop.status === "done" ? "success" : stop.fixedStartTime && !stop.status ? "accent" : "fg.muted";

  const menu =
    actionable && (canEdit || directionsUrl) ? (
      <Menu isLazy placement="bottom-end">
        <MenuButton as={IconButton} icon={<FiMoreVertical />} size="sm" variant="ghost" aria-label={`Options for ${stop.placeName}`} />
        <MenuList fontSize="sm">
          {directionsUrl && (
            <MenuItem as="a" href={directionsUrl} target="_blank" rel="noopener noreferrer" icon={<FiNavigation />}>
              Directions
            </MenuItem>
          )}
          {canEdit && stop.status !== "done" && (
            <MenuItem icon={<FiCheck />} onClick={() => onMark("done")}>
              Mark done
            </MenuItem>
          )}
          {canEdit && stop.status !== "skipped" && (
            <MenuItem icon={<FiFlag />} onClick={() => onMark("skipped")}>
              Skip
            </MenuItem>
          )}
          {canEdit && stop.status && (
            <MenuItem icon={<FiCornerUpLeft />} onClick={() => onMark(null)}>
              Back to planned
            </MenuItem>
          )}
        </MenuList>
      </Menu>
    ) : null;

  if (openMeal) {
    return (
      <Flex align="center" gap="12px" px="14px" py="10px" minH="52px" borderWidth="1px" borderStyle="dashed" borderColor="border.line" borderRadius="xl">
        <Text w="44px" flexShrink={0} fontSize="12px" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {stop.arrivalTime}
        </Text>
        <Text flex={1} minW={0} fontSize="12px" color="fg.muted" noOfLines={1}>
          {stop.placeName} · not picked yet
        </Text>
        {canEdit && (
          <Button as={RouterLink} to={planHref} variant="outline" size="md" flexShrink={0}>
            Pick
          </Button>
        )}
        {menu}
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      gap="12px"
      px="14px"
      py="12px"
      minH="60px"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.line"
      borderRadius="xl"
      opacity={stop.status ? 0.6 : 1}
    >
      <Text w="44px" flexShrink={0} fontSize="12px" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
        {stop.arrivalTime}
      </Text>
      <Box flex={1} minW={0}>
        <Text fontWeight={600} noOfLines={1} title={stop.placeName} textDecoration={stop.status === "skipped" ? "line-through" : undefined}>
          {stop.placeName}
        </Text>
        <Text fontSize="12px" color="fg.muted" noOfLines={1}>
          {stop.status === "done" ? "Done" : stop.status === "skipped" ? "Skipped" : stopSubline(stop, mode)}
        </Text>
      </Box>
      <Icon as={StatusIcon} boxSize="16px" color={iconColor} flexShrink={0} aria-hidden />
      {menu}
    </Flex>
  );
}
