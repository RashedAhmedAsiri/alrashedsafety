import { describe, expect, it } from 'vitest';
import { EXAM_QUESTIONS } from '../content/data/exam';
import type { ExamQuestion } from '../content/types';
import { basicNormalize, judgeAnswer, judgeTap, readPhase, readYesNo, stem } from './judge';

const Q = (id: string): ExamQuestion => {
  const q = EXAM_QUESTIONS.find((x) => x.id === id);
  if (!q) throw new Error(`missing exam question ${id}`);
  return q;
};
const verdict = (id: string, text: string) => judgeAnswer(Q(id), text).verdict;

describe('normalize', () => {
  it('strips diacritics, unifies alef / taa marbuta / alef maqsura', () => {
    expect(basicNormalize('أَخْرُجُ بِهُدُوءٍ، مَعَ الْمُعَلِّمَةِ!')).toBe('اخرج بهدوء مع المعلمه');
    expect(basicNormalize('إلى')).toBe('الي');
    expect(basicNormalize('لأ')).toBe('لا');
  });
  it('stems prefixes and suffixes', () => {
    expect(stem('المعلم')).toBe(stem('معلمي'));
    expect(stem('اليسار')).toBe('يسار');
    expect(stem('الف')).toBe('الف');
  });
});

describe('content', () => {
  it('has the ten questions in order', () => {
    expect(EXAM_QUESTIONS.map((q) => q.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe('phase question', () => {
  it.each([
    ['قبل', 'pre'],
    ['قبل التدريب', 'pre'],
    ['قَبْلَهُ', 'pre'],
    ['بعد', 'post'],
    ['بعده', 'post'],
    ['احنا بعد التدريب', 'post'],
    ['ما ادري', null],
  ])('%s -> %s', (t, want) => expect(readPhase(t)).toBe(want));
});

describe('yes / no (first one wins)', () => {
  it.each([
    ['لا', 'no'],
    ['لأ', 'no'],
    ['لا ما يصير', 'no'],
    ['أبد', 'no'],
    ['ابدًا ابدا', 'no'],
    ['مو آمن', 'no'],
    ['غلط', 'no'],
    ['ما اركب معه', 'no'],
    ['اكيد لا', 'no'],
    ['نعم', 'yes'],
    ['إيه', 'yes'],
    ['أيوه', 'yes'],
    ['صح', 'yes'],
    ['اي اركب', 'yes'],
    ['ايه لا لا', 'yes'],
    ['لا ايه', 'no'],
    ['مو صح', 'no'],
    ['اركب معه', null],
  ])('%s -> %s', (t, want) => expect(readYesNo(t)).toBe(want));

  it('judges q2 / q5 / q8 (answer no)', () => {
    expect(verdict('q2_bus_front', 'لا مو آمن السواق ما يشوفني')).toBe('correct');
    expect(verdict('q2_bus_front', 'ايه عادي')).toBe('wrong');
    expect(verdict('q5_puddle', 'لا لأنها ممكن تكون عميقة')).toBe('correct');
    expect(verdict('q5_puddle', 'ايوه حلو')).toBe('wrong');
    expect(verdict('q8_stranger', 'لا ما اركب مع واحد ما اعرفه')).toBe('correct');
    expect(verdict('q8_stranger', 'نعم اركب')).toBe('wrong');
    expect(verdict('q8_stranger', 'اممم')).toBe('unclear');
  });
});

describe('choice', () => {
  it('reads letters and letter names', () => {
    expect(verdict('q1_fire_alarm', 'ب')).toBe('correct');
    expect(verdict('q1_fire_alarm', 'باء')).toBe('correct');
    expect(verdict('q1_fire_alarm', 'الجواب ب')).toBe('correct');
    expect(verdict('q1_fire_alarm', 'أ')).toBe('wrong');
    expect(verdict('q1_fire_alarm', 'جيم')).toBe('wrong');
    expect(verdict('q6_power_outage', 'ألف')).toBe('correct');
    expect(verdict('q9_car_seat', 'الثاني')).toBe('correct');
    expect(verdict('q9_car_seat', 'الثالث')).toBe('wrong');
  });

  it('q1: spoken variants and option keywords', () => {
    expect(verdict('q1_fire_alarm', 'أطلع مع المعلم')).toBe('correct');
    expect(verdict('q1_fire_alarm', 'اطلع بهدوء مع المعلمة')).toBe('correct');
    expect(verdict('q1_fire_alarm', 'أخرج بهدوء')).toBe('correct');
    expect(verdict('q1_fire_alarm', 'أجمع أغراضي وأطلع')).toBe('wrong');
    expect(verdict('q1_fire_alarm', 'اختبئ تحت الطاولة')).toBe('wrong');
    expect(verdict('q1_fire_alarm', 'أطلع مع المعلم وما آخذ أغراضي')).toBe('correct');
  });

  it('q3: left first (and «أول» does not mean option أ)', () => {
    expect(verdict('q3_look_left', 'يسار')).toBe('correct');
    expect(verdict('q3_look_left', 'اليسار')).toBe('correct');
    expect(verdict('q3_look_left', 'شمال')).toBe('correct');
    expect(verdict('q3_look_left', 'اطالع يسار أول')).toBe('correct');
    expect(verdict('q3_look_left', 'يسار بعدين يمين')).toBe('correct');
    expect(verdict('q3_look_left', 'اليمين')).toBe('wrong');
    expect(verdict('q3_look_left', 'يمين ثم يسار')).toBe('wrong');
  });

  it('q6: stay in place', () => {
    expect(verdict('q6_power_outage', 'أجلس مكاني')).toBe('correct');
    expect(verdict('q6_power_outage', 'ابقى مكاني واسمع المعلم')).toBe('correct');
    expect(verdict('q6_power_outage', 'أركض للباب')).toBe('wrong');
    expect(verdict('q6_power_outage', 'أدور مفتاح الكهرباء')).toBe('wrong');
  });

  it('q9: back seat', () => {
    expect(verdict('q9_car_seat', 'ورا')).toBe('correct');
    expect(verdict('q9_car_seat', 'ورا مع الحزام')).toBe('correct');
    expect(verdict('q9_car_seat', 'في المقعد الخلفي')).toBe('correct');
    expect(verdict('q9_car_seat', 'قدام')).toBe('wrong');
    expect(verdict('q9_car_seat', 'المقعد الأمامي')).toBe('wrong');
    expect(verdict('q9_car_seat', 'أي مكان بدون حزام')).toBe('wrong');
  });

  it('unclear and don\'t-know', () => {
    expect(verdict('q9_car_seat', 'السيارة')).toBe('unclear');
    expect(verdict('q9_car_seat', 'ما أدري')).toBe('wrong');
    expect(verdict('q1_fire_alarm', '')).toBe('unclear');
  });
});

describe('open', () => {
  it('q4 nosebleed: two concepts, no tilt back', () => {
    expect(verdict('q4_nosebleed', 'أجلس وأميل راسي لقدام')).toBe('correct');
    expect(verdict('q4_nosebleed', 'اقعد وامسك خشمي')).toBe('correct');
    expect(verdict('q4_nosebleed', 'أضغط على أنفي وأقول للمعلم')).toBe('correct');
    expect(verdict('q4_nosebleed', 'اروح العيادة')).toBe('wrong'); // only one concept
    expect(verdict('q4_nosebleed', 'أرفع راسي لورا')).toBe('wrong');
    expect(verdict('q4_nosebleed', 'أجلس وأرفع راسي وأضغط')).toBe('wrong');
    expect(verdict('q4_nosebleed', 'أجلس وأنزل راسي وما أرفع راسي')).toBe('correct'); // negated wrong words
    expect(verdict('q4_nosebleed', 'أبكي')).toBe('unclear');
  });

  it('q7 open sewer: stay away or go around', () => {
    expect(verdict('q7_open_sewer', 'أبتعد عنها')).toBe('correct');
    expect(verdict('q7_open_sewer', 'أمشي حولها وأقول لأبوي')).toBe('correct');
    expect(verdict('q7_open_sewer', 'ما أقرب منها')).toBe('correct');
    expect(verdict('q7_open_sewer', 'آخذ طريق ثاني')).toBe('correct');
    expect(verdict('q7_open_sewer', 'أقول للمعلم')).toBe('wrong'); // tell only: not enough
    expect(verdict('q7_open_sewer', 'أنط فوقها')).toBe('wrong');
    expect(verdict('q7_open_sewer', 'أطالع فيها')).toBe('wrong');
    expect(verdict('q7_open_sewer', 'أبتعد وما أنط')).toBe('correct');
  });

  it('q10 friend fainted: call the teacher, no water / lifting', () => {
    expect(verdict('q10_friend_fainted', 'أنادي المعلم')).toBe('correct');
    expect(verdict('q10_friend_fainted', 'اصيح على المعلمة ونبتعد عنه')).toBe('correct');
    expect(verdict('q10_friend_fainted', 'أقول للمرشد')).toBe('correct');
    expect(verdict('q10_friend_fainted', 'أعطيه موية')).toBe('wrong');
    expect(verdict('q10_friend_fainted', 'أنادي المعلم وأصب موية عليه')).toBe('wrong');
    expect(verdict('q10_friend_fainted', 'نبتعد عنه')).toBe('wrong'); // space without calling
    expect(verdict('q10_friend_fainted', 'أخاف')).toBe('unclear');
  });
});

describe('taps', () => {
  it('judges letters, yes/no and cards', () => {
    expect(judgeTap(Q('q1_fire_alarm'), 'ب')).toBe(true);
    expect(judgeTap(Q('q1_fire_alarm'), 'أ')).toBe(false);
    expect(judgeTap(Q('q2_bus_front'), 'no')).toBe(true);
    expect(judgeTap(Q('q2_bus_front'), 'yes')).toBe(false);
    const q4 = Q('q4_nosebleed');
    const right = q4.cards!.findIndex((c) => c.correct);
    expect(judgeTap(q4, right)).toBe(true);
    expect(judgeTap(q4, (right + 1) % 3)).toBe(false);
  });
});
