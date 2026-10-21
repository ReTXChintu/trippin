import { Router } from "express";
import { logout, oidcCallback, oidcMobile, oidcStart } from "@/modules/auth/controllers/auth.controller";

// Sign-in is single sign-on only, through the shared identity server (Trippin, SpendLog, InFrame).
const router = Router();

router.get("/oidc/start", oidcStart);
router.get("/oidc/callback", oidcCallback);
router.post("/oidc/mobile", oidcMobile);
router.post("/logout", logout);
router.get("/logout", logout);

export default router;
