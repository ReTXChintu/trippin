import {
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  useClipboard,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import {
  FiArchive,
  FiCopy,
  FiExternalLink,
  FiLogOut,
  FiMoreVertical,
  FiShare2,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api";
import {
  useArchiveTrip,
  useDeleteTrip,
  useDuplicateTrip,
  useLeaveTrip,
  useShareTrip,
  useUnshareTrip,
} from "@/modules/trips/hooks/useTrips";
import type { Trip } from "@/modules/trips/types/trip.types";

interface TripActionsMenuProps {
  trip: Trip;
  isOwner: boolean;
}

export function TripActionsMenu({ trip, isOwner }: TripActionsMenuProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isLeaveOpen, onOpen: onLeaveOpen, onClose: onLeaveClose } = useDisclosure();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const duplicateTrip = useDuplicateTrip();
  const archiveTrip = useArchiveTrip();
  const shareTrip = useShareTrip(trip.id);
  const unshareTrip = useUnshareTrip(trip.id);
  const deleteTrip = useDeleteTrip();
  const leaveTrip = useLeaveTrip();

  const shareUrl = trip.publicSlug ? `${window.location.origin}/share/${trip.publicSlug}` : "";
  const { hasCopied, onCopy } = useClipboard(shareUrl);

  const handleDuplicate = async () => {
    try {
      const result = await duplicateTrip.mutateAsync(trip.id);
      toast({ title: "Trip duplicated", status: "success" });
      navigate(`/trips/${result.trip.id}`);
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTrip.mutateAsync(trip.id);
      toast({ title: "Trip archived", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleShare = async () => {
    try {
      await shareTrip.mutateAsync();
      toast({ title: "Share link created", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleUnshare = async () => {
    try {
      await unshareTrip.mutateAsync();
      toast({ title: "Sharing disabled", status: "success" });
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast({ title: "Trip deleted", status: "success" });
      navigate("/trips");
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setIsDeleting(false);
      onDeleteClose();
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      await leaveTrip.mutateAsync(trip.id);
      toast({ title: "You left the trip", status: "success" });
      navigate("/trips");
    } catch (err) {
      toast({ title: getApiErrorMessage(err), status: "error" });
    } finally {
      setIsLeaving(false);
      onLeaveClose();
    }
  };

  return (
    <>
      <Menu>
        <MenuButton as={IconButton} icon={<FiMoreVertical />} size="sm" variant="outline" aria-label="More trip actions" />
        <MenuList>
          <MenuItem icon={<FiCopy />} onClick={handleDuplicate}>
            Duplicate
          </MenuItem>
          {trip.status !== "archived" && (
            <MenuItem icon={<FiArchive />} onClick={handleArchive}>
              Archive
            </MenuItem>
          )}
          <MenuDivider />
          {trip.isPublic ? (
            <>
              <MenuItem icon={<FiCopy />} onClick={onCopy}>
                {hasCopied ? "Copied!" : "Copy share link"}
              </MenuItem>
              <MenuItem as="a" href={shareUrl} target="_blank" icon={<FiExternalLink />}>
                View public page
              </MenuItem>
              <MenuItem onClick={handleUnshare}>Unshare</MenuItem>
            </>
          ) : (
            <MenuItem icon={<FiShare2 />} onClick={handleShare}>
              Share
            </MenuItem>
          )}
          <MenuDivider />
          {!isOwner && (
            <MenuItem icon={<FiLogOut />} color="orange.500" onClick={onLeaveOpen}>
              Leave trip
            </MenuItem>
          )}
          {isOwner && (
            <MenuItem icon={<FiTrash2 />} color="red.500" onClick={onDeleteOpen}>
              Delete
            </MenuItem>
          )}
        </MenuList>
      </Menu>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        title="Delete trip"
        description="This action cannot be undone. All trip data will be permanently removed."
        confirmLabel="Delete"
        isLoading={isDeleting}
        isDestructive
      />

      <ConfirmDialog
        isOpen={isLeaveOpen}
        onClose={onLeaveClose}
        onConfirm={handleLeave}
        title="Leave trip"
        description="You will lose access to this trip. The owner will be notified."
        confirmLabel="Leave trip"
        isLoading={isLeaving}
        isDestructive
      />
    </>
  );
}
