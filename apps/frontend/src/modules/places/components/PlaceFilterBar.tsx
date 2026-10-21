import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Select,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { ReactNode } from "react";
import { FiChevronDown, FiFilter } from "react-icons/fi";
import { LuSparkles } from "react-icons/lu";
import { ChoiceChip } from "@/components/ui";
import { DEFAULT_QUICK_FILTERS, type PlaceQuickFilters } from "@/modules/trips/components/tabs/placeMeta";
import {
  DEFAULT_PLACE_FILTERS,
  type MinRatingFilter,
  type PlaceFilterState,
  type PlaceSortOption,
} from "@/modules/places/utils/place-filter.utils";

interface PlaceFilterBarProps {
  categories: string[];
  filters: PlaceFilterState;
  onChange: (filters: PlaceFilterState) => void;
  resultCount: number;
  totalCount: number;
  quick?: PlaceQuickFilters;
  onQuickChange?: (quick: PlaceQuickFilters) => void;
  /** Show the "AI matches" chip (only when the last discovery had AI matches). */
  showAiMatches?: boolean;
  /** Extra actions on the result-count line (select mode, add all visible). */
  actions?: ReactNode;
}

/** Chip row from the design: Category ▾, Rating 4.0+, Open now, AI matches, Voted by group, More filters. */
export function PlaceFilterBar({
  categories,
  filters,
  onChange,
  resultCount,
  totalCount,
  quick,
  onQuickChange,
  showAiMatches,
  actions,
}: PlaceFilterBarProps) {
  const q = quick ?? DEFAULT_QUICK_FILTERS;
  const setQuick = (patch: Partial<PlaceQuickFilters>) => onQuickChange?.({ ...q, ...patch });
  const moreActive = filters.nameQuery.trim() !== "" || filters.sort !== DEFAULT_PLACE_FILTERS.sort || (filters.minRating !== 0 && filters.minRating !== 4);
  const anyActive =
    filters.minRating > 0 ||
    filters.categories.length > 0 ||
    Boolean(filters.nameQuery) ||
    filters.sort !== DEFAULT_PLACE_FILTERS.sort ||
    q.openNow ||
    q.aiMatches ||
    q.voted;

  return (
    <Stack spacing={2}>
      <Flex gap="6px" flexWrap="wrap" role="group" aria-label="Filter places">
        {categories.length > 0 && (
          <Menu closeOnSelect={false} isLazy>
            <MenuButton
              as={Button}
              h="32px"
              px={3}
              borderRadius="full"
              fontSize="13px"
              fontWeight={filters.categories.length ? 600 : 500}
              variant={filters.categories.length ? "solid" : "outline"}
              rightIcon={<FiChevronDown size={12} />}
            >
              {filters.categories.length ? `Category · ${filters.categories.length}` : "Category"}
            </MenuButton>
            <MenuList maxH="320px" overflowY="auto" zIndex={20}>
              <MenuOptionGroup type="checkbox" value={filters.categories} onChange={(v) => onChange({ ...filters, categories: v as string[] })}>
                {categories.map((cat) => (
                  <MenuItemOption key={cat} value={cat}>
                    {cat}
                  </MenuItemOption>
                ))}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        )}
        <ChoiceChip selected={filters.minRating === 4} onClick={() => onChange({ ...filters, minRating: filters.minRating === 4 ? 0 : 4 })}>
          Rating 4.0+
        </ChoiceChip>
        <ChoiceChip selected={q.openNow} onClick={() => setQuick({ openNow: !q.openNow })}>
          Open now
        </ChoiceChip>
        {showAiMatches && (
          <ChoiceChip selected={q.aiMatches} icon={LuSparkles} onClick={() => setQuick({ aiMatches: !q.aiMatches })}>
            AI matches
          </ChoiceChip>
        )}
        <ChoiceChip selected={q.voted} onClick={() => setQuick({ voted: !q.voted })}>
          Voted by group
        </ChoiceChip>
        <Popover placement="bottom-start" isLazy>
          <PopoverTrigger>
            <Button
              h="32px"
              px={3}
              borderRadius="full"
              fontSize="13px"
              fontWeight={moreActive ? 600 : 500}
              variant={moreActive ? "solid" : "outline"}
              borderStyle={moreActive ? undefined : "dashed"}
              leftIcon={<Icon as={FiFilter} boxSize="13px" />}
            >
              More filters
            </Button>
          </PopoverTrigger>
          <PopoverContent w="280px">
            <PopoverArrow bg="sf" />
            <PopoverBody p={4}>
              <Stack spacing={3}>
                <FormControl>
                  <FormLabel>Search by name</FormLabel>
                  <Input size="sm" placeholder="Filter places…" value={filters.nameQuery} onChange={(e) => onChange({ ...filters, nameQuery: e.target.value })} />
                </FormControl>
                <FormControl>
                  <FormLabel>Min rating</FormLabel>
                  <Select size="sm" value={String(filters.minRating)} onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) as MinRatingFilter })}>
                    <option value="0">All ratings</option>
                    <option value="3">3.0+</option>
                    <option value="4">4.0+</option>
                    <option value="4.5">4.5+</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Sort by</FormLabel>
                  <Select size="sm" value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value as PlaceSortOption })}>
                    <option value="rating">Rating</option>
                    <option value="name">Name</option>
                    <option value="distance">Distance from stay</option>
                  </Select>
                </FormControl>
              </Stack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
      <Flex align="center" gap={2} fontSize="12px" color="tx3" minH="28px" flexWrap="wrap">
        <Text aria-live="polite">
          Showing {resultCount} of {totalCount}
        </Text>
        {anyActive && (
          <Box
            as="button"
            type="button"
            color="ac"
            fontWeight={600}
            onClick={() => {
              onChange(DEFAULT_PLACE_FILTERS);
              onQuickChange?.(DEFAULT_QUICK_FILTERS);
            }}
          >
            Clear filters
          </Box>
        )}
        {actions && (
          <Flex ml="auto" gap={1} align="center">
            {actions}
          </Flex>
        )}
      </Flex>
    </Stack>
  );
}
