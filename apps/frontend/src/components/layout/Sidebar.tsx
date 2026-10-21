import { Box, Button, Flex, Icon, Progress, Text, VStack } from "@chakra-ui/react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { FiDownload, FiPlus } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";
import { BrandLogo, BrandMark } from "@/components/brand/BrandLogo";
import { MAIN_NAV_ITEMS } from "@/constants/navigation";
import { useDashboardQuery } from "@/modules/trips/hooks/useTrips";
import { getTripStages } from "@/modules/trips/utils/trip-stage";
import { useApkInfo } from "@/components/layout/useApkInfo";

function isActive(pathname: string, href: string) {
  if (href === "/trips") return pathname === "/trips" || (pathname.startsWith("/trips/") && pathname !== "/trips/new");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NextTripCard() {
  const { data } = useDashboardQuery();
  const trip = data?.upcomingTrips?.[0];
  if (!trip) return null;
  const days = differenceInCalendarDays(parseISO(trip.startDate.slice(0, 10)), new Date());
  const { doneCount, stages } = getTripStages(trip, trip.planInfo);
  return (
    <Box
      as={Link}
      to={`/trips/${trip.id}`}
      display="block"
      p="14px"
      borderWidth="1px"
      borderColor="ln"
      borderRadius="xl"
      bg="sf2"
      _hover={{ borderColor: "acLine" }}
    >
      <Text fontSize="12px" lineHeight="16px" fontWeight={600} letterSpacing="0.02em" color="tx2" mb={1}>
        Next trip
      </Text>
      <Text fontWeight={600} fontSize="15px" lineHeight="20px" noOfLines={1}>
        {trip.title}
      </Text>
      <Text fontSize="12px" lineHeight="16px" color="tx3" mt={0.5} mb={2.5} className="num">
        {days <= 0 ? "Under way" : days === 1 ? "Starts tomorrow" : `Starts in ${days} days`} · {doneCount} of {stages.length} steps
      </Text>
      <Progress value={(doneCount / stages.length) * 100} h="6px" borderRadius="full" aria-label="Trip progress" />
    </Box>
  );
}

/** Full sidebar for app pages (Dashboard, My trips, Profile, New trip). */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const apk = useApkInfo();
  const { pathname } = useLocation();
  return (
    <Flex as="nav" aria-label="Main" direction="column" w="248px" h="full" bg="sf" borderRightWidth="1px" borderColor="ln" px={3} py={5} gap={1}>
      <Box as={Link} to="/dashboard" px={2} pb={3} onClick={onNavigate} aria-label="Trippin' home">
        <BrandLogo />
      </Box>
      <Button as={Link} to="/trips/new" leftIcon={<FiPlus size={18} />} mb={3} onClick={onNavigate}>
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
              fontSize="14px"
              color={active ? "ac" : "tx2"}
              bg={active ? "acSoft" : "transparent"}
              fontWeight={active ? 600 : 500}
              _hover={{ bg: active ? "acSoft" : "sunk", color: active ? "ac" : "tx" }}
              aria-current={active ? "page" : undefined}
            >
              <Icon as={item.icon} boxSize="20px" />
              {item.label}
            </Flex>
          );
        })}
      </VStack>
      <Box flex={1} />
      <NextTripCard />
      {apk && (
        <Flex as="a" href={apk.url} download="trippin.apk" title={`Android app, version ${apk.version}`} align="center" gap={3} h="40px" px={3} mt={1.5} borderRadius="md" fontSize="14px" color="tx2" fontWeight={500} _hover={{ bg: "sunk", color: "tx" }}>
          <Icon as={FiDownload} boxSize="20px" />
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
      fontSize="11px"
      lineHeight="14px"
      fontWeight={active || solid ? 600 : 500}
      color={solid ? "acTx" : active ? "ac" : "tx2"}
      bg={solid ? "ac" : active ? "acSoft" : "transparent"}
      _hover={{ bg: solid ? "ac" : active ? "acSoft" : "sunk", color: solid ? "acTx" : active ? "ac" : "tx" }}
      aria-current={active ? "page" : undefined}
    >
      <Icon as={icon} boxSize="20px" />
      <span>{label}</span>
    </Flex>
  );
}

/** Slim rail used inside the trip workspace, so the plan gets the width. */
export function Rail() {
  const apk = useApkInfo();
  const { pathname } = useLocation();
  return (
    <Flex as="nav" aria-label="Main" direction="column" align="center" w="76px" h="full" bg="sf" borderRightWidth="1px" borderColor="ln" px="10px" py={5} gap={1}>
      <Box as={Link} to="/dashboard" mb={3} aria-label="Trippin' home">
        <BrandMark size={32} />
      </Box>
      <RailLink to="/trips/new" icon={FiPlus} label="New" solid />
      {MAIN_NAV_ITEMS.map((item) => (
        <RailLink key={item.href} to={item.href} icon={item.icon} label={item.shortLabel ?? item.label} active={isActive(pathname, item.href)} />
      ))}
      <Box flex={1} />
      {apk && (
        <Flex as="a" href={apk.url} download="trippin.apk" title={`Android app, version ${apk.version}`} direction="column" align="center" gap="2px" py={2} w="56px" borderRadius="md" fontSize="11px" lineHeight="14px" fontWeight={500} color="tx2" _hover={{ bg: "sunk", color: "tx" }}>
          <Icon as={FiDownload} boxSize="20px" />
          <span>App</span>
        </Flex>
      )}
    </Flex>
  );
}
