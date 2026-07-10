export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ApprovalRequest {
  runId: string;
  toolCallId?: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ChatStreamHandlers {
  onDelta: (text: string) => void;
  onThread: (threadId: string) => void;
  onDone: (threadId: string) => void;
  onError: (message: string) => void;
  onApprovalRequest: (request: ApprovalRequest) => void;
}
