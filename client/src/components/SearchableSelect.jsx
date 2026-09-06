import { useEffect, useRef, useState } from 'react';
import { Input } from './Form.jsx';

/**
 * A single reusable searchable dropdown used everywhere the spec calls for
 * one (Quality, Shade, Party, Company, Stock Entry, Beam). `loadOptions`
 * receives the current search string and returns a promise of items;
 * pass an async wrapper around a static array for client-side lists, or a
 * real API call for server-side search over large datasets.
 */
export function SearchableSelect({
  value,
  onSelect,
  loadOptions,
  getOptionKey = (o) => o._id || o.id,
  getOptionLabel = (o) => o.name,
  getOptionMeta,
  placeholder = 'Search…',
  disabled,
  error,
  emptyText = 'No results',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      Promise.resolve(loadOptions(query))
        .then((items) => {
          if (active) setOptions(items || []);
        })
        .finally(() => active && setLoading(false));
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, loadOptions]);

  const displayValue = open ? query : value ? getOptionLabel(value) : '';

  return (
    <div className="searchable-select" ref={containerRef}>
      <Input
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="ss-list">
          {loading && <div className="ss-empty">Searching…</div>}
          {!loading && options.length === 0 && <div className="ss-empty">{emptyText}</div>}
          {!loading &&
            options.map((opt) => (
              <div
                key={getOptionKey(opt)}
                className="ss-option"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <span>{getOptionLabel(opt)}</span>
                {getOptionMeta && <span className="meta">{getOptionMeta(opt)}</span>}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
