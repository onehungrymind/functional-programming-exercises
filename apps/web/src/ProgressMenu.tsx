import { useEffect, useRef, useState } from 'react';
import { Download, SlidersHorizontal, Trash2, Upload } from 'lucide-react';
import { progress } from './progress';

/** Export, import, and reset. Reset is low-emphasis and behind a confirm, on purpose. */
export function ProgressMenu() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const doExport = () => {
    const blob = new Blob([progress.export()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fp-exercises-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const doImport = async (f: File) => {
    const out = progress.import(await f.text());
    setMessage(out.ok ? 'Progress restored.' : out.error);
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="progress-menu" ref={wrap}>
      <button
        type="button"
        className="ghost-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Progress"
      >
        <SlidersHorizontal size={14} aria-hidden />
      </button>

      {open && (
        <div className="menu-pop" role="menu">
          <button type="button" role="menuitem" onClick={doExport}>
            <Download size={12} aria-hidden /> Export progress
          </button>
          <button type="button" role="menuitem" onClick={() => file.current?.click()}>
            <Upload size={12} aria-hidden /> Import progress
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
          <hr />
          {confirming ? (
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => {
                progress.reset();
                setConfirming(false);
                setOpen(false);
              }}
            >
              <Trash2 size={12} aria-hidden /> Really reset everything?
            </button>
          ) : (
            <button type="button" role="menuitem" className="quiet" onClick={() => setConfirming(true)}>
              <Trash2 size={12} aria-hidden /> Reset progress
            </button>
          )}
          {message && <p className="menu-msg">{message}</p>}
        </div>
      )}
    </div>
  );
}
