// iOS Safari/Chrome before 17.4 lack AbortSignal.any (and <16 lack .timeout); calling them threw
// a TypeError before fetch, so camera analysis failed without ever reaching the server.
if (typeof AbortSignal !== 'undefined') {
  if (!AbortSignal.timeout)
    AbortSignal.timeout = (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('signal timed out', 'TimeoutError')), ms);
      return controller.signal;
    };
  if (!AbortSignal.any)
    AbortSignal.any = (signals: Iterable<AbortSignal>) => {
      const controller = new AbortController();
      for (const signal of signals) {
        if (signal.aborted) {
          controller.abort(signal.reason);
          break;
        }
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
      }
      return controller.signal;
    };
}

export {};
