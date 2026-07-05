import { withAuth } from "@/lib/api/with-auth";
import { invokeAsUser } from "@/lib/api/invoke-action";
import { jsonError, jsonOk } from "@/lib/api/response";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
} from "@/modules/notifications/actions/notification.actions";

export const GET = withAuth(async (_request, auth, _context) => {
  const result = await invokeAsUser(auth, () => getNotificationsAction());
  if (!result.success) return jsonError(result.error, 401);
  return jsonOk(result.data);
});

export const POST = withAuth(async (_request, auth, _context) => {
  const result = await invokeAsUser(auth, () => markAllNotificationsReadAction());
  if (!result.success) return jsonError(result.error, 400);
  return jsonOk({ message: result.message ?? "OK" });
});
