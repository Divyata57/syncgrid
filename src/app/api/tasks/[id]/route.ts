import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, withErrorHandler, logActivity } from "@/lib/api-helper";

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      organization: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify membership
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organizationId: task.organizationId,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this task" }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    task,
  });
});

export const PUT = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, dueDate, assignedToId, fileUrl, fileName } = body;

  const task = await prisma.task.findUnique({
    where: { id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify membership
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organizationId: task.organizationId,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this task" }, { status: 403 });
  }

  // Update Task
  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title: title !== undefined ? title : undefined,
      description: description !== undefined ? description : undefined,
      status: status !== undefined ? status : undefined,
      priority: priority !== undefined ? priority : undefined,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      assignedToId: assignedToId !== undefined ? (assignedToId ? assignedToId : null) : undefined,
      fileUrl: fileUrl !== undefined ? (fileUrl ? fileUrl : null) : undefined,
      fileName: fileName !== undefined ? (fileName ? fileName : null) : undefined,
    },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // Calculate changed details for log
  const changes: any = {};
  if (title !== undefined && title !== task.title) changes.title = title;
  if (status !== undefined && status !== task.status) changes.status = status;
  if (priority !== undefined && priority !== task.priority) changes.priority = priority;
  if (assignedToId !== undefined && assignedToId !== task.assignedToId) changes.assignedToId = assignedToId;

  await logActivity(
    "TASK_UPDATE",
    { taskId: task.id, title: updatedTask.title, changes },
    user.userId,
    task.organizationId
  );

  return NextResponse.json({
    success: true,
    task: updatedTask,
  });
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify membership and role (Only ADMIN can delete)
  const membership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organizationId: task.organizationId,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Unauthorized access to this task" }, { status: 403 });
  }

  if (membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only administrators can delete tasks" }, { status: 403 });
  }

  // Delete Task
  await prisma.task.delete({
    where: { id },
  });

  await logActivity(
    "TASK_DELETE",
    { taskId: task.id, title: task.title },
    user.userId,
    task.organizationId
  );

  return NextResponse.json({
    success: true,
    message: "Task deleted successfully",
  });
});
