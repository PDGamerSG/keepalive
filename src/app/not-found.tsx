import Link from "next/link";

export default function NotFound() {
  return <div className="workspace max-w-2xl py-16"><div className="card p-8 text-center">
    <h1 className="font-[family-name:var(--font-display)] text-3xl">We couldn’t find that page.</h1>
    <p className="text-muted mt-3">The link may have changed, or this subscription isn’t in this demo.</p>
    <Link href="/shop" className="btn btn-primary mt-6">Back to Brewbox</Link>
  </div></div>;
}
