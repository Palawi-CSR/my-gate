import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Purpose } from './api';

export type Lang = 'en' | 'mr';

const en = {
  appName: 'Gate Register',
  brand: 'Palawi',
  subtitle: 'Palawi · Gate in & out register',
  /** Messages the server (or network) can return, shown as-is in English. */
  serverErrors: {} as Record<string, string>,
  requestFailed: (status: string) => `Request failed (${status})`,
  am: 'AM',
  pm: 'PM',
  // Check-out form
  checkOut: 'Check out',
  checkOutHint: 'Record a person leaving the gate',
  name: 'Name',
  fullName: 'Full name',
  photo: 'Photo',
  purposeLabel: 'Purpose',
  purpose: { 'Personal Work': 'Personal Work', 'Office Work': 'Office Work' } as Record<Purpose, string>,
  saving: 'Saving…',
  errName: 'Please enter a name.',
  errPhoto: 'Please add a photo.',
  errPurpose: 'Please choose Personal Work or Office Work.',
  // Filters
  searchByName: 'Search by name',
  typeName: 'Type a name…',
  checkOutDate: 'Check-out date',
  today: 'Today',
  clear: 'Clear',
  // Lists
  loadError: 'Could not load entries',
  currentlyOut: 'Currently out',
  returned: 'Returned',
  noMatches: 'No matching entries.',
  nobodyOut: 'Nobody is out right now.',
  noCompleted: 'No completed entries yet.',
  // Photo picker
  tapToPhoto: 'Tap to take a photo',
  removePhoto: 'Remove photo',
  selected: 'Selected',
  capture: 'Capture',
  cancel: 'Cancel',
  retake: 'Retake',
  camera: 'Camera',
  upload: 'Upload',
  badImage: 'Could not read that image. Please use a JPEG or PNG photo.',
  // Visit card
  out: 'Out',
  in: 'In',
  outPhoto: 'Out photo',
  inPhoto: 'In photo',
  noPhoto: 'No photo',
  notBack: 'Not back yet',
  checkIn: 'Check in',
  confirmCheckIn: 'Confirm check in',
  returnPhoto: 'Photo on return',
  optional: '(optional)',
  /** `h` is null when under an hour. Both are already formatted in the language's digits. */
  duration: (h: string | null, m: string) => (h ? `${h}h ${m}m` : `${m}m`),
};

type Dict = typeof en;

