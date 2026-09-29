import { Badge, Box, Flex, Heading, HStack, Icon, Text, useColorModeValue } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import { FiCalendar, FiMapPin } from "react-icons/fi";
import { format, parseISO } from "date-fns";
import type { TripStatus } from "@/types";

interface TripCardProps {
  id: string;
  title: string;
  destinationCity: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
}

const statusColors: Record<TripStatus, string> = {
  draft: "gray",
  active: "green",
  archived: "orange",
  completed: "blue",
};

export function TripCard({
  id,
  title,
  destinationCity,
  destinationCountry,
  startDate,
  endDate,
  status,
}: TripCardProps) {
  const bg = "bg.surface";
  const borderColor = "border.line";
  const hoverBorder = useColorModeValue("brand.300", "brand.600");

  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "MMM d, yyyy");
    } catch {
      return date;
    }
  };

  return (
    <Box
      as={Link}
      to={`/trips/${id}`}
      display="block"
      p={5}
      bg={bg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      transition="all 0.2s"
      _hover={{
        borderColor: hoverBorder,
        transform: "translateY(-2px)",
        shadow: "md",
      }}
    >
      <Flex justify="space-between" align="start" mb={3}>
        <Heading size="sm" noOfLines={1}>
          {title}
        </Heading>
        <Badge colorScheme={statusColors[status]} textTransform="capitalize">
          {status}
        </Badge>
      </Flex>

      <HStack spacing={2} color="fg.muted" fontSize="sm" mb={2}>
        <Icon as={FiMapPin} />
        <Text>
          {destinationCity}, {destinationCountry}
        </Text>
      </HStack>

      <HStack spacing={2} color="fg.muted" fontSize="sm">
        <Icon as={FiCalendar} />
        <Text>
          {formatDate(startDate)} – {formatDate(endDate)}
        </Text>
      </HStack>
    </Box>
  );
}
