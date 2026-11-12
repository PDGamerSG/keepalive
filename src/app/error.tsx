"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="shell state-page">
      <div className="card state-card" role="alert">
        <h1 className="display page-title">Something interrupted this page.</h1>
        <p className="lede">
          Try loading it again. If you were changing a subscription, check its current status before retrying the action.
        </p>
        <button type="button" className="btn btn-ink" onClick={retry}>
          Try again
        </button>
      </div>
    </main>
  );
}
