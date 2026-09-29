import { Flex, Icon, Text } from "@chakra-ui/react";
import { FiBriefcase, FiHome, FiPlus, FiUser } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";

const ITEMS = [
  { to: "/dashboard", label: "Home", icon: FiHome },
  { to: "/trips", label: "Trips", icon: FiBriefcase },
  { to: "/trips/new", label: "New", icon: FiPlus },
  { to: "/profile", label: "Profile", icon: FiUser },
];

function active(pathname: string, to: string) {
  if (to === "/trips") return pathname === "/trips";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Phone tab bar for app pages (the trip workspace has its own). */
export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <Flex
      as="nav"
      aria-label="Main"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex="sticky"
      h="64px"
      pb="env(safe-area-inset-bottom)"
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border.line"
      display={{ base: "flex", lg: "none" }}
    >
      {ITEMS.map((item) => {
        const on = active(pathname, item.to);
        return (
          <Flex
            key={item.to}
            as={Link}
            to={item.to}
            flex={1}
            direction="column"
            align="center"
            justify="center"
            gap="2px"
            color={on ? "accent.text" : "fg.muted"}
            fontWeight={on ? 600 : 500}
            aria-current={on ? "page" : undefined}
          >
            <Icon as={item.icon} boxSize="20px" />
            <Text fontSize="12px">{item.label}</Text>
          </Flex>
        );
      })}
    </Flex>
  );
}
