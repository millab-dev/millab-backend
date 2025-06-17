import { Elysia } from "elysia";
import jwt from "@elysiajs/jwt";
import { authMiddleware } from "./auth.middleware";
import { userRepository } from "../repositories/user.repository";

/**
 * Admin middleware that checks if the authenticated user is an admin
 * Must be used after authMiddleware
 */
export const adminMiddleware = new Elysia()
  .use(jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET!,
  }))
  .derive(async ({ headers, jwt, set }) => {
    // First check if user is authenticated
    const accessToken = headers.cookie?.split(';')
      .find(c => c.trim().startsWith('access_token='))
      ?.split('=')[1];

    if (!accessToken) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    const payload = await jwt.verify(accessToken);
    if (!payload || typeof payload !== "object" || !payload.userId) {
      set.status = 401;
      throw new Error("Invalid authentication token");
    }    // Get user from database
    const user = await userRepository.getUserById(String(payload.userId));
    if (!user) {
      set.status = 401;
      throw new Error("User not found");
    }

    // Check if user is admin
    if (!user.isAdmin) {
      set.status = 403;
      throw new Error("Admin access required");
    }

    return {
      user,
      userId: user.id,
    };
  });

/**
 * Combined middleware that includes both auth and admin checks
 */
export const requireAdmin = new Elysia()
  .use(authMiddleware)
  .use(adminMiddleware);
