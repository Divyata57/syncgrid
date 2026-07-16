export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";
import { withErrorHandler, logActivity } from "@/lib/api-helper";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { name, email, password, orgName } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields: name, email, password" }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create organization slug from organization name
  const rawOrgName = orgName || `${name}'s Org`;
  let slug = rawOrgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Ensure slug is unique
  let isUnique = false;
  let attempt = 0;
  let finalSlug = slug;
  while (!isUnique) {
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: finalSlug },
    });
    if (!existingOrg) {
      isUnique = true;
    } else {
      attempt++;
      finalSlug = `${slug}-${attempt}`;
    }
  }

  // Create User, Organization and UserOrganization relation inside a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    const org = await tx.organization.create({
      data: {
        name: rawOrgName,
        slug: finalSlug,
      },
    });

    await tx.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "ADMIN", // Registering user is the Admin of their default org
      },
    });

    return { user, org };
  });

  const { user, org } = result;

  // Log registration activity
  await logActivity("USER_REGISTER", { email: user.email, orgName: org.name }, user.id, org.id);

  // Generate tokens
  const payload = { userId: user.id, email: user.email, name: user.name };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email },
    organization: { id: org.id, name: org.name, slug: org.slug },
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
