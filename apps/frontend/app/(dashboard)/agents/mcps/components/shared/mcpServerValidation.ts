import { McpServerFormData } from "./McpServerForm";

/** Result of MCP server form validation */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateMcpServerForm(
  formData: McpServerFormData,
  headerInput: string
): ValidationResult {
  // Validate server label
  if (!formData.server_label.trim()) {
    return { isValid: false, error: "Server label is required" };
  }

  // Validate server URL for non-local servers
  if (!formData.local && !formData.server_url.trim()) {
    return { isValid: false, error: "Server URL is required for remote servers" };
  }

  // Validate headers JSON format
  if (headerInput.trim()) {
    try {
      JSON.parse(headerInput);
    } catch (error) {
      return { isValid: false, error: "Invalid JSON format for headers" };
    }
  }

  return { isValid: true };
}

export function parseHeaders(headerInput: string): Record<string, string> {
  if (!headerInput.trim()) {
    return {};
  }
  
  try {
    return JSON.parse(headerInput);
  } catch {
    return {};
  }
}
