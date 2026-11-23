export type Purpose = 'Personal Work' | 'Office Work';

export interface Visit {
  id: string;
  name: string;
  purpose: Purpose;
  out_time: string;
  out_photo: string;
  in_time: string | null;
  in_photo: string | null;
}

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export const photoUrl = (path: string) => `${BASE}${path}`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${res.status})`);
  }
  return res.json();
}

export interface VisitFilters {
  name: string;
  /** Local calendar day as YYYY-MM-DD from <input type="date">, or '' for all days. */
  date: string;
}

export function listVisits({ name, date }: VisitFilters) {
  const params = new URLSearchParams();
  if (name.trim()) params.set('name', name.trim());
  if (date) {
    // Send the local day's boundaries so "today" means today in the user's timezone.
    const [y, m, d] = date.split('-').map(Number);
    params.set('start', new Date(y, m - 1, d).toISOString());
    params.set('end', new Date(y, m - 1, d + 1).toISOString());
  }
  const qs = params.toString();
  return request<Visit[]>(`/api/visits${qs ? `?${qs}` : ''}`);
}

export function checkOut(name: string, purpose: Purpose, photo: Blob) {
  const form = new FormData();
  form.append('name', name);
  form.append('purpose', purpose);
  form.append('photo', photo, 'photo.jpg');
  return request<Visit>('/api/visits/check-out', { method: 'POST', body: form });
}

export function checkIn(id: string, photo: Blob | null) {
  const form = new FormData();
  if (photo) form.append('photo', photo, 'photo.jpg');
  return request<Visit>(`/api/visits/${id}/check-in`, { method: 'POST', body: form });
}
