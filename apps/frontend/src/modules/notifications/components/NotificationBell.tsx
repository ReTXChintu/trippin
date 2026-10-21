import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notifications/api/notifications.api";
import type { NotificationDTO } from "@/modules/notifications/types";

export function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // ignore — bell just stays empty
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpen = async (notification: NotificationDTO) => {
    if (!notification.read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notification.tripId) {
      navigate(`/trips/${notification.tripId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <Menu onOpen={() => void load()}>
      <MenuButton
        as={IconButton}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        icon={<FiBell size={20} />}
        variant="ghost"
        colorScheme="gray"
        position="relative"
      >
        {unreadCount > 0 && (
          <Box
            as="span"
            position="absolute"
            top="5px"
            right="5px"
            minW="16px"
            h="16px"
            px="3px"
            borderRadius="8px"
            bg="critFill"
            color="#fff"
            fontSize="11px"
            lineHeight="16px"
            fontWeight={600}
            textAlign="center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Box>
        )}
      </MenuButton>
      <MenuList maxW="sm" w="340px">
        <Box px={3} py={2}>
          <Text fontWeight="semibold" fontSize="sm">
            Notifications
          </Text>
        </Box>
        <MenuDivider />
        {notifications.length === 0 ? (
          <Box px={3} py={4}>
            <Text fontSize="sm" color="tx3">
              No notifications yet.
            </Text>
          </Box>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => void handleOpen(notification)}
              flexDirection="column"
              alignItems="flex-start"
              whiteSpace="normal"
              bg={notification.read ? undefined : "acSoft"}
            >
              <Text fontSize="sm" fontWeight={notification.read ? "normal" : "semibold"}>
                {notification.title}
              </Text>
              <Text fontSize="xs" color="tx3" mt={1}>
                {notification.message}
              </Text>
            </MenuItem>
          ))
        )}
        {unreadCount > 0 && (
          <>
            <MenuDivider />
            <MenuItem onClick={() => void handleMarkAllRead()} fontSize="sm">
              Mark all as read
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  );
}
