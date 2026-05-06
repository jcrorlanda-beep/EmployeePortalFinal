export interface PortalCurrentUser {
  id: string;
  email: string;
  role: string;
  employeeId?: string | null;
  active: boolean;
  createdAt: string;
}
