interface Props { title: string; message: string; }
export function EmptyStateCard({ title, message }: Props) { return <section className="empty-card"><h3>{title}</h3><p>{message}</p></section>; }
