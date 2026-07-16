import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, withErrorHandler } from "@/lib/api-helper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgSlug = searchParams.get("orgSlug");

  if (!orgSlug) {
    return NextResponse.json({ error: "orgSlug parameter is required" }, { status: 400 });
  }

  // Verify membership and role (Only ADMIN can view logs)
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  if (membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only administrators can view audit logs" }, { status: 403 });
  }

  // Fetch logs
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100, // limit to recent 100 logs
  });

  return NextResponse.json({
    success: true,
    logs,
  });
});
