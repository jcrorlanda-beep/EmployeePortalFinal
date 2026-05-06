export interface PortalCurrentUser {
  id: string;
  email: string;
  role: string;
  employeeId?: string | null;
  active: boolean;
  createdAt: string;
}

export interface PortalLoginResponse {
  token: string;
  user: Omit<PortalCurrentUser, 'active' | 'createdAt'>;
}

export interface PortalLoginCredentials {
  email: string;
  password: string;
}

export type PortalAuthState =
  | 'loading'
  | 'authenticated'
  | 'anonymous'
  | 'backend-unavailable'
  | 'unauthorized';
