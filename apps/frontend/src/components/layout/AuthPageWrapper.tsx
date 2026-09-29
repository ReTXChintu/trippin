import { Box, Flex, Text } from "@chakra-ui/react";
import { MobileAppDownloadButton } from "@/components/layout/MobileAppDownloadButton";
import { SurfaceCard } from "@/components/ui";
import { IllustratedMap } from "@/modules/landing/components/IllustratedMap";

interface AuthPageWrapperProps {
  children: React.ReactNode;
}

/** Log in, sign up, forgot and reset password: the form on the left, a drawn map on the right. */
export function AuthPageWrapper({ children }: AuthPageWrapperProps) {
  return (
    <Flex minH="100vh" bg="bg.canvas">
      <Flex
        position="relative"
        direction="column"
        justify="center"
        w={{ base: "full", lg: "560px", xl: "640px" }}
        flexShrink={0}
        px={{ base: 4, sm: 10, xl: "88px" }}
        py={{ base: 8, md: 12 }}
        bg="bg.surface"
        borderRightWidth={{ base: 0, lg: "1px" }}
        borderColor="border.line"
      >
        <Box position="absolute" top={4} right={4}>
          <MobileAppDownloadButton />
        </Box>
        <Box w="full" maxW={{ base: "464px" }} mx={{ base: "auto", lg: 0 }}>
          {children}
        </Box>
      </Flex>

      <Box flex={1} minW={0} position="relative" display={{ base: "none", lg: "block" }}>
        <Box position="sticky" top={0} h="100vh">
          <IllustratedMap
            height={900}
            position="absolute"
            inset={0}
            pins={[
              { x: 200, y: 220, label: "1" },
              { x: 330, y: 300, label: "2" },
              { x: 470, y: 250, label: "3" },
            ]}
            stay={{ x: 260, y: 420 }}
          />
          <SurfaceCard raised position="absolute" left="48px" bottom="48px" w="360px" maxW="calc(100% - 96px)" p={4}>
            <Text fontFamily="heading" fontWeight={600} fontSize="20px">
              Everyone sees the same plan.
            </Text>
            <Text fontSize="12px" color="fg.muted" mt={1}>
              Editors change it, viewers vote and comment.
            </Text>
          </SurfaceCard>
        </Box>
      </Box>
    </Flex>
  );
}
