import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken, signAccessToken } from "./jwt";
import { prisma } from "./prisma";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
}

/**
 * Gets the current logged-in user from the cookies.
 * It also handles silent token refreshing if the access token has expired but the refresh token is valid.
 */
export async function getCurrentUser(req: NextRequest, res?: NextResponse): Promise<AuthenticatedUser | null> {
  const accessToken = req.cookies.get("accessToken")?.value;
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (accessToken) {
    const decoded = verifyAccessToken(accessToken);
    if (decoded) return decoded;
  }

  if (refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);
    if (decoded) {
      // Access token was expired, but refresh token is valid.
      // Generate a new access token.
      const newPayload = {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };

      const newAccessToken = signAccessToken(newPayload);

      // If a response is passed, we can set the cookie on it
      if (res) {
        res.cookies.set("accessToken", newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 15 * 60, // 15 mins
        });
      }
      
      return newPayload;
    }
  }

  return null;
}

/**
 * Logs an activity into the AuditLog table
 */
export async function logActivity(
  action: string,
  details: any,
  userId?: string,
  organizationId?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        details: typeof details === "string" ? details : JSON.stringify(details),
        userId: userId || null,
        organizationId: organizationId || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

/**
 * Higher-order function to wrap API handlers with error handling and rate limiting check
 */
export function withErrorHandler(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    try {
      // Simple Rate Limiting Check (Bonus Requirement)
      // Stores timestamps in a simple global cache for basic IP rate limiting
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      const now = Date.now();
      const limitWindow = 60 * 1000; // 1 minute
      const limitMax = 60; // 60 requests per minute

      if (!global.rateLimitCache) {
        global.rateLimitCache = new Map<string, number[]>();
      }

      const clientRequests = global.rateLimitCache.get(ip) || [];
      const recentRequests = clientRequests.filter((time) => now - time < limitWindow);
      
      if (recentRequests.length >= limitMax) {
        return NextResponse.json(
          { error: "Too many requests. Rate limit exceeded." },
          { status: 429 }
        );
      }

      recentRequests.push(now);
      global.rateLimitCache.set(ip, recentRequests);

      // Proceed with the request
      return await handler(req, context);
    } catch (error: any) {
      console.error("API Route Error:", error);
      return NextResponse.json(
        {
          error: error.message || "Internal Server Error",
          code: error.code || "INTERNAL_ERROR",
        },
        { status: error.status || 500 }
      );
    }
  };
}

// Add global declaration for rateLimitCache to typescript
declare global {
  var rateLimitCache: Map<string, number[]> | undefined;
}
