"use client";

import {
  Box,
  Checkbox,
  CheckboxGroup,
  Flex,
  HStack,
  Input,
  Select,
  Stack,
  Text,
  useColorModeValue,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
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
}

export function PlaceFilterBar({
  categories,
  filters,
  onChange,
  resultCount,
  totalCount,
}: PlaceFilterBarProps) {
  const borderColor = useColorModeValue("gray.200", "gray.700");

  return (
    <Box p={3} borderWidth="1px" borderColor={borderColor} borderRadius="lg">
      <Flex justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
        <Text fontSize="sm" fontWeight="medium">
          Filters
        </Text>
        <Text fontSize="xs" color="gray.500">
          Showing {resultCount} of {totalCount}
        </Text>
      </Flex>

      <Stack spacing={3}>
        <HStack spacing={3} flexWrap="wrap">
          <Box minW="140px">
            <Text fontSize="xs" color="gray.500" mb={1}>
              Min rating
            </Text>
            <Select
              size="sm"
              value={String(filters.minRating)}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minRating: Number(e.target.value) as MinRatingFilter,
                })
              }
            >
              <option value="0">All ratings</option>
              <option value="3">3.0+</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
            </Select>
          </Box>

          <Box minW="140px">
            <Text fontSize="xs" color="gray.500" mb={1}>
              Sort by
            </Text>
            <Select
              size="sm"
              value={filters.sort}
              onChange={(e) =>
                onChange({ ...filters, sort: e.target.value as PlaceSortOption })
              }
            >
              <option value="rating">Rating</option>
              <option value="name">Name</option>
              <option value="distance">Distance from hotel</option>
            </Select>
          </Box>

          <Box flex={1} minW="180px">
            <Text fontSize="xs" color="gray.500" mb={1}>
              Search by name
            </Text>
            <Input
              size="sm"
              placeholder="Filter places..."
              value={filters.nameQuery}
              onChange={(e) => onChange({ ...filters, nameQuery: e.target.value })}
            />
          </Box>
        </HStack>

        {categories.length > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Category
            </Text>
            <CheckboxGroup
              value={filters.categories}
              onChange={(values) =>
                onChange({ ...filters, categories: values as string[] })
              }
            >
              <Wrap spacing={2}>
                {categories.map((cat) => (
                  <WrapItem key={cat}>
                    <Checkbox size="sm" value={cat}>
                      {cat}
                    </Checkbox>
                  </WrapItem>
                ))}
              </Wrap>
            </CheckboxGroup>
          </Box>
        )}

        {(filters.minRating > 0 ||
          filters.categories.length > 0 ||
          filters.nameQuery ||
          filters.sort !== DEFAULT_PLACE_FILTERS.sort) && (
          <Text
            as="button"
            fontSize="xs"
            color="brand.500"
            onClick={() => onChange(DEFAULT_PLACE_FILTERS)}
          >
            Clear filters
          </Text>
        )}
      </Stack>
    </Box>
  );
}
