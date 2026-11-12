export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading page"
      className="page-loading"
    >
      <p role="status">
        <span className="spinner" />
        Opening your page…
      </p>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-block" />
      <div className="skeleton skeleton-line" />
    </section>
  );
}
