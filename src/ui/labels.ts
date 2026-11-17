// OWNER: ui worker. Arabic UI text. Lines marked (plan) are copied programmatically from docs/plan; keep them exact.
import type { ModeId } from '../core/types';

/** App title (plan: Screens_and_UI "Start: intro and loading"). */
export const APP_TITLE = "الراشد روبوت السلامة المدرسية";

/** Mode cards (plan: Screens_and_UI "Mode menu" table). */
export const MODE_TEXT: Record<ModeId, { title: string; desc: string }> = {
  outside: { title: "السلامة خارج المدرسة", desc: "قصص ونصائح للتعامل مع الطريق" },
  inside: { title: "السلامة داخل المدرسة", desc: "إرشادات هامة للحفاظ على سلامتنا" },
  short: { title: "نصائح قصيرة", desc: "مواقف سريعة وإجابات ذكية" },
  creative: { title: "الوضع الإبداعي", desc: "تحدث مع الروبوت بحرية" },
  exam: { title: "التقييم", desc: "اختبر معلوماتك في السلامة" },
};

/** Student switch (plan). */
export const GENDER_LABELS = { boy: "بَطَلٌ", girl: "بَطَلَةٌ" } as const;

/** Teacher results button (plan: Exam "Teacher dashboard"). */
export const TEACHER_LABEL = "لَوْحَةُ النَّتَائِجِ";

// ---- Labels written for the UI (not in the plan), fully diacritized. ----
export const UI_TEXT = {
  settings: 'الْإِعْدَادَاتُ',
  voiceVolume: 'صَوْتُ الرَّاشِدِ',
  sfxVolume: 'الْمُؤَثِّرَاتُ الصَّوْتِيَّةُ',
  music: 'الْمُوسِيقَى',
  student: 'أَنَا',
  map: 'الْخَرِيطَةُ',
  quality: 'جَوْدَةُ الرُّسُومِ',
  close: 'إِغْلَاقٌ',
  back: 'رُجُوعٌ',
  call: 'اتِّصَالٌ',
  endCall: 'إِنْهَاءُ الْمُكَالَمَةِ',
  mic: 'تَحَدَّثْ',
  scenarios: 'الْمَوَاقِفُ',
  stop: 'إِيقَافٌ',
  askPlaceholder: 'اكْتُبْ سُؤَالَكَ هُنَا',
  send: 'إِرْسَالٌ',
} as const;

export const QUALITY_LABELS = {
  low: 'مُنْخَفِضَةٌ',
  medium: 'مُتَوَسِّطَةٌ',
  high: 'عَالِيَةٌ',
} as const;

/** Map sheet switch. */
export const MAP_SHEETS = {
  outside: 'الْخَارِجُ',
  ground: 'الدَّوْرُ الْأَرْضِيُّ',
  first: 'الدَّوْرُ الْأَوَّلُ',
} as const;
