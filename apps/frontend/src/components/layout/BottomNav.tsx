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
      h="calc(72px + env(safe-area-inset-bottom))"
      pb="env(safe-area-inset-bottom)"
      bg="sf"
      borderTopWidth="1px"
      borderColor="ln"
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
            gap="4px"
            color={on ? "ac" : "tx2"}
            fontWeight={600}
            aria-current={on ? "page" : undefined}
          >
            <Flex w="56px" h="32px" borderRadius="2xl" bg={on ? "acSoft" : "transparent"} align="center" justify="center" transition="background .2s">
              <Icon as={item.icon} boxSize="24px" />
            </Flex>
            <Text fontSize="12px" lineHeight="16px">
              {item.label}
            </Text>
          </Flex>
        );
      })}
    </Flex>
  );
}
