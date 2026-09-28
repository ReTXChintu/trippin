import {
  Box,
  Input,
  InputGroup,
  InputRightElement,
  List,
  ListItem,
  Spinner,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { searchCities, type CityMatch } from "@/modules/places/api/places.api";

export interface CityValue {
  city: string;
  state?: string;
  country: string;
  lat?: number;
  lng?: number;
}

const DEBOUNCE_MS = 250;

/** Type a city, pick it from the list — country and region come with it. Works without a Maps key. */
export function CityInput({
  value,
  onChange,
  placeholder = "City — e.g. Kyoto",
  autoFocus,
  isInvalid,
  size = "md",
}: {
  value: CityValue;
  onChange: (value: CityValue) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isInvalid?: boolean;
  size?: "sm" | "md";
}) {
  const [query, setQuery] = useState(value.city);
  const [results, setResults] = useState<CityMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const listBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const hover = useColorModeValue("gray.50", "gray.700");
  const muted = useColorModeValue("gray.500", "gray.400");

  useEffect(() => setQuery(value.city), [value.city]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { cities } = await searchCities(q);
        setResults(cities);
        setActive(0);
        setOpen(cities.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const pick = (c: CityMatch) => {
    onChange({ city: c.name, state: c.state, country: c.country, lat: c.lat, lng: c.lng });
    setQuery(c.name);
    setOpen(false);
  };

  return (
    <Box ref={box} position="relative" w="full">
      <InputGroup size={size}>
        <Input
          value={query}
          autoFocus={autoFocus}
          isInvalid={isInvalid}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="City"
          onChange={(e) => {
            setQuery(e.target.value);
            // Typing a new name forgets the old pick until one is chosen (or typed in full).
            onChange({ city: e.target.value, state: undefined, country: e.target.value === value.city ? value.country : "" });
            search(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) pick(results[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        {loading && (
          <InputRightElement>
            <Spinner size="xs" />
          </InputRightElement>
        )}
      </InputGroup>
      {open && (
        <List
          position="absolute"
          zIndex={20}
          top="100%"
          mt={1}
          w="full"
          bg={listBg}
          borderWidth="1px"
          borderColor={border}
          borderRadius="md"
          boxShadow="lg"
          py={1}
          role="listbox"
        >
          {results.map((c, i) => (
            <ListItem
              key={`${c.name}-${c.state}-${c.country}-${c.lat}`}
              px={3}
              py={2}
              cursor="pointer"
              bg={i === active ? hover : undefined}
              _hover={{ bg: hover }}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              role="option"
              aria-selected={i === active}
            >
              <Text fontSize="sm" fontWeight="medium">
                {c.name}
              </Text>
              <Text fontSize="xs" color={muted}>
                {[c.state, c.country].filter(Boolean).join(", ")}
              </Text>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
