import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "syncgrid-secret-key-change-in-prod";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "syncgrid-refresh-secret-key-change-in-prod";

export interface UserTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function signAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch (e) {
    return null;
  }
}

export function verifyRefreshToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as UserTokenPayload;
  } catch (e) {
    return null;
  }
}
