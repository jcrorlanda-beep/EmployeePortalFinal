interface Props { status: string; }

export function EmployeePortalStatusBadge({ status }: Props) {
  const normalizedStatus = status.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <span className={`status-badge status-badge-${normalizedStatus}`}>{status}</span>;
}
