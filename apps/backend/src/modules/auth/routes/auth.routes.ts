import { Router } from "express";
import {
  login,
  register,
  forgotPasswordHandler,
  resetPasswordHandler,
  logout,
} from "@/modules/auth/controllers/auth.controller";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);
router.post("/logout", logout);

export default router;
