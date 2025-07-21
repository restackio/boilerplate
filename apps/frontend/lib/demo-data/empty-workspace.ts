import { Box } from "lucide-react";
import { WorkspaceData } from "./types";

export const emptyWorkspaceData: WorkspaceData = {
  workspace: {
    name: "MyWorkspace",
    logo: Box,
    plan: "Free",
  },
  user: {
    name: "Philippe",
    email: "philippe@demo.com",
    avatar: "/avatars/philippe.jpg",
  },
  navigation: {
    teams: [],
  },
  tasks: [],
  agents: [],
  feedbacks: [],
  rules: [],
  scenarios: [],
  simulations: [],
  experiments: [],
};
