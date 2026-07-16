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

  // Verify membership
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  const orgId = membership.organizationId;

  // 1. Get task status distribution
  const statusGroup = await prisma.task.groupBy({
    by: ["status"],
    where: { organizationId: orgId },
    _count: { _all: true },
  });

  const statuses = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  };

  statusGroup.forEach((g: any) => {
    if (g.status in statuses) {
      statuses[g.status as keyof typeof statuses] = g._count._all;
    }
  });

  // 2. Get task priority distribution
  const priorityGroup = await prisma.task.groupBy({
    by: ["priority"],
    where: { organizationId: orgId },
    _count: { _all: true },
  });

  const priorities = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  };

  priorityGroup.forEach((g) => {
    if (g.priority in priorities) {
      priorities[g.priority as keyof typeof priorities] = g._count._all;
    }
  });

  // 3. Compute completion rate
  const totalTasks = Object.values(statuses).reduce((a, b) => a + b, 0);
  const completedTasks = statuses.DONE;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 4. Get member task distribution
  const tasksByAssignee = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      assignedToId: { not: null },
    },
    select: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const assigneeCounts: Record<string, { name: string; count: number }> = {};
  tasksByAssignee.forEach((t) => {
    if (t.assignee) {
      const id = t.assignee.id;
      if (!assigneeCounts[id]) {
        assigneeCounts[id] = { name: t.assignee.name, count: 0 };
      }
      assigneeCounts[id].count++;
    }
  });

  const memberDistribution = Object.entries(assigneeCounts).map(([userId, info]) => ({
    userId,
    name: info.name,
    taskCount: info.count,
  }));

  // 5. Query total counts
  const totalMembers = await prisma.userOrganization.count({
    where: { organizationId: orgId },
  });

  const totalAuditLogs = await prisma.auditLog.count({
    where: { organizationId: orgId },
  });

  return NextResponse.json({
    success: true,
    analytics: {
      totalTasks,
      completedTasks,
      completionRate,
      statuses,
      priorities,
      memberDistribution,
      totalMembers,
      totalAuditLogs,
    },
  });
});
