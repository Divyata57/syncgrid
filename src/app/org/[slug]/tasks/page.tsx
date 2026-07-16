"use client";

import { useEffect, useState } from "react";
import { useOrg } from "../layout";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  User,
  Calendar,
  AlertCircle,
  Paperclip,
  Trash2,
  X,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserCheck
} from "lucide-react";

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdById: string;
  assignedToId: string | null;
  createdAt: string;
  creator: { name: string; email: string };
  assignee: { name: string; email: string } | null;
}

export default function TasksPage() {
  const { organization, user, socket } = useOrg();
  const orgSlug = organization?.slug;
  const isAdmin = organization?.role === "ADMIN";

  // Data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 5,
  });

  // Query states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (orgSlug) {
      fetchTasks();
      fetchMembers();
    }
  }, [orgSlug, page, statusFilter, priorityFilter, sortBy, sortOrder]);

  // Real-time synchronization hooks
  useEffect(() => {
    if (!socket || !orgSlug) return;

    const handleCreated = () => fetchTasks();
    const handleUpdated = () => fetchTasks();
    const handleDeleted = () => fetchTasks();

    socket.on("task-created", handleCreated);
    socket.on("task-updated", handleUpdated);
    socket.on("task-deleted", handleDeleted);

    return () => {
      socket.off("task-created", handleCreated);
      socket.off("task-updated", handleUpdated);
      socket.off("task-deleted", handleDeleted);
    };
  }, [socket, orgSlug]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const url = `/api/tasks?orgSlug=${orgSlug}&page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(
        search
      )}&status=${statusFilter}&priority=${priorityFilter}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/members?orgSlug=${orgSlug}`);
      const data = await res.json();
      if (res.ok) setMembers(data.members);
    } catch (err) {
      console.error("Failed to load members:", err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTasks();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setFileUrl(data.fileUrl);
      setFileName(data.fileName);
    } catch (err) {
      alert("File upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setDueDate("");
    setAssignedToId("");
    setFileUrl("");
    setFileName("");
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          dueDate: dueDate || null,
          assignedToId: assignedToId || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          orgSlug,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Emit socket notification
      if (socket) {
        socket.emit("task-create", {
          orgSlug,
          task: data.task,
          userName: user.name,
        });
      }

      setShowCreateModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      alert("Failed to create task: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTaskStatus = async (taskToUpdate: Task, nextStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskToUpdate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (socket) {
        socket.emit("task-update", {
          orgSlug,
          task: data.task,
          userName: user.name,
          changeType: "status",
        });
      }
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskClick = (clickedTask: Task) => {
    setActiveTask(clickedTask);
    // Populate form for editing
    setTitle(clickedTask.title);
    setDescription(clickedTask.description || "");
    setStatus(clickedTask.status);
    setPriority(clickedTask.priority);
    setDueDate(clickedTask.dueDate ? clickedTask.dueDate.substring(0, 10) : "");
    setAssignedToId(clickedTask.assignedToId || "");
    setFileUrl(clickedTask.fileUrl || "");
    setFileName(clickedTask.fileName || "");
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${activeTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          status,
          priority,
          dueDate: dueDate || null,
          assignedToId: assignedToId || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (socket) {
        socket.emit("task-update", {
          orgSlug,
          task: data.task,
          userName: user.name,
          changeType: "details",
        });
      }

      setActiveTask(null);
      resetForm();
      fetchTasks();
    } catch (err) {
      alert("Failed to edit task: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!activeTask) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${activeTask.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (socket) {
        socket.emit("task-delete", {
          orgSlug,
          taskId: activeTask.id,
          userName: user.name,
          taskTitle: activeTask.title,
        });
      }

      setActiveTask(null);
      resetForm();
      fetchTasks();
    } catch (err) {
      alert("Failed to delete task: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">Tasks Workspace</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage and collaborate on organization tasks.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-medium text-sm text-white shadow-lg cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      {/* Query Filters Dashboard */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg flex items-center relative">
          <input
            type="text"
            placeholder="Search by task title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-red-600 transition-colors"
          />
          <button type="submit" className="absolute left-3 text-zinc-700 hover:text-red-500">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Filters and Sorters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Completed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="createdAt">Date Created</option>
              <option value="dueDate">Due Date</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Workspace */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-950 border border-zinc-900 text-zinc-550 text-sm">
          No tasks found matching your filter parameters.
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((t) => {
            const isCompleted = t.status === "DONE";
            const priorityColors =
              t.priority === "HIGH"
                ? "bg-rose-950/20 text-rose-500 border-rose-900/50"
                : t.priority === "MEDIUM"
                ? "bg-amber-950/20 text-amber-500 border-amber-900/50"
                : "bg-zinc-900 text-zinc-400 border-zinc-800";

            return (
              <div
                key={t.id}
                className="w-full glass-panel hover:bg-[#0a0a0c] border border-zinc-900 hover:border-red-950/30 p-5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 group cursor-pointer relative"
              >
                {/* Visual side-border matching priority for premium touch */}
                <div
                  className={`absolute left-0 top-4 bottom-4 w-[2px] rounded-r-md ${
                    t.priority === "HIGH" ? "bg-rose-500" : t.priority === "MEDIUM" ? "bg-amber-500" : "bg-zinc-700"
                  }`}
                />

                {/* Left block (Check + Titles) */}
                <div className="flex items-start gap-4 flex-1 min-w-0" onClick={() => handleTaskClick(t)}>
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        handleUpdateTaskStatus(t, e.target.checked ? "DONE" : "TODO");
                      }}
                      className="w-4.5 h-4.5 bg-zinc-950 border-zinc-800 rounded accent-red-600 focus:ring-0 focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <h3
                      className={`text-sm font-semibold truncate group-hover:text-red-500 transition-colors ${
                        isCompleted ? "text-zinc-650 line-through" : "text-white"
                      }`}
                    >
                      {t.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-zinc-500">
                      {/* Assignee */}
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Assignee: {t.assignee?.name || "Unassigned"}
                      </span>

                      {/* Due date */}
                      {t.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      )}

                      {/* File attachment indicator */}
                      {t.fileUrl && (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <Paperclip className="w-3 h-3" />
                          Attachment
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right block (Status changer, priority pill) */}
                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t border-zinc-950 md:border-none pt-3 md:pt-0">
                  {/* Priority Pill */}
                  <span className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold ${priorityColors}`}>
                    {t.priority}
                  </span>

                  {/* Status selection */}
                  <select
                    value={t.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleUpdateTaskStatus(t, e.target.value)}
                    className="bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-1.5 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-900 pt-5">
          <span className="text-xs text-zinc-550">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white rounded-lg disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="p-1.5 border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white rounded-lg disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ==================== CREATE TASK MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          
          <div className="bg-[#0a0a0c] border border-zinc-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative z-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Create Workspace Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement refresh tokens check"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-red-650"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Description</label>
                <textarea
                  placeholder="Describe the objective and requirements of the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-red-655 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Assigned To</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="">Select Member</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Attachment Area */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Attachments</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors shrink-0">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Upload Attachment</span>
                    <input type="file" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                  ) : fileName ? (
                    <span className="text-[10px] text-red-400 font-medium truncate flex items-center gap-1">
                      <FileText className="w-3 h-3 text-red-500 shrink-0" /> {fileName}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-600">No file selected</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-lg disabled:opacity-50 cursor-pointer transition-colors"
              >
                {submitting ? "Creating task..." : "Add Task"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== EDIT/DETAIL MODAL ==================== */}
      {activeTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActiveTask(null)} />
          
          <div className="bg-[#0a0a0c] border border-zinc-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative z-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Task Details</h3>
              <button onClick={() => setActiveTask(null)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTask} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement refresh tokens check"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-red-650"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Description</label>
                <textarea
                  placeholder="Describe the objective and requirements of the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white placeholder-zinc-700 text-xs focus:outline-none focus:border-red-655 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Assigned To</label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full bg-[#0d0d10] border border-zinc-850 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-red-650"
                  >
                    <option value="">Select Member</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Attachments view and edit */}
              <div>
                <label className="block text-zinc-400 text-xs mb-2 uppercase tracking-wide">Attachments</label>
                <div className="flex flex-col gap-2">
                  {fileUrl && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-900">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-red-500 font-medium hover:underline flex items-center gap-1.5 truncate"
                      >
                        <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{fileName || "Download Attachment"}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setFileUrl("");
                          setFileName("");
                        }}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white text-xs cursor-pointer transition-colors shrink-0">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{fileUrl ? "Change Attachment" : "Upload Attachment"}</span>
                      <input type="file" onChange={handleFileUpload} className="hidden" />
                    </label>
                    {uploading && <Loader2 className="w-4 h-4 text-red-500 animate-spin" />}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-zinc-900">
                {/* Delete button (Admins only) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    disabled={submitting}
                    className="px-4 rounded-xl border border-rose-900/40 hover:border-rose-700 bg-rose-950/20 text-rose-500 hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-lg disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {submitting ? "Saving changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
