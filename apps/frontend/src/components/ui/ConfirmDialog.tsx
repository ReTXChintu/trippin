import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { useRef } from "react";
import { FiAlertTriangle, FiHelpCircle } from "react-icons/fi";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isDestructive?: boolean;
}

/** Dialog (§7.7): radius 20, a 40 icon tile + 19/24 title, 15/22 body, ghost Cancel + 48px primary. */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  isDestructive = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent mx={4} maxW="400px">
          <AlertDialogHeader display="flex" alignItems="center" gap={3}>
            <Flex
              w="40px"
              h="40px"
              borderRadius="md"
              bg={isDestructive ? "critSoft" : "acSoft"}
              color={isDestructive ? "crit" : "ac"}
              align="center"
              justify="center"
              flexShrink={0}
            >
              <Icon as={isDestructive ? FiAlertTriangle : FiHelpCircle} boxSize="20px" />
            </Flex>
            {title}
          </AlertDialogHeader>
          <AlertDialogBody fontSize="15px" lineHeight="22px" color="tx2">
            {description}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose} variant="ghost" size="lg">
              {cancelLabel}
            </Button>
            <Button colorScheme={isDestructive ? "red" : "brand"} onClick={onConfirm} isLoading={isLoading} size="lg">
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}
