import { Button, Icon } from "@chakra-ui/react";
import { FiSmartphone } from "react-icons/fi";

const downloadUrl = import.meta.env.VITE_MOBILE_APP_DOWNLOAD_URL;

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
  if (!downloadUrl?.trim()) {
    return null;
  }

  return (
    <Button
      as="a"
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      size={size}
      variant={variant}
      colorScheme="brand"
      leftIcon={<Icon as={FiSmartphone} />}
      width={fullWidth ? "full" : undefined}
    >
      Download app
    </Button>
  );
}
