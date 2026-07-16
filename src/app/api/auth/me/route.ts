import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, withErrorHandler } from "@/lib/api-helper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const response = NextResponse.next();
  const userPayload = await getCurrentUser(req, response);

  if (!userPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch full user details from DB
  const user = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      organizations: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const resultResponse = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    },
    organizations: user.organizations.map((uo) => ({
      id: uo.organization.id,
      name: uo.organization.name,
      slug: uo.organization.slug,
      role: uo.role,
    })),
  });

  // Transfer any updated cookies set during getCurrentUser refresh
  const newAccessCookie = response.cookies.get("accessToken");
  if (newAccessCookie) {
    resultResponse.cookies.set("accessToken", newAccessCookie.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  return resultResponse;
});
