import {
  Box,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY_LENGTH } from "@/constants/google-places";
import { searchPlaces, getPlaceDetails } from "@/modules/places/api/places.api";
import type { PlaceSearchResult } from "@/modules/places/types/place.types";

export interface PlaceSelection {
  googlePlaceId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
}

interface PlaceSearchInputProps {
  label: string;
  placeholder?: string;
  mode: "hotel" | "place";
  city?: string;
  country?: string;
  value?: string;
  onSelect: (selection: PlaceSelection) => void;
  onClear?: () => void;
}

function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function PlaceSearchInput({
  label,
  placeholder,
  mode,
  city,
  country,
  value,
  onSelect,
  onClear,
}: PlaceSearchInputProps) {
  const [query, setQuery] = useState(value ?? "");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionToken] = useState(generateSessionToken);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const listBg = "bg.surface";
  const borderColor = "border.line";
  const hoverBg = "bg.subtle";

  useEffect(() => {
    if (value !== undefined) setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const runSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < SEARCH_MIN_QUERY_LENGTH) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await searchPlaces({
          query: searchQuery,
          city,
          country,
          sessionToken,
          type: mode === "hotel" ? "hotels" : "places",
        });
        setResults(data.results);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [city, country, mode, sessionToken],
  );

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < SEARCH_MIN_QUERY_LENGTH) {
      setResults([]);
      setIsOpen(false);
      onClear?.();
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(text), SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = async (result: PlaceSearchResult) => {
    setQuery(result.name);
    setIsOpen(false);
    setResults([]);

    if (result.coordinates) {
      onSelect({
        googlePlaceId: result.googlePlaceId,
        name: result.name,
        address: result.address,
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
      });
      return;
    }

    try {
      const details = await getPlaceDetails({
        placeId: result.googlePlaceId,
        city,
        country,
      });
      const p = details.place;
      onSelect({
        googlePlaceId: result.googlePlaceId,
        name: p.name,
        address: p.formattedAddress ?? result.address,
        lat: p.coordinates?.lat,
        lng: p.coordinates?.lng,
      });
    } catch {
      onSelect({
        googlePlaceId: result.googlePlaceId,
        name: result.name,
        address: result.address,
      });
    }
  };

  return (
    <Box ref={containerRef} position="relative">
      <FormControl>
        <FormLabel>{label}</FormLabel>
        <InputGroup>
          <Input
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => results.length > 0 && setIsOpen(true)}
          />
          {isLoading && (
            <InputRightElement>
              <Spinner size="sm" />
            </InputRightElement>
          )}
        </InputGroup>

        {isOpen && results.length > 0 && (
          <Box
            position="absolute"
            zIndex={10}
            w="full"
            mt={1}
            bg={listBg}
            borderWidth="1px"
            borderColor={borderColor}
            borderRadius="md"
            shadow="md"
            maxH="240px"
            overflowY="auto"
          >
            <List spacing={0}>
              {results.map((r) => (
                <ListItem
                  key={r.googlePlaceId}
                  px={3}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  onClick={() => handleSelect(r)}
                >
                  <Text fontWeight="medium" fontSize="sm">
                    {r.name}
                  </Text>
                  {r.address && (
                    <Text fontSize="xs" color="fg.muted" noOfLines={1}>
                      {r.address}
                    </Text>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </FormControl>
    </Box>
  );
}
