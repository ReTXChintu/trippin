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
import { LuArchive, LuCopy, LuEllipsis, LuExternalLink, LuLink, LuLogOut, LuShare2, LuTrash2 } from "react-icons/lu";
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
import { ItineraryExportItems } from "@/modules/itinerary/components/ItineraryExportMenu";
import type { ItineraryExportActions } from "@/modules/itinerary/components/useItineraryExport";

interface TripActionsMenuProps {
  trip: Trip;
  isOwner: boolean;
  /** When given, the plan's export actions are listed too. */
  exportActions?: ItineraryExportActions;
  variant?: "outline" | "ghost";
  size?: "md" | "lg";
}

export function TripActionsMenu({ trip, isOwner, exportActions, variant = "outline", size = "md" }: TripActionsMenuProps) {
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
      <Menu placement="bottom-end">
        <MenuButton
          as={IconButton}
          icon={<LuEllipsis size={18} />}
          variant={variant}
          size={size}
          color="fg.default"
          aria-label="More: share, export, archive, delete"
          title="More: share, export, archive, delete"
        />
        <MenuList fontSize="13px">
          {exportActions?.available && (
            <>
              <ItineraryExportItems actions={exportActions} />
              <MenuDivider />
            </>
          )}
          <MenuItem icon={<LuCopy />} onClick={handleDuplicate}>
            Duplicate
          </MenuItem>
          {trip.status !== "archived" && (
            <MenuItem icon={<LuArchive />} onClick={handleArchive}>
              Archive
            </MenuItem>
          )}
          <MenuDivider />
          {trip.isPublic ? (
            <>
              <MenuItem icon={<LuLink />} onClick={onCopy}>
                {hasCopied ? "Copied!" : "Copy share link"}
              </MenuItem>
              <MenuItem as="a" href={shareUrl} target="_blank" icon={<LuExternalLink />}>
                View public page
              </MenuItem>
              <MenuItem icon={<LuShare2 />} onClick={handleUnshare}>Stop sharing publicly</MenuItem>
            </>
          ) : (
            <MenuItem icon={<LuShare2 />} onClick={handleShare}>
              Share a public link
            </MenuItem>
          )}
          <MenuDivider />
          {!isOwner && (
            <MenuItem icon={<LuLogOut />} color="warn" onClick={onLeaveOpen}>
              Leave trip
            </MenuItem>
          )}
          {isOwner && (
            <MenuItem icon={<LuTrash2 />} color="danger" onClick={onDeleteOpen}>
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
