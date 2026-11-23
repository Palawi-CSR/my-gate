import { CalendarDays, CheckCircle2, Clock, DoorOpen, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { listVisits, type Visit } from './api';
import CheckOutForm from './components/CheckOutForm';
import Filters from './components/Filters';
import VisitCard from './components/VisitCard';

export default function App() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [searchName, setSearchName] = useState(''); // `name`, debounced
  const [reloadKey, setReloadKey] = useState(0);

  // Wait until typing pauses before searching.
  useEffect(() => {
    const t = setTimeout(() => setSearchName(name), 300);
    return () => clearTimeout(t);
  }, [name]);

  useEffect(() => {
    let stale = false; // ignore responses for filters that have since changed
    setLoading(true);
    listVisits({ name: searchName, date })
      .then((v) => !stale && (setVisits(v), setError('')))
      .catch((e: Error) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [searchName, date, reloadKey]);

  // After a check-out or check-in, reload so the list respects the active filters.
  const refresh = () => setReloadKey((k) => k + 1);
  const filtered = Boolean(searchName.trim() || date);

  const out = visits.filter((v) => !v.in_time);
  const back = visits.filter((v) => v.in_time);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="relative mx-auto -mt-20 grid max-w-7xl grid-cols-1 gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[380px_1fr]">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <CheckOutForm onDone={refresh} />
        </div>

        <div className="min-w-0 space-y-8">
          <Filters
            name={name}
            date={date}
            loading={loading}
            onName={setName}
            onDate={setDate}
            onClear={() => {
              setName('');
              setSearchName('');
              setDate('');
            }}
          />

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Could not load entries: {error}</p>
          )}

          <Section
            icon={DoorOpen}
            title="Currently out"
            count={out.length}
            accent="bg-amber-500"
            empty={filtered ? 'No matching entries.' : 'Nobody is out right now.'}
          >
            {out.map((v) => (
              <VisitCard key={v.id} visit={v} onUpdated={refresh} />
            ))}
          </Section>

          <Section
            icon={CheckCircle2}
            title="Returned"
            count={back.length}
            accent="bg-teal"
            empty={filtered ? 'No matching entries.' : 'No completed entries yet.'}
          >
            {back.map((v) => (
              <VisitCard key={v.id} visit={v} onUpdated={refresh} />
            ))}
          </Section>
        </div>
      </main>
    </div>
  );
}

function Header() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="bg-brand relative overflow-hidden pb-24 text-white">
      {/* soft decorative circles */}
      <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-white/5 blur-2xl" />

      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-4">
          <img src="/palawi-logo.png" alt="Palawi" className="h-16 w-16 rounded-full bg-white shadow-lg ring-4 ring-white/30" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Gate</h1>
            <p className="text-sm text-white/75">Palawi · Gate in &amp; out register</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur">
            <CalendarDays className="h-4 w-4" />
            {now.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-semibold tabular-nums backdrop-blur">
            <Clock className="h-4 w-4" />
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  accent,
  empty,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  accent: string;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className={`h-6 w-1.5 rounded-full ${accent}`} />
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <Icon className="h-5 w-5 text-slate-500" />
          {title}
        </h2>
        <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{count}</span>
      </div>
      {count ? (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">{children}</div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 py-10 text-slate-400">
          <Icon className="h-8 w-8" />
          <p className="text-sm">{empty}</p>
        </div>
      )}
    </section>
  );
}
