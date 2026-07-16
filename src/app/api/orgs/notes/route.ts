import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, withErrorHandler, logActivity } from "@/lib/api-helper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgSlug = searchParams.get("orgSlug");

  if (!orgSlug) {
    return NextResponse.json({ error: "orgSlug is required" }, { status: 400 });
  }

  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
    include: { organization: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    notes: membership.organization.notes,
  });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug, notes } = await req.json();

  if (!orgSlug || notes === undefined) {
    return NextResponse.json({ error: "Missing required fields: orgSlug, notes" }, { status: 400 });
  }

  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
    include: { organization: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  // Update notes
  const updatedOrg = await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { notes },
  });

  await logActivity(
    "NOTE_UPDATE",
    { length: notes.length },
    user.userId,
    membership.organizationId
  );

  return NextResponse.json({
    success: true,
    notes: updatedOrg.notes,
  });
});
