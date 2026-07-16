import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { withErrorHandler, logActivity } from "@/lib/api-helper";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing required fields: email, password" }, { status: 400 });
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organizations: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Determine active organization if any
  const primaryMembership = user.organizations[0];
  const activeOrg = primaryMembership ? primaryMembership.organization : null;

  // Log login activity
  await logActivity("USER_LOGIN", { email: user.email }, user.id, activeOrg?.id);

  // Generate tokens
  const payload = { userId: user.id, email: user.email, name: user.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email },
    organizations: user.organizations.map((uo) => ({
      id: uo.organization.id,
      name: uo.organization.name,
      slug: uo.organization.slug,
      role: uo.role,
    })),
  });

  // Set cookies
  response.cookies.set("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 mins
  });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
});
