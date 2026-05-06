interface Props { status: string; }
export function EmployeePortalStatusBadge({ status }: Props) { return <span className="status-badge">{status}</span>; }
