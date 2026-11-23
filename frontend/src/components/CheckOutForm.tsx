import { AlertCircle, Briefcase, Loader2, LogOut, User, UserRound, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { checkOut, type Purpose, type Visit } from '../api';
import PhotoPicker from './PhotoPicker';

const PURPOSES: { value: Purpose; icon: LucideIcon }[] = [
  { value: 'Personal Work', icon: User },
  { value: 'Office Work', icon: Briefcase },
];

export default function CheckOutForm({ onDone }: { onDone: (visit: Visit) => void }) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter a name.');
    if (!photo) return setError('Please add a photo.');
    if (!purpose) return setError('Please choose Personal Work or Office Work.');
    setSaving(true);
    setError('');
    try {
      onDone(await checkOut(name.trim(), purpose, photo));
      setName('');
      setPurpose(null);
      setPhoto(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-navy/10 ring-1 ring-slate-200/70">
      <div className="bg-brand flex items-center gap-3 px-6 py-4 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
          <LogOut className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold leading-tight">Check out</h2>
          <p className="text-xs text-white/75">Record a person leaving the gate</p>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Name</span>
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Full name"
              className="w-full rounded-xl border border-slate-300 py-2.5 pr-3 pl-9 outline-none transition focus:border-teal focus:ring-4 focus:ring-teal/15"
            />
          </div>
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Photo</span>
          <PhotoPicker value={photo} onChange={setPhoto} />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Purpose</span>
          <div className="grid grid-cols-2 gap-3">
            {PURPOSES.map(({ value, icon: Icon }) => {
              const active = purpose === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-sm font-medium transition ${
                    active
                      ? 'border-teal bg-teal/5 text-navy shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name="purpose" value={value} checked={active} onChange={() => setPurpose(value)} className="sr-only" />
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {value}
                </label>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="bg-brand flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-lg shadow-teal/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
          {saving ? 'Saving…' : 'Check out'}
        </button>
      </div>
    </form>
  );
}
