import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, withErrorHandler, logActivity } from "@/lib/api-helper";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  
  if (user) {
    await logActivity("USER_LOGOUT", { email: user.email }, user.userId);
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  // Clear cookies by setting maxAge to 0
  response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
  response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });

  return response;
});