const mr: Dict = {
  appName: 'गेट रजिस्टर',
  brand: 'पलावी',
  subtitle: 'पलावी · गेट ये-जा नोंदवही',
  serverErrors: {
    'Database is unreachable. Please try again shortly.': 'डेटाबेसशी संपर्क होत नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
    'Photo must be a JPEG, PNG or WebP image.': 'फोटो JPEG, PNG किंवा WebP प्रकारचा असावा.',
    'Photo must be 4 MB or smaller.': 'फोटो ४ MB किंवा त्यापेक्षा लहान असावा.',
    'Photo is empty.': 'फोटो रिकामा आहे.',
    'Name is required.': 'नाव आवश्यक आहे.',
    'Entry not found.': 'नोंद सापडली नाही.',
    'Already checked in.': 'परत आल्याची नोंद आधीच झाली आहे.',
    'Photo not found.': 'फोटो सापडला नाही.',
    'Failed to fetch': 'सर्व्हरशी संपर्क होत नाही. इंटरनेट तपासा.',
    'Load failed': 'सर्व्हरशी संपर्क होत नाही. इंटरनेट तपासा.',
    'NetworkError when attempting to fetch resource.': 'सर्व्हरशी संपर्क होत नाही. इंटरनेट तपासा.',
  },
  requestFailed: (status) => `विनंती अयशस्वी (${status})`,
  am: 'म.पू.',
  pm: 'म.उ.',
  checkOut: 'बाहेर जाण्याची नोंद',
  checkOutHint: 'गेटमधून बाहेर जाणाऱ्या व्यक्तीची नोंद करा',
  name: 'नाव',
  fullName: 'पूर्ण नाव',
  photo: 'फोटो',
  purposeLabel: 'उद्देश',
  purpose: { 'Personal Work': 'वैयक्तिक काम', 'Office Work': 'कार्यालयीन काम' },
  saving: 'जतन करत आहे…',
  errName: 'कृपया नाव लिहा.',
  errPhoto: 'कृपया फोटो जोडा.',
  errPurpose: 'कृपया वैयक्तिक काम किंवा कार्यालयीन काम निवडा.',
  searchByName: 'नावाने शोधा',
  typeName: 'नाव टाइप करा…',
  checkOutDate: 'बाहेर गेल्याची तारीख',
  today: 'आज',
  clear: 'साफ करा',
  loadError: 'नोंदी लोड करता आल्या नाहीत',
  currentlyOut: 'सध्या बाहेर',
  returned: 'परत आलेले',
  noMatches: 'जुळणाऱ्या नोंदी नाहीत.',
  nobodyOut: 'सध्या कोणीही बाहेर नाही.',
  noCompleted: 'अद्याप पूर्ण झालेल्या नोंदी नाहीत.',
  tapToPhoto: 'फोटो काढण्यासाठी टॅप करा',
  removePhoto: 'फोटो काढून टाका',
  selected: 'निवडलेला फोटो',
  capture: 'फोटो घ्या',
  cancel: 'रद्द करा',
  retake: 'पुन्हा काढा',
  camera: 'कॅमेरा',
  upload: 'अपलोड',
  badImage: 'ही प्रतिमा वाचता आली नाही. कृपया JPEG किंवा PNG फोटो वापरा.',
  out: 'बाहेर',
  in: 'आत',
  outPhoto: 'बाहेर जातानाचा फोटो',
  inPhoto: 'परत आल्याचा फोटो',
  noPhoto: 'फोटो नाही',
  notBack: 'अद्याप परत आले नाहीत',
  checkIn: 'परत आल्याची नोंद',
  confirmCheckIn: 'परत आल्याची नोंद करा',
  returnPhoto: 'परत आल्यावरचा फोटो',
  optional: '(ऐच्छिक)',
  duration: (h, m) => (h ? `${h} तास ${m} मि` : `${m} मि`),
};

const DICTS: Record<Lang, Dict> = { en, mr };
// Marathi uses Devanagari digits (०-९) and month/day names.
const LOCALES: Record<Lang, string> = { en: 'en-IN', mr: 'mr-IN-u-nu-deva' };
const STORAGE_KEY = 'my-gate-lang';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Dict;
  /** A number in the current language's digits. */
  num: (n: number) => string;
  /** Hours and minutes, e.g. "03:05 PM" / "०३:०५ म.उ.". */
  fmtTime: (d: Date | string) => string;
  fmtDate: (d: Date | string, weekday?: boolean) => string;
  /** Translate an error message from the server or the network. */
  fmtError: (message: string) => string;
}

function makeHelpers(lang: Lang): Omit<LangState, 'lang' | 'setLang'> {
  const t = DICTS[lang];
  const locale = LOCALES[lang];
  const numFmt = new Intl.NumberFormat(locale, { useGrouping: false });
  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
  const num = (n: number) => numFmt.format(n);

  return {
    t,
    num,
    // Browsers leave AM/PM in English for Marathi, so supply our own day-period label.
    fmtTime: (d) =>
      timeFmt
        .formatToParts(new Date(d))
        .map((p) => (p.type === 'dayPeriod' ? (new Date(d).getHours() < 12 ? t.am : t.pm) : p.value))
        .join(''),
    fmtDate: (d, weekday = false) =>
      new Date(d).toLocaleDateString(locale, {
        ...(weekday && { weekday: 'short' }),
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    fmtError: (message) => {
      if (t.serverErrors[message]) return t.serverErrors[message];
      const failed = /^Request failed \((\d+)\)$/.exec(message);
      return failed ? t.requestFailed(num(Number(failed[1]))) : message;
    },
  };
}

const LangContext = createContext<LangState | null>(null);

function initialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'mr' ? 'mr' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  const helpers = useMemo(() => makeHelpers(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${DICTS[lang].appName} · ${DICTS[lang].brand}`;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable (private mode); the choice just won't persist */
    }
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang, ...helpers }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
