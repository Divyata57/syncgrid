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
  const requesterMembership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
  });

  if (!requesterMembership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  // List all members of this organization
  const members = await prisma.userOrganization.findMany({
    where: { organizationId: requesterMembership.organizationId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return NextResponse.json({
    success: true,
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    })),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug, email, role } = await req.json();

  if (!orgSlug || !email) {
    return NextResponse.json({ error: "Missing required fields: orgSlug, email" }, { status: 400 });
  }

  // Verify requester is ADMIN of the organization
  const requesterMembership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
  });

  if (!requesterMembership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  if (requesterMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only administrators can add members" }, { status: 403 });
  }

  // Find target user by email
  const targetUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User with this email is not registered yet" }, { status: 404 });
  }

  // Check if target user is already a member
  const existingMembership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: targetUser.id,
        organizationId: requesterMembership.organizationId,
      },
    },
  });

  if (existingMembership) {
    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 });
  }

  // Add target user to organization
  const newMembership = await prisma.userOrganization.create({
    data: {
      userId: targetUser.id,
      organizationId: requesterMembership.organizationId,
      role: role === "ADMIN" ? "ADMIN" : "MEMBER",
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  await logActivity(
    "MEMBER_ADD",
    { addedUserEmail: email, role: newMembership.role },
    user.userId,
    requesterMembership.organizationId
  );

  return NextResponse.json({
    success: true,
    member: {
      id: newMembership.id,
      userId: newMembership.userId,
      name: newMembership.user.name,
      email: newMembership.user.email,
      role: newMembership.role,
      joinedAt: newMembership.createdAt,
    },
  });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgSlug, userId, role } = await req.json();

  if (!orgSlug || !userId || !role) {
    return NextResponse.json({ error: "Missing required fields: orgSlug, userId, role" }, { status: 400 });
  }

  // Verify requester is ADMIN of the organization
  const requesterMembership = await prisma.userOrganization.findFirst({
    where: {
      userId: user.userId,
      organization: { slug: orgSlug },
    },
  });

  if (!requesterMembership) {
    return NextResponse.json({ error: "Unauthorized access to this organization" }, { status: 403 });
  }

  if (requesterMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only administrators can modify roles" }, { status: 403 });
  }

  // Check target membership
  const targetMembership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: requesterMembership.organizationId,
      },
    },
    include: {
      user: true,
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found in this organization" }, { status: 404 });
  }

  // Check if trying to demote themselves
  if (targetMembership.userId === user.userId && role !== "ADMIN") {
    // Count how many admins are left
    const adminCount = await prisma.userOrganization.count({
      where: {
        organizationId: requesterMembership.organizationId,
        role: "ADMIN",
      },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote yourself. There must be at least one administrator." },
        { status: 400 }
      );
    }
  }

  // Update role
  const updatedMembership = await prisma.userOrganization.update({
    where: {
      id: targetMembership.id,
    },
    data: {
      role: role === "ADMIN" ? "ADMIN" : "MEMBER",
    },
  });

  await logActivity(
    "ROLE_CHANGE",
    { targetEmail: targetMembership.user.email, oldRole: targetMembership.role, newRole: updatedMembership.role },
    user.userId,
    requesterMembership.organizationId
  );

  return NextResponse.json({
    success: true,
    member: {
      id: updatedMembership.id,
      userId: updatedMembership.userId,
      name: targetMembership.user.name,
      email: targetMembership.user.email,
      role: updatedMembership.role,
    },
  });
});
