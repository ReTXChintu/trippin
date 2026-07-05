"use client";

import {
  Badge,
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/modules/notifications/actions/notification.actions";
import type { NotificationDTO } from "@/repositories/notification.repository";

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuBg = useColorModeValue("white", "gray.800");

  const load = useCallback(async () => {
    const result = await getNotificationsAction();
    if (result.success && result.data) {
      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpen = async (notification: NotificationDTO) => {
    if (!notification.read) {
      await markNotificationReadAction(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notification.tripId) {
      router.push(`/trips/${notification.tripId}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <Menu onOpen={() => void load()}>
      <MenuButton
        as={IconButton}
        aria-label="Notifications"
        icon={<FiBell />}
        variant="ghost"
        position="relative"
      >
        {unreadCount > 0 && (
          <Badge
            colorScheme="red"
            borderRadius="full"
            position="absolute"
            top={1}
            right={1}
            fontSize="0.6rem"
            minW={4}
            textAlign="center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </MenuButton>
      <MenuList bg={menuBg} maxW="sm" w="320px">
        <Box px={3} py={2}>
          <Text fontWeight="semibold" fontSize="sm">
            Notifications
          </Text>
        </Box>
        <MenuDivider />
        {notifications.length === 0 ? (
          <Box px={3} py={4}>
            <Text fontSize="sm" color="gray.500">
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
              bg={notification.read ? undefined : "brand.50"}
              _dark={{ bg: notification.read ? undefined : "gray.700" }}
            >
              <Text fontSize="sm" fontWeight={notification.read ? "normal" : "semibold"}>
                {notification.title}
              </Text>
              <Text fontSize="xs" color="gray.500" mt={1}>
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
