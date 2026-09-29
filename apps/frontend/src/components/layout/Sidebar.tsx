import { Box, Button, Flex, Icon, Progress, Text, VStack } from "@chakra-ui/react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { FiDownload, FiPlus } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { BrandLogo, BrandMark } from "@/components/brand/BrandLogo";
import { MAIN_NAV_ITEMS } from "@/constants/navigation";
import { useDashboardQuery } from "@/modules/trips/hooks/useTrips";
import { getTripStages } from "@/modules/trips/utils/trip-stage";

const downloadUrl = import.meta.env.VITE_MOBILE_APP_DOWNLOAD_URL as string | undefined;

function isActive(pathname: string, href: string) {
  if (href === "/trips") return pathname === "/trips" || (pathname.startsWith("/trips/") && pathname !== "/trips/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NextTripCard() {
  const { data } = useDashboardQuery();
  const trip = data?.upcomingTrips?.[0];
  if (!trip) return null;
  const days = differenceInCalendarDays(parseISO(trip.startDate.slice(0, 10)), new Date());
  const { doneCount, stages } = getTripStages(trip);
  return (
    <Box
      as={Link}
      to={`/trips/${trip.id}`}
      display="block"
      p={3}
      borderWidth="1px"
      borderColor="border.line"
      borderRadius="xl"
      bg="bg.canvas"
      _hover={{ borderColor: "accent" }}
    >
      <Text fontSize="12px" fontWeight={600} textTransform="uppercase" letterSpacing="0.06em" color="fg.muted" mb={1.5}>
        Next trip
      </Text>
      <Text fontWeight={600} noOfLines={1}>
        {trip.title}
      </Text>
      <Text fontSize="12px" color="fg.muted" mt={0.5} mb={2}>
        {days <= 0 ? "Under way" : days === 1 ? "Starts tomorrow" : `Starts in ${days} days`} · {doneCount} of {stages.length} steps
      </Text>
      <Progress value={(doneCount / stages.length) * 100} h="6px" borderRadius="full" aria-label="Trip progress" />
    </Box>
  );
}

/** Full sidebar for app pages (Dashboard, My trips, Profile, New trip). */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <Flex as="nav" aria-label="Main" direction="column" w="236px" h="full" bg="bg.surface" borderRightWidth="1px" borderColor="border.line" px={4} py={5} gap={1.5}>
      <Box as={Link} to="/dashboard" px={1.5} pb={4} onClick={onNavigate}>
        <BrandLogo size={30} />
      </Box>
      <Button as={Link} to="/trips/new" size="lg" leftIcon={<FiPlus />} justifyContent="flex-start" mb={2.5} onClick={onNavigate}>
        New trip
      </Button>
      <VStack align="stretch" spacing={1}>
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Flex
              key={item.href}
              as={Link}
              to={item.href}
              onClick={onNavigate}
              align="center"
              gap={3}
              h="40px"
              px={3}
              borderRadius="md"
              color={active ? "accent.text" : "fg.muted"}
              bg={active ? "accent.soft" : "transparent"}
              fontWeight={active ? 600 : 500}
              _hover={{ bg: active ? "accent.soft" : "bg.subtle", color: active ? "accent.text" : "fg.default" }}
              aria-current={active ? "page" : undefined}
            >
              <Icon as={item.icon} boxSize="18px" />
              {item.label}
            </Flex>
          );
        })}
      </VStack>
      <Box flex={1} />
      <NextTripCard />
      {downloadUrl?.trim() && (
        <Flex as="a" href={downloadUrl} target="_blank" rel="noopener noreferrer" align="center" gap={3} h="40px" px={3} mt={1.5} borderRadius="md" color="fg.muted" fontWeight={500} _hover={{ bg: "bg.subtle" }}>
          <Icon as={FiDownload} boxSize="18px" />
          Download app
        </Flex>
      )}
    </Flex>
  );
}

function RailLink({ to, icon, label, active, solid }: { to: string; icon: typeof FiPlus; label: string; active?: boolean; solid?: boolean }) {
  return (
    <Flex
      as={Link}
      to={to}
      direction="column"
      align="center"
      gap="2px"
      py={2}
      w="56px"
      borderRadius="md"
      fontSize="12px"
      fontWeight={active || solid ? 600 : 500}
      color={solid ? "accent.fg" : active ? "accent.text" : "fg.muted"}
      bg={solid ? "accent" : active ? "accent.soft" : "transparent"}
      _hover={{ bg: solid ? "accent" : active ? "accent.soft" : "bg.subtle" }}
      aria-current={active ? "page" : undefined}
    >
      <Icon as={icon} boxSize="18px" />
      <span>{label}</span>
    </Flex>
  );
}

/** Slim rail used inside the trip workspace, so the plan gets the width. */
export function Rail() {
  const { pathname } = useLocation();
  return (
    <Flex as="nav" aria-label="Main" direction="column" align="center" w="76px" h="full" bg="bg.surface" borderRightWidth="1px" borderColor="border.line" px="10px" py="14px" gap="6px">
      <Box as={Link} to="/dashboard" mb="10px" aria-label="Trippin home">
        <BrandMark size={36} />
      </Box>
      <RailLink to="/trips/new" icon={FiPlus} label="New" solid />
      {MAIN_NAV_ITEMS.map((item) => (
        <RailLink key={item.href} to={item.href} icon={item.icon} label={item.shortLabel ?? item.label} active={isActive(pathname, item.href)} />
      ))}
      <Box flex={1} />
      {downloadUrl?.trim() && (
        <Flex as="a" href={downloadUrl} target="_blank" rel="noopener noreferrer" direction="column" align="center" gap="2px" py={2} w="56px" borderRadius="md" fontSize="12px" fontWeight={500} color="fg.muted" _hover={{ bg: "bg.subtle" }}>
          <Icon as={FiDownload} boxSize="18px" />
          <span>App</span>
        </Flex>
      )}
    </Flex>
  );
}
