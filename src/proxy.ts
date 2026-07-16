import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken, verifyRefreshToken, signAccessToken } from "./lib/jwt";
import { prisma } from "./lib/prisma";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude static assets, api routes, icons, public uploads
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // Get cookies
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  let user = null;
  let response = NextResponse.next();

  // Try to verify access token
  if (accessToken) {
    user = verifyAccessToken(accessToken);
  }

  // If access token is expired/missing, check refresh token
  if (!user && refreshToken) {
    user = verifyRefreshToken(refreshToken);
    // If refresh token is valid, silently issue a new access token
    if (user) {
      const newAccessToken = signAccessToken({
        userId: user.userId,
        email: user.email,
        name: user.name,
      });

      // Set new access token cookie
      response.cookies.set("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60, // 15 minutes
      });
    }
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // If not authenticated and trying to access app pages
  if (!user) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    // Redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access auth pages
  if (isAuthPage) {
    return NextResponse.redirect(new URL("/orgs", request.url));
  }

  // If accessing tenant routes `/org/[slug]/...`
  const orgMatch = pathname.match(/^\/org\/([^/]+)/);
  if (orgMatch) {
    const slug = orgMatch[1];

    try {
      // Check if user is a member of this organization slug
      const membership = await prisma.userOrganization.findFirst({
        where: {
          userId: user.userId,
          organization: {
            slug: slug,
          },
        },
        include: {
          organization: true,
        },
      });

      if (!membership) {
        // Not a member, redirect to org selection screen
        return NextResponse.redirect(new URL("/orgs", request.url));
      }
    } catch (error) {
      console.error("Database check failed in proxy:", error);
      // Fallback: allow request in case of database issues to prevent hard bricking, 
      // or redirect to a safe page. Let's redirect to `/orgs`
      return NextResponse.redirect(new URL("/orgs", request.url));
    }
  }

  return response;
}

export const config = {
  // Run on dashboard, tasks, members, audit-logs, org selection, login, register
  matcher: [
    "/login",
    "/register",
    "/orgs/:path*",
    "/org/:path*",
  ],
};
