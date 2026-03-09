// Prefetch onnxruntime-web so the browser caches the JS chunks before
// the user enters the reader page. Fire-and-forget, runs at most once.

let prefetched = false;

/**
 * Trigger a background import of onnxruntime-web.
 * Safe to call multiple times — only executes the import once.
 */
export function prefetchOnnxRuntime() {
  if (prefetched) return;
  prefetched = true;
  import('onnxruntime-web').catch(() => {
    // Swallow silently — this is best-effort prefetch only
    prefetched = false; // allow retry on next call if import failed
  });
}
