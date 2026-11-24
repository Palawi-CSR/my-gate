import { Briefcase, Clock, ImageOff, Loader2, LogIn, LogOut, Timer, User } from 'lucide-react';
import { useState } from 'react';
import { checkIn, photoUrl, type Visit } from '../api';
import { useLang } from '../i18n';
import PhotoPicker from './PhotoPicker';

/** Whole hours and leftover minutes between two timestamps. */
function duration(from: string, to: string) {
  const mins = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  return [Math.floor(mins / 60), mins % 60] as const;
}

function Stamp({ kind, time, photo }: { kind: 'out' | 'in'; time: string | null; photo: string | null }) {
  const { t, fmtTime, fmtDate } = useLang();
  const Icon = kind === 'out' ? LogOut : LogIn;
  const color = kind === 'out' ? 'text-navy' : 'text-teal';
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 aspect-square w-full overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
        {photo ? (
          <a href={photoUrl(photo)} target="_blank" rel="noreferrer" className="group block h-full">
            <img
              src={photoUrl(photo)}
              alt={kind === 'out' ? t.outPhoto : t.inPhoto}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </a>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-300">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">{t.noPhoto}</span>
          </div>
        )}
      </div>
      <p className={`flex items-center gap-1 text-xs font-semibold tracking-wide uppercase ${color}`}>
        <Icon className="h-3.5 w-3.5" /> {kind === 'out' ? t.out : t.in}
      </p>
      {time ? (
        <>
          <p className="text-base font-semibold text-slate-800 tabular-nums">{fmtTime(time)}</p>
          <p className="text-xs text-slate-500">{fmtDate(time)}</p>
        </>
      ) : (
        <p className="text-sm text-slate-400">{t.notBack}</p>
      )}
    </div>
  );
}

export default function VisitCard({ visit, onUpdated }: { visit: Visit; onUpdated: (v: Visit) => void }) {
  const { t, num, fmtError } = useLang();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isOut = !visit.in_time;
  const [hours, mins] = visit.in_time ? duration(visit.out_time, visit.in_time) : [0, 0];
  const PurposeIcon = visit.purpose === 'Office Work' ? Briefcase : User;

  async function confirm() {
    setSaving(true);
    setError('');
    try {
      onUpdated(await checkIn(visit.id, photo));
      setOpen(false);
    } catch (err) {
      setError(fmtError((err as Error).message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md shadow-navy/5 ring-1 ring-slate-200/70 transition hover:shadow-lg hover:shadow-navy/10">
      <div className={`h-1 ${isOut ? 'bg-amber-400' : 'bg-brand'}`} />

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-800" title={visit.name}>
              {visit.name}
            </h3>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                visit.purpose === 'Office Work' ? 'bg-navy/10 text-navy' : 'bg-teal/10 text-teal'
              }`}
            >
              <PurposeIcon className="h-3 w-3" />
              {t.purpose[visit.purpose] ?? visit.purpose}
            </span>
          </div>
          {isOut ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> {t.out}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal">
              <Timer className="h-3.5 w-3.5" /> {t.duration(hours ? num(hours) : null, num(mins))}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <Stamp kind="out" time={visit.out_time} photo={visit.out_photo} />
          <Stamp kind="in" time={visit.in_time} photo={visit.in_photo} />
        </div>

        {isOut && !open && (
          <button
            onClick={() => setOpen(true)}
            className="bg-brand mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white shadow-md shadow-teal/25 transition hover:brightness-110"
          >
            <LogIn className="h-4 w-4" /> {t.checkIn}
          </button>
        )}

        {isOut && open && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <Clock className="h-4 w-4 text-teal" /> {t.returnPhoto} <span className="text-slate-400">{t.optional}</span>
            </p>
            <PhotoPicker value={photo} onChange={setPhoto} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={confirm}
                disabled={saving}
                className="bg-brand flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {saving ? t.saving : t.confirmCheckIn}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setPhoto(null);
                  setError('');
                }}
                className="rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
