"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="notice" role="alert">
      <h1 className="text-xl font-semibold">This page could not load.</h1>
      <p className="my-3">Check your connection and try again.</p>
      <button className="primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
