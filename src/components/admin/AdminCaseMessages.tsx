"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MessageThread, type MessageItem } from "@/components/shared/MessageThread";
import { sendMessageAction } from "@/lib/client-actions";
import { clearMessagesAction } from "@/lib/admin-actions";
import { Trash2 } from "lucide-react";

interface Props {
  caseId: string;
  messages: MessageItem[];
  currentUserId: string;
}

export function AdminCaseMessages({ caseId, messages, currentUserId }: Props) {
  const t = useTranslations("admin.messages");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSend = async (body: string) => {
    return sendMessageAction({ caseId, body });
  };

  const handleClear = () => {
    if (!confirm(t("clearConfirm"))) return;
    startTransition(async () => {
      await clearMessagesAction(caseId);
      router.refresh();
    });
  };

  return (
    <div>
      {messages.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("clear")}
          </button>
        </div>
      )}
      <MessageThread
        messages={messages}
        currentUserId={currentUserId}
        onSend={handleSend}
        namespace="admin.messages"
      />
    </div>
  );
}
