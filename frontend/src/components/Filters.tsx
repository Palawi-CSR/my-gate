import { Loader2, Search, X } from 'lucide-react';
import { useLang } from '../i18n';

interface Props {
  name: string;
  date: string;
  loading: boolean;
  onName: (name: string) => void;
  onDate: (date: string) => void;
  onClear: () => void;
}

/** Local YYYY-MM-DD for today, the format <input type="date"> uses. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const input =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 text-base outline-none sm:text-sm transition focus:border-teal focus:ring-4 focus:ring-teal/15';

export default function Filters({ name, date, loading, onName, onDate, onClear }: Props) {
  const { t } = useLang();
  const isToday = date === today();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-xl shadow-navy/10 ring-1 ring-slate-200/70">
      <label className="w-full sm:w-auto sm:min-w-52 sm:flex-1">
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.searchByName}</span>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="search" value={name} onChange={(e) => onName(e.target.value)} placeholder={t.typeName} className={`${input} pl-9`} />
        </div>
      </label>

      <label className="flex-1 sm:flex-none">
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{t.checkOutDate}</span>
        <div>
          <input type="date" value={date} max={today()} onChange={(e) => onDate(e.target.value)} className={`${input} pl-3`} />
        </div>
      </label>

      <button
        type="button"
        onClick={() => onDate(isToday ? '' : today())}
        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          isToday ? 'bg-brand text-white shadow-md shadow-teal/25' : 'border border-slate-300 text-slate-700 hover:border-teal hover:text-teal'
        }`}
      >
        {t.today}
      </button>

      {(name || date) && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-4 w-4" /> {t.clear}
        </button>
      )}

      {loading && <Loader2 className="mb-3 h-4 w-4 animate-spin text-teal" />}
    </div>
  );
}
