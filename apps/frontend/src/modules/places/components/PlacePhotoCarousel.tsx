import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Skeleton,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { FiChevronLeft, FiChevronRight, FiMapPin, FiMaximize2 } from "react-icons/fi";
import { FULLSCREEN_PHOTO_MAX_HEIGHT } from "@/modules/places/utils/photo.utils";

interface PlacePhotoCarouselProps {
  photos: string[];
  alt: string;
  mapsUrl?: string | null;
  onOpenMaps?: () => void;
  variant?: "inline" | "fullscreen";
  index?: number;
  onIndexChange?: (index: number) => void;
  showExpandButton?: boolean;
  onExpand?: () => void;
}

type LoadState = "loading" | "loaded" | "error";

const INLINE_MIN_FRAME_HEIGHT = 200;
const INLINE_MAX_FRAME_HEIGHT = 420;
const FULLSCREEN_MIN_FRAME_HEIGHT = 280;
const FULLSCREEN_MAX_VH = 85;
const DEFAULT_FRAME_HEIGHT = 280;

function clampFrameHeight(
  width: number,
  aspect: number,
  minHeight: number,
  maxHeight: number,
): number {
  const ideal = width / aspect;
  return Math.min(maxHeight, Math.max(minHeight, ideal));
}

function swapPhotoMaxHeight(url: string, maxHeightPx: number): string {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("maxHeightPx", String(maxHeightPx));
    return parsed.toString();
  } catch {
    return url;
  }
}

