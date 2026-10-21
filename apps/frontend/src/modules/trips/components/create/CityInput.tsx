import {
  Box,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  List,
  ListItem,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
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
  icon,
  dashed,
  height,
  ariaLabel = "City",
  onPick,
  clearOnPick,
  onEnterText,
}: {
  value: CityValue;
  onChange: (value: CityValue) => void;
  placeholder?: string;
  autoFocus?: boolean;
  isInvalid?: boolean;
  size?: "sm" | "md";
  /** Leading icon inside the field. */
  icon?: IconType;
  /** Dashed border — the "add another" field. */
  dashed?: boolean;
  height?: string;
  ariaLabel?: string;
  /** Called only when a city is chosen from the list. */
  onPick?: (value: CityValue) => void;
  /** Empty the field after a pick (used to add cities one after another). */
  clearOnPick?: boolean;
  /** Enter with no list open — lets a typed name be used as is. */
  onEnterText?: (text: string) => void;
}) {
  const [query, setQuery] = useState(value.city);
  const [results, setResults] = useState<CityMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const listBg = "sf";
  const border = "ln";
  const hover = "sunk";
  const muted = "tx3";

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
    const picked = { city: c.name, state: c.state, country: c.country, lat: c.lat, lng: c.lng };
    onChange(picked);
    onPick?.(picked);
    setQuery(clearOnPick ? "" : c.name);
    setResults([]);
    setOpen(false);
  };

  return (
    <Box ref={box} position="relative" w="full">
      <InputGroup size={size}>
        {icon && (
          <InputLeftElement pointerEvents="none" color="tx3" h={height}>
            <Icon as={icon} boxSize="16px" />
          </InputLeftElement>
        )}
        <Input
          value={query}
          h={height}
          pl={icon ? "38px" : undefined}
          borderStyle={dashed ? "dashed" : undefined}
          autoFocus={autoFocus}
          isInvalid={isInvalid}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={ariaLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            // Typing a new name forgets the old pick until one is chosen (or typed in full).
            onChange({ city: e.target.value, state: undefined, country: e.target.value === value.city ? value.country : "" });
            search(e.target.value);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (!open) {
              if (e.key === "Enter" && onEnterText) {
                e.preventDefault();
                if (query.trim().length >= 2) onEnterText(query.trim());
              }
              return;
            }
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
          <InputRightElement h={height}>
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
          boxShadow="raised"
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
