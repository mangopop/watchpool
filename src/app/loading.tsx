import "./loading.css";

// Next.js swaps this in immediately on navigation to `/`, while the Server
// Component below keeps fetching — without it, a slow connection just shows
// a blank screen until everything resolves, which read as the tap doing
// nothing.
export default function Loading() {
  return (
    <div className="route-loading">
      <div className="spinner" role="status" aria-label="Loading" />
    </div>
  );
}