function PlacePhotoCarouselInner({
  photos,
  alt,
  mapsUrl,
  onOpenMaps,
  variant = "inline",
  index: controlledIndex,
  onIndexChange,
  showExpandButton = false,
  onExpand,
}: PlacePhotoCarouselProps) {
  const isFullscreen = variant === "fullscreen";
  const minFrameHeight = isFullscreen ? FULLSCREEN_MIN_FRAME_HEIGHT : INLINE_MIN_FRAME_HEIGHT;
  const maxFrameHeight = isFullscreen
    ? typeof window !== "undefined"
      ? (window.innerHeight * FULLSCREEN_MAX_VH) / 100
      : 720
    : INLINE_MAX_FRAME_HEIGHT;

  const displayPhotos = isFullscreen
    ? photos.map((url) => swapPhotoMaxHeight(url, FULLSCREEN_PHOTO_MAX_HEIGHT))
    : photos;

  const [internalIndex, setInternalIndex] = useState(0);
  const index = controlledIndex ?? internalIndex;

  const setIndex = useCallback(
    (next: number | ((current: number) => number)) => {
      const resolved = typeof next === "function" ? next(index) : next;
      if (onIndexChange) onIndexChange(resolved);
      else setInternalIndex(resolved);
    },
    [index, onIndexChange],
  );

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [frameHeight, setFrameHeight] = useState(DEFAULT_FRAME_HEIGHT);
  const [photoAspect, setPhotoAspect] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const emptyPhotoBg = useColorModeValue(
    isFullscreen ? "blackAlpha.600" : "gray.100",
    isFullscreen ? "blackAlpha.700" : "gray.700",
  );
  const muted = "fg.muted";
  const overlayBg = useColorModeValue("blackAlpha.500", "blackAlpha.600");
  const navBg = useColorModeValue("whiteAlpha.900", "blackAlpha.700");

  const hasMultiple = displayPhotos.length > 1;
  const currentPhotoUrl = displayPhotos[index];

  useEffect(() => {
    setInternalIndex(0);
    onIndexChange?.(0);
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoadState("loading");
    setPhotoAspect(null);
    setFrameHeight(isFullscreen ? maxFrameHeight : DEFAULT_FRAME_HEIGHT);
  }, [index, currentPhotoUrl, isFullscreen, maxFrameHeight]);

  const applyFrameHeight = useCallback(
    (aspect: number) => {
      const width = containerRef.current?.clientWidth ?? 0;
      if (width <= 0) return;
      setFrameHeight(clampFrameHeight(width, aspect, minFrameHeight, maxFrameHeight));
    },
    [minFrameHeight, maxFrameHeight],
  );

  useEffect(() => {
    if (photoAspect === null) return;

    applyFrameHeight(photoAspect);

    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(() => applyFrameHeight(photoAspect));
    observer.observe(node);
    return () => observer.disconnect();
  }, [photoAspect, applyFrameHeight]);

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      const aspect = img.naturalWidth / img.naturalHeight;
      setPhotoAspect(aspect);
      applyFrameHeight(aspect);
    }
    setLoadState("loaded");
  };

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + displayPhotos.length) % displayPhotos.length);
  }, [displayPhotos.length, setIndex]);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % displayPhotos.length);
  }, [displayPhotos.length, setIndex]);

  useEffect(() => {
    if (!hasMultiple) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasMultiple, goPrev, goNext]);

  return (
    <Box w="full">
      <Box
        ref={containerRef}
        position="relative"
        borderRadius={isFullscreen ? "none" : "lg"}
        overflow="hidden"
        bg={emptyPhotoBg}
        h={isFullscreen ? `${maxFrameHeight}px` : `${frameHeight}px`}
        maxH={isFullscreen ? `${FULLSCREEN_MAX_VH}vh` : undefined}
        transition={isFullscreen ? undefined : "height 0.25s ease"}
        userSelect="none"
      >
        {loadState === "loading" && (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            direction="column"
            gap={3}
            zIndex={1}
          >
            <Skeleton
              position="absolute"
              inset={0}
              borderRadius={isFullscreen ? "none" : "lg"}
              startColor="gray.200"
              endColor="gray.300"
              speed={1.2}
            />
            <Box
              w="40px"
              h="40px"
              borderRadius="full"
              borderWidth="3px"
              borderColor="brand.400"
              borderTopColor="transparent"
              animation="spin 0.8s linear infinite"
              sx={{
                "@keyframes spin": {
                  to: { transform: "rotate(360deg)" },
                },
              }}
            />
            <Text
              fontSize="sm"
              color={isFullscreen ? "whiteAlpha.800" : muted}
              fontWeight="medium"
              zIndex={2}
            >
              Loading photo…
            </Text>
          </Flex>
        )}

        {loadState === "error" && (
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            direction="column"
            gap={3}
            px={4}
            zIndex={1}
          >
            <Text
              fontSize="sm"
              color={isFullscreen ? "whiteAlpha.800" : muted}
              textAlign="center"
            >
              Couldn&apos;t load this photo
            </Text>
            {mapsUrl && onOpenMaps && (
              <Button size="sm" leftIcon={<FiMapPin />} colorScheme="blue" onClick={onOpenMaps}>
                View on Google Maps
              </Button>
            )}
          </Flex>
        )}

        <Flex
          key={currentPhotoUrl}
          w="full"
          h="full"
          align="center"
          justify="center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPhotoUrl}
            alt={`${alt} — photo ${index + 1}`}
            onLoad={handleImageLoad}
            onError={() => setLoadState("error")}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              opacity: loadState === "loaded" ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
          />
        </Flex>

        {showExpandButton && loadState === "loaded" && onExpand && (
          <IconButton
            aria-label="View photos fullscreen"
            icon={<FiMaximize2 size={16} />}
            position="absolute"
            top={2}
            right={2}
            zIndex={3}
            size="sm"
            borderRadius="md"
            bg={navBg}
            boxShadow="md"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
          />
        )}

        {hasMultiple && (
          <>
            <IconButton
              aria-label="Previous photo"
              icon={<FiChevronLeft size={20} />}
              position="absolute"
              left={2}
              top="50%"
              transform="translateY(-50%)"
              zIndex={3}
              size="sm"
              borderRadius="full"
              bg={navBg}
              boxShadow="md"
              opacity={loadState === "loaded" ? 1 : 0.85}
              _hover={{ bg: navBg, transform: "translateY(-50%) scale(1.05)" }}
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            />
            <IconButton
              aria-label="Next photo"
              icon={<FiChevronRight size={20} />}
              position="absolute"
              right={2}
              top="50%"
              transform="translateY(-50%)"
              zIndex={3}
              size="sm"
              borderRadius="full"
              bg={navBg}
              boxShadow="md"
              opacity={loadState === "loaded" ? 1 : 0.85}
              _hover={{ bg: navBg, transform: "translateY(-50%) scale(1.05)" }}
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            />
            <Box
              position="absolute"
              bottom={2}
              right={2}
              zIndex={3}
              px={2}
              py={0.5}
              borderRadius="md"
              bg={overlayBg}
            >
              <Text fontSize="xs" color="white" fontWeight="medium">
                {index + 1} / {displayPhotos.length}
              </Text>
            </Box>
          </>
        )}
      </Box>

      {hasMultiple && (
        <HStack justify="center" mt={3} spacing={2}>
          {displayPhotos.map((_, i) => (
            <Box
              key={i}
              w={i === index ? "10px" : "8px"}
              h={i === index ? "10px" : "8px"}
              borderRadius="full"
              bg={i === index ? "brand.500" : isFullscreen ? "whiteAlpha.800" : "gray.300"}
              cursor="pointer"
              transition="all 0.2s"
              onClick={() => setIndex(i)}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </HStack>
      )}
    </Box>
  );
}

export function PlacePhotoCarousel(props: PlacePhotoCarouselProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [index, setIndex] = useState(0);

  if (props.variant === "fullscreen") {
    return <PlacePhotoCarouselInner {...props} />;
  }

  return (
    <>
      <PlacePhotoCarouselInner
        {...props}
        index={index}
        onIndexChange={setIndex}
        showExpandButton={props.showExpandButton ?? true}
        onExpand={onOpen}
      />

      <Modal isOpen={isOpen} onClose={onClose} size="full" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.900" />
        <ModalContent bg="black" m={0} borderRadius={0}>
          <ModalCloseButton color="white" zIndex={10} size="lg" />
          <ModalBody
            display="flex"
            alignItems="center"
            justifyContent="center"
            px={{ base: 2, md: 8 }}
            py={12}
          >
            <Box w="full" maxW="1200px">
              <PlacePhotoCarouselInner
                {...props}
                variant="fullscreen"
                index={index}
                onIndexChange={setIndex}
                showExpandButton={false}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
