import { Button, Icon } from "@chakra-ui/react";
import { FiSmartphone } from "react-icons/fi";
import { useApkInfo } from "@/components/layout/useApkInfo";

interface MobileAppDownloadButtonProps {
  size?: "sm" | "md";
  variant?: "solid" | "outline" | "ghost";
  fullWidth?: boolean;
}

export function MobileAppDownloadButton({
  size = "sm",
  variant = "outline",
  fullWidth = false,
}: MobileAppDownloadButtonProps) {
  const apk = useApkInfo();
  if (!apk) return null;

  return (
    <Button
      as="a"
      href={apk.url}
      download="trippin.apk"
      title={`Trippin for Android, version ${apk.version}`}
      size={size}
      variant={variant}
      colorScheme="brand"
      leftIcon={<Icon as={FiSmartphone} />}
      width={fullWidth ? "full" : undefined}
    >
      Download app · v{apk.version}
    </Button>
  );
}
