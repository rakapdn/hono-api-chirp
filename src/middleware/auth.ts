import { MiddlewareHandler } from "hono";
import { verifyToken } from "../lib/jwt";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.text("Unauthorized", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    c.set("user", decoded);
    await next();
  } catch {
    return c.text("Invalid token", 401);
  }
};
