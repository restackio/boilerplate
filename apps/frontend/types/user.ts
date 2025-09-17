// Types for User data
export interface User {
  id: string;
  workspace_ids: string[];
  name: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

// Types for User creation
export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  avatar_url?: string;
}

// Types for User updates
export interface UserUpdateInput {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}
