/**
 * Fetch blob in worker and cache it via main-thread shared object.
 */
export const getBlob = async (url, blobs) =>
  new Promise((resolve) => {
    const cached = blobs[url];
    if (cached) return resolve(cached);

    const id = Date.now();
    let xContentLength;
    self.postMessage({ kind: 'fetch', id, url });

    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onprogress = (event) =>
      self.postMessage({
        kind: 'fetch',
        id,
        url,
        total: xContentLength ?? event.total,
        loaded: event.loaded,
      });
    xhr.onreadystatechange = () => {
      if (
        xhr.readyState >= xhr.HEADERS_RECEIVED &&
        xContentLength === undefined &&
        xhr.getAllResponseHeaders().includes('x-content-length')
      ) {
        xContentLength = Number(xhr.getResponseHeader('x-content-length'));
      }

      if (xhr.readyState === xhr.DONE) {
        self.postMessage({ kind: 'fetch', id, url, blob: xhr.response });
        resolve(xhr.response);
      }
    };
    xhr.open('GET', url);
    xhr.send();
  });
