import type { OidcClaims } from "@/lib/oidc";
import type { IUserDocument } from "@/models/User";
import { claimPendingMemberships } from "@/modules/trips/services/trip-members.service";
import { UserRepository } from "@/repositories/user.repository";

export type OidcSignInResult =
  | { success: true; user: IUserDocument; joinedTripIds: string[] }
  /** `code` goes back to the login page as `?error=`. */
  | { success: false; code: string; error: string };

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

/**
 * The local Trippin user for an identity-server sign-in. The user's `_id` never changes, so trips,
 * comments and everything else that references it keep working.
 *   1. the account already linked to this subject;
 *   2. else an account with the same email — linked only when the identity server has verified
 *      that email (otherwise anyone could claim an account by typing its address);
 *   3. else a new account.
 * Then any email invites for that verified address are claimed.
 */
export async function signInWithOidc(claims: OidcClaims): Promise<OidcSignInResult> {
  let user = await UserRepository.findByOidcSub(claims.sub);

  if (!user) {
    const byEmail = await UserRepository.findByEmail(claims.email);
    if (byEmail) {
      if (!claims.emailVerified) {
        return {
          success: false,
          code: "email_unverified",
          error: "A Trippin account already uses this email. Verify your email address with your account, then sign in again.",
        };
      }
      if (byEmail.oidcSub && byEmail.oidcSub !== claims.sub) {
        return { success: false, code: "account_conflict", error: "This email belongs to a Trippin account linked to someone else." };
      }
      user = await UserRepository.linkOidcSub(byEmail._id.toString(), claims.sub, claims.picture);
    } else {
      try {
        user = await UserRepository.create({
          name: claims.name,
          email: claims.email,
          oidcSub: claims.sub,
          avatar: claims.picture,
        });
      } catch (err) {
        // Two first sign-ins at once (web + phone): the other one created it.
        if (!isDuplicateKey(err)) throw err;
        user = await UserRepository.findByOidcSub(claims.sub);
      }
    }
  }

  if (!user) return { success: false, code: "failed", error: "Sign-in failed. Try again." };

  const joinedTripIds = claims.emailVerified ? await claimPendingMemberships(user._id.toString(), claims.email) : [];
  return { success: true, user, joinedTripIds };
}
