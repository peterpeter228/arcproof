/** A single serialization per format backs every delivery path, including sandbox fallback. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { exportReceiptsCsv, exportReceiptsJson, type ReceiptExportRecord } from '../../arcproof/exportUtils';

type Format = 'json' | 'csv';
export function ReceiptExportActions({ record, filename, label }: { record: ReceiptExportRecord; filename: string; label: string }) {
  const bytes = useMemo(() => ({ json: exportReceiptsJson([record]), csv: exportReceiptsCsv([record]) }), [record]);
  const [notice, setNotice] = useState<{ text: string; identity: typeof bytes } | null>(null);
  const notify = (text: string) => setNotice({ text, identity: bytes });
  const [expanded, setExpanded] = useState(false);
  const generation = useRef(0);
  useEffect(() => { generation.current += 1; return () => { generation.current += 1; }; }, [bytes]);
  function download(kind: Format) {
    let url: string | undefined;
    let anchor: HTMLAnchorElement | undefined;
    try {
      url = URL.createObjectURL(new Blob([bytes[kind]], { type: kind === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8' }));
      anchor = document.createElement('a'); anchor.href = url; anchor.download = `${filename}.${kind}`;
      document.body.appendChild(anchor); anchor.click();
      notify('Download requested. If no file appears, copy or select the complete export text below.');
    } catch {
      setExpanded(true); notify('Download unavailable in this browser. Copy or select the complete export text below.');
    } finally {
      anchor?.remove();
      // A longer object lifetime helps delayed browser downloads; it does not bypass iframe permissions.
      if (url) { const allocated = url; setTimeout(() => URL.revokeObjectURL(allocated), 10_000); }
    }
  }
  async function copy(kind: Format) {
    const token = generation.current;
    setExpanded(true);
    try {
      await navigator.clipboard.writeText(bytes[kind]);
      if (token === generation.current) notify(`${kind.toUpperCase()} copied. You can also select the complete text below.`);
    } catch {
      if (token === generation.current) notify('Clipboard unavailable. Please select the complete text below and copy it manually.');
    }
  }
  return <div className="space-y-3 print:hidden" aria-label="Receipt exports">
    <div className="flex flex-wrap gap-2">
      {(['json', 'csv'] as const).map(kind => <button key={`download-${kind}`} type="button" className="ap-btn-secondary" onClick={() => download(kind)}>Export {label} {kind.toUpperCase()}</button>)}
      {(['json', 'csv'] as const).map(kind => <button key={`copy-${kind}`} type="button" className="ap-btn-secondary" onClick={() => void copy(kind)}>Copy {kind.toUpperCase()}</button>)}
    </div>
    {notice?.identity === bytes && <p role="status" className="text-sm text-stone-700">{notice.text}</p>}
    <details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)} className="text-sm space-y-3">
      <summary className="cursor-pointer py-2 font-semibold">View or manually copy complete export text</summary>
      {expanded && (['json', 'csv'] as const).map(kind => <label className="block space-y-1" key={kind}>
        <span>{kind.toUpperCase()} export text</span>
        <textarea aria-label={`${kind.toUpperCase()} export text`} readOnly value={bytes[kind]} spellCheck={false}
          className="block w-full min-w-0 rounded-lg border border-stone-300 bg-white p-3 font-mono text-xs text-stone-900" rows={10} />
      </label>)}
    </details>
  </div>;
}
