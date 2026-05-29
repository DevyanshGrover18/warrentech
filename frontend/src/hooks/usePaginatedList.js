import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

export function usePaginatedList(fetchPage, options = {}) {
  const {
    initialSearchTerm = '',
    initialPage = 1,
    initialLimit = 10,
    initialFilters = {},
    debounceMs = 500,
    onError,
  } = options;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);
  const [filters, setFilters] = useState(initialFilters);

  // Use a ref for onError to avoid infinite loops if the consumer provides a non-memoized function
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, searchTerm]);

  const queryParams = useMemo(() => ({
    paginate: true,
    page,
    limit,
    search: debouncedSearchTerm,
    ...filters,
  }), [debouncedSearchTerm, filters, limit, page]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchPage(queryParams);
      
      // Batch updates to minimize re-renders
      setItems(response.items || []);
      setTotalItems(response.totalItems || 0);
      setTotalPages(response.totalPages || 1);
      
      // React's batching will handle these multiple state updates
    } catch (fetchError) {
      setError(fetchError);
      if (onErrorRef.current) {
        onErrorRef.current(fetchError);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPage, queryParams]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateSearchTerm = useCallback((value) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  const updateFilter = useCallback((name, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm(initialSearchTerm);
    setDebouncedSearchTerm(initialSearchTerm);
    setFilters(initialFilters);
    setPage(initialPage);
    setLimit(initialLimit);
  }, [initialFilters, initialLimit, initialPage, initialSearchTerm]);

  const updateLimit = useCallback((value) => {
    setLimit(value);
    setPage(1);
  }, []);

  return {
    items,
    loading,
    error,
    page,
    limit,
    totalItems,
    totalPages,
    searchTerm,
    filters,
    setPage,
    setLimit: updateLimit,
    setSearchTerm: updateSearchTerm,
    setFilter: updateFilter,
    resetFilters,
    refresh,
  };
}
