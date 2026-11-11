"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return <div className="workspace max-w-2xl py-16"><div className="card p-8 text-center" role="alert">
    <h1 className="font-[family-name:var(--font-display)] text-3xl">Something interrupted this page.</h1>
    <p className="text-muted mt-3">Try loading it again. If you were changing a subscription, check its current status before retrying the action.</p>
    <button className="btn btn-primary mt-6" onClick={retry}>Try again</button>
  </div></div>;
}
