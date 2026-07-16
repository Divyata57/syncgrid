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
    return NextResponse.json({ error: "orgSlug parameter is required" }, { status: 400 });
  }

  // Verify membership
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

  const orgId = membership.organizationId;

  // Pagination parameters
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;

  // Filters
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const priority = searchParams.get("priority") || "";

  // Sorting
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Build prisma query filters
  const whereClause: any = {
    organizationId: orgId,
  };

  if (search) {
    whereClause.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) {
    whereClause.status = status;
  }

  if (priority) {
    whereClause.priority = priority;
  }

  // Query count & records in parallel
  const [totalCount, tasks] = await Promise.all([
    prisma.task.count({ where: whereClause }),
    prisma.task.findMany({
      where: whereClause,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    success: true,
    tasks,
    pagination: {
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      limit,
    },
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, status, priority, dueDate, assignedToId, fileUrl, fileName, orgSlug } = body;

  if (!title || !orgSlug) {
    return NextResponse.json({ error: "Missing required fields: title, orgSlug" }, { status: 400 });
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

  // Create Task
  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      organizationId: orgId,
      createdById: user.userId,
      assignedToId: assignedToId || null,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  await logActivity(
    "TASK_CREATE",
    { taskId: task.id, title: task.title, status: task.status, priority: task.priority },
    user.userId,
    orgId
  );

  return NextResponse.json({
    success: true,
    task,
  });
});
