import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, withErrorHandler, logActivity } from "@/lib/api-helper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.userOrganization.findMany({
    where: { userId: user.userId },
    include: { organization: true },
  });

  return NextResponse.json({
    success: true,
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      createdAt: m.organization.createdAt,
    })),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
  }

  // Create organization slug
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Ensure unique slug
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

  // Transaction
  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        name,
        slug: finalSlug,
      },
    });

    await tx.userOrganization.create({
      data: {
        userId: user.userId,
        organizationId: newOrg.id,
        role: "ADMIN",
      },
    });

    return newOrg;
  });

  await logActivity("ORG_CREATE", { name: org.name, slug: org.slug }, user.userId, org.id);

  return NextResponse.json({
    success: true,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: "ADMIN",
    },
  });
});
