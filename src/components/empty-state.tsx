import Link from "next/link";

export function EmptyState({ title, children, href, action }: {
  title: string; children: React.ReactNode; href?: string; action?: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{children}</p>
      {href && action && <Link className="btn btn-primary mt-4" href={href}>{action}</Link>}
    </div>
  );
}
