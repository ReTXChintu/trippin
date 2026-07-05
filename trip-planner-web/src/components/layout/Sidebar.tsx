"use client";

import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Text,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV_ITEMS, QUICK_ACTIONS } from "@/constants/navigation";
// import { MobileAppDownloadButton } from "@/components/layout/MobileAppDownloadButton";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const bg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const activeBg = useColorModeValue("brand.50", "brand.900");
  const activeColor = useColorModeValue("brand.600", "brand.200");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Flex
      direction="column"
      w="full"
      h="full"
      bg={bg}
      borderRightWidth="1px"
      borderColor={borderColor}
      py={4}
    >
      <Box px={4} pb={4}>
        <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase">
          Navigation
        </Text>
      </Box>

      <VStack align="stretch" spacing={1} px={3} flex={1}>
        {MAIN_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Button
              key={item.href}
              as={Link}
              href={item.href}
              onClick={onNavigate}
              variant="ghost"
              justifyContent="flex-start"
              leftIcon={<Icon as={item.icon} />}
              bg={active ? activeBg : "transparent"}
              color={active ? activeColor : undefined}
              fontWeight={active ? "semibold" : "normal"}
              _hover={{ bg: active ? activeBg : hoverBg }}
            >
              {item.label}
            </Button>
          );
        })}
      </VStack>

      <Divider />

      <Box px={3} pt={4}>
        {/* <MobileAppDownloadButton fullWidth variant="outline" /> */}
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.href}
            as={Link}
            href={action.href}
            onClick={onNavigate}
            w="full"
            leftIcon={<Icon as={action.icon} />}
            colorScheme="brand"
            size="sm"
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Flex>
  );
}
