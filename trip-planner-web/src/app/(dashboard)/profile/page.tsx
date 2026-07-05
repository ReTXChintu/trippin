import { ProfileForm } from "@/modules/profile/components/ProfileForm";
import { Box, Heading, Text } from "@chakra-ui/react";

export default function ProfilePage() {
  return (
    <Box>
      <Heading size="lg" mb={1}>
        Profile
      </Heading>
      <Text color="gray.500" mb={6}>
        Manage your account settings and preferences
      </Text>

      <ProfileForm />
    </Box>
  );
}
