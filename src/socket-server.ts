import "dotenv/config";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { prisma } from "./lib/prisma";

const PORT = process.env.SOCKET_PORT || 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("SyncGrid Real-Time WebSocket Server is Running\n");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, specify Next.js client URL e.g. http://localhost:3000
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Join organization room
  socket.on("join-org", (orgSlug: string) => {
    socket.join(orgSlug);
    console.log(`Socket ${socket.id} joined room (orgSlug): ${orgSlug}`);
  });

  // Leave organization room
  socket.on("leave-org", (orgSlug: string) => {
    socket.leave(orgSlug);
    console.log(`Socket ${socket.id} left room (orgSlug): ${orgSlug}`);
  });

  // Task created event
  socket.on("task-create", (data: { orgSlug: string; task: any; userName: string }) => {
    console.log(`Task created in ${data.orgSlug} by ${data.userName}`);
    socket.to(data.orgSlug).emit("task-created", data);
  });

  // Task updated event
  socket.on("task-update", (data: { orgSlug: string; task: any; userName: string; changeType: string }) => {
    console.log(`Task updated in ${data.orgSlug} by ${data.userName}: ${data.changeType}`);
    socket.to(data.orgSlug).emit("task-updated", data);
  });

  // Task deleted event
  socket.on("task-delete", (data: { orgSlug: string; taskId: string; userName: string; taskTitle: string }) => {
    console.log(`Task deleted in ${data.orgSlug} by ${data.userName}`);
    socket.to(data.orgSlug).emit("task-deleted", data);
  });

  // Collaborative Note edited event
  socket.on("note-edit", (data: { orgSlug: string; notes: string; userName: string }) => {
    console.log(`Notes updated in ${data.orgSlug} by ${data.userName}`);
    socket.to(data.orgSlug).emit("note-edited", data);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// SIMULATED BACKGROUND CRON JOB
// Check for tasks due in the next 24 hours, run every 30 seconds
setInterval(async () => {
  console.log("[Background Job] Checking for tasks due soon...");
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find incomplete tasks due in the next 24 hours
    const tasksDueSoon = await prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: {
          gt: now,
          lte: tomorrow,
        },
      },
      include: {
        organization: true,
        creator: true,
        assignee: true,
      },
    });

    for (const task of tasksDueSoon) {
      console.log(
        `[Background Job ALERT] Task "${task.title}" is due soon (due ${task.dueDate}). Owner: ${task.creator.email}`
      );

      // Create an audit log entry for background alert
      await prisma.auditLog.create({
        data: {
          action: "BACKGROUND_CRON_ALERT",
          details: JSON.stringify({
            message: `Simulated Email Sent to: ${task.creator.email}. Alert: Task "${task.title}" is due in less than 24 hours!`,
            taskTitle: task.title,
            taskId: task.id,
            dueDate: task.dueDate,
          }),
          organizationId: task.organizationId,
        },
      });

      // Broadcast alert to organization room in real-time
      io.to(task.organization.slug).emit("due-soon-alert", {
        message: `Task "${task.title}" is due soon! (Due: ${new Date(task.dueDate!).toLocaleTimeString()})`,
        taskId: task.id,
        taskTitle: task.title,
      });
    }
  } catch (error) {
    console.error("[Background Job ERROR] Failed to check due tasks:", error);
  }
}, 30000); // 30 seconds

httpServer.listen(PORT, () => {
  console.log(`Socket.io server listening on port ${PORT}`);
});
