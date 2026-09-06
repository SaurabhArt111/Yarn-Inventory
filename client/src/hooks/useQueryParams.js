import { useState, useCallback } from 'react';

// Lightweight local filter/pagination state manager for list pages --
// avoids re-fetching the whole app or wiring real URL query params for
// every table, while still giving each page independent, resettable state.
export function useQueryParams(initial) {
  const [params, setParams] = useState(initial);
  const update = useCallback((patch) => {
    setParams((prev) => ({ ...prev, ...patch, ...(patch.page ? {} : { page: 1 }) }));
  }, []);
  return [params, update, setParams];
}
