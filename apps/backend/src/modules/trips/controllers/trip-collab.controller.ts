import type { Request, Response } from "express";
import { sendResult } from "@/lib/response";
import {
  acceptInvite,
  addComment,
  deleteComment,
  getOrCreateInvite,
  listComments,
  previewInvite,
  votePlace,
} from "@/modules/trips/services/trip-collab.service";
import { setTripMemberRole } from "@/modules/trips/services/trip-members.service";

const uid = (req: Request) => req.user!.sub;

export const setRole = async (req: Request, res: Response) =>
  sendResult(res, await setTripMemberRole(req.params.id, uid(req), req.params.userId, req.body?.role));
export const invite = async (req: Request, res: Response) => sendResult(res, await getOrCreateInvite(uid(req), req.params.id, req.body ?? {}));
export const vote = async (req: Request, res: Response) => sendResult(res, await votePlace(uid(req), req.params.id, req.body ?? {}));
export const comments = async (req: Request, res: Response) => sendResult(res, await listComments(uid(req), req.params.id));
export const comment = async (req: Request, res: Response) => sendResult(res, await addComment(uid(req), req.params.id, req.body ?? {}));
export const removeComment = async (req: Request, res: Response) =>
  sendResult(res, await deleteComment(uid(req), req.params.id, req.params.commentId));

export const invitePreview = async (req: Request, res: Response) => sendResult(res, await previewInvite(uid(req), req.params.token));
export const inviteAccept = async (req: Request, res: Response) => sendResult(res, await acceptInvite(uid(req), req.params.token));
