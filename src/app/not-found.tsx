import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="shell state-page">
      <div className="card state-card">
        <h1 className="display page-title">We couldn’t find that page.</h1>
        <p className="lede">The link may have changed, or this subscription isn’t in this demo.</p>
        <Link href="/shop" className="btn btn-ink">
          Back to Brewbox
        </Link>
      </div>
    </main>
  );
}
