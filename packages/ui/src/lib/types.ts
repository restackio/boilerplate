export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  domain?: string;
  priority?: "low" | "medium" | "high";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  taskId?: string;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
}
