import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { AccessAction } from "@prisma/client";

/**
 * Loguje dostęp do AccessLog. Fire-and-forget — nie blokuje requestu.
 * Wywoływać z server components i server actions.
 */
export async function logAccess(params: {
  userId: string;
  caseId?: string;
  action: AccessAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      null;
    const userAgent = headersList.get("user-agent");

    await db.accessLog.create({
      data: {
        userId: params.userId,
        caseId: params.caseId ?? null,
        action: params.action,
        ipAddress,
        userAgent,
        metadata: (params.metadata ?? null) as never,
      },
    });
  } catch (e) {
    console.error("[logAccess] failed:", e);
  }
}
