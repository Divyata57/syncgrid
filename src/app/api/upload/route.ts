import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentUser, withErrorHandler } from "@/lib/api-helper";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Read file bytes
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Define upload folder in public directory
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  
  // Ensure the uploads directory exists
  await fs.mkdir(uploadDir, { recursive: true });

  // Sanitize filename and create a unique name
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFilename = `${Date.now()}-${sanitizedName}`;
  const fileFullPath = path.join(uploadDir, uniqueFilename);

  // Write file
  await fs.writeFile(fileFullPath, buffer);

  const fileUrl = `/uploads/${uniqueFilename}`;

  return NextResponse.json({
    success: true,
    fileUrl,
    fileName: file.name,
  });
});
