"use client";

import { MessageThread, type MessageItem } from "@/components/shared/MessageThread";
import { sendMessageAction } from "@/lib/client-actions";

interface Props {
  caseId: string;
  messages: MessageItem[];
  currentUserId: string;
}

export function CaseMessages({ caseId, messages, currentUserId }: Props) {
  const handleSend = async (body: string) => {
    return sendMessageAction({ caseId, body });
  };

  return (
    <MessageThread
      messages={messages}
      currentUserId={currentUserId}
      onSend={handleSend}
      namespace="panel.case"
    />
  );
}
