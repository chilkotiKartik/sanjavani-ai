import type { Language, QuickReply } from '@sanjeevani/types';
import { SYMPTOM_LABELS } from '../content/labels';
import { fill, pick, pickOf, type Localized, type LocalizedOf } from '../content/localized';
import { RED_FLAG_SCREENS } from './profiles';
import type { FollowUpSlot } from './state';

const DURATION_Q: Localized = {
  en: 'How long has this been going on?',
  hi: 'यह कब से हो रहा है?',
  hinglish: 'Ye kab se ho raha hai?',
  bn: 'এটা কতদিন ধরে হচ্ছে?',
};

/*
 * Four quick replies, and an invitation to just say the age.
 *
 * The buttons stay at four because this is answered one-handed by someone who is
 * unwell, and a sixth target is one nobody reads. The sentence carries the rest: the
 * extractor already understands "my 15 year old son", "she is 72", "mere bete ko",
 * so anyone with a more specific answer can simply give it and skip the buttons
 * entirely. Asking for the relationship rather than the age band also means the card
 * can later say *whose* symptoms these were, which is the first thing a stranger
 * reading it needs.
 */
const AGE_Q: Localized = {
  en: 'Who is this for — you, a child, or an older person? You can just say their age.',
  hi: 'यह किसके लिए है — आपके, किसी बच्चे के, या किसी बुज़ुर्ग के लिए? उम्र भी बता सकते हैं।',
  hinglish: 'Ye kiske liye hai — aapke, kisi bachche ke, ya kisi buzurg ke liye? Umar bhi bata sakte hain.',
  bn: 'এটা কার জন্য — আপনার, কোনও বাচ্চার, নাকি কোনও বয়স্ক মানুষের? বয়সটাও বলে দিতে পারেন।',
};

const SEVERITY_Q: Localized = {
  en: 'How bad is the {symptom} — mild, moderate or severe?',
  hi: '{symptom} कितना है — हल्का, मध्यम या बहुत तेज़?',
  hinglish: '{symptom} kitna hai — halka, theek-thaak ya bahut tez?',
  bn: '{symptom} কতটা — সামান্য, মাঝারি, নাকি তীব্র?',
};

const DETAIL_Q: Localized = {
  en: 'Tell me what you’re feeling — for example fever, pain, cough or an injury.',
  hi: 'बताइए आपको क्या तकलीफ़ है — जैसे बुखार, दर्द, खांसी या चोट।',
  hinglish: 'Bataiye aapko kya takleef hai — jaise bukhar, dard, khansi ya chot.',
  bn: 'বলুন কী কষ্ট হচ্ছে — যেমন জ্বর, ব্যথা, কাশি বা আঘাত।',
};

const YES_NO: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
  ],
  hi: [
    { label: 'हाँ', value: 'हाँ' },
    { label: 'नहीं', value: 'नहीं' },
  ],
  hinglish: [
    { label: 'Haan', value: 'haan' },
    { label: 'Nahi', value: 'nahi' },
  ],
  bn: [
    { label: 'হ্যাঁ', value: 'হ্যাঁ' },
    { label: 'না', value: 'না' },
  ],
};

const DURATION_REPLIES: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'Since today', value: 'since today' },
    { label: '1–2 days', value: 'for 2 days' },
    { label: '3–6 days', value: 'for 4 days' },
    { label: 'Over a week', value: 'for 10 days' },
  ],
  hi: [
    { label: 'आज से', value: 'आज से' },
    { label: '1–2 दिन', value: '2 दिन से' },
    { label: '3–6 दिन', value: '4 दिन से' },
    { label: 'एक हफ्ते से ज़्यादा', value: '10 दिन से' },
  ],
  hinglish: [
    { label: 'Aaj se', value: 'aaj se' },
    { label: '1–2 din', value: '2 din se' },
    { label: '3–6 din', value: '4 din se' },
    { label: 'Hafte se zyada', value: '10 din se' },
  ],
  bn: [
    { label: 'আজ থেকে', value: 'আজ থেকে' },
    { label: '১–২ দিন', value: '২ দিন ধরে' },
    { label: '৩–৬ দিন', value: '৪ দিন ধরে' },
    { label: 'এক সপ্তাহের বেশি', value: '১০ দিন ধরে' },
  ],
};

const AGE_REPLIES: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'Myself', value: 'for myself' },
    { label: 'A child', value: 'for my child' },
    { label: 'A baby under 1', value: 'for my newborn baby' },
    { label: 'An older person', value: 'for an elderly person' },
  ],
  hi: [
    { label: 'मेरे लिए', value: 'मेरे लिए' },
    { label: 'बच्चे के लिए', value: 'बच्चे के लिए' },
    { label: '1 साल से छोटा शिशु', value: 'नवजात शिशु के लिए' },
    { label: 'बुज़ुर्ग के लिए', value: 'बुजुर्ग के लिए' },
  ],
  hinglish: [
    { label: 'Mere liye', value: 'mere liye' },
    { label: 'Bachche ke liye', value: 'bachche ke liye' },
    { label: 'Chhota baby (1 saal se kam)', value: 'navjaat shishu ke liye' },
    { label: 'Buzurg ke liye', value: 'buzurg ke liye' },
  ],
  bn: [
    { label: 'আমার জন্য', value: 'আমার জন্য' },
    { label: 'বাচ্চার জন্য', value: 'আমার বাচ্চার জন্য' },
    { label: '১ বছরের কম শিশু', value: 'নবজাতকের জন্য' },
    { label: 'বয়স্ক কারও জন্য', value: 'একজন বয়স্ক মানুষের জন্য' },
  ],
};

const SEVERITY_REPLIES: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'Mild', value: 'mild' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Severe', value: 'severe' },
  ],
  hi: [
    { label: 'हल्का', value: 'हल्का' },
    { label: 'मध्यम', value: 'मध्यम' },
    { label: 'बहुत तेज़', value: 'बहुत तेज़' },
  ],
  hinglish: [
    { label: 'Halka', value: 'halka' },
    { label: 'Theek-thaak', value: 'theek thaak' },
    { label: 'Bahut tez', value: 'bahut tez' },
  ],
  bn: [
    { label: 'সামান্য', value: 'সামান্য' },
    { label: 'মাঝারি', value: 'মাঝারি' },
    { label: 'খুব তীব্র', value: 'খুব তীব্র' },
  ],
};

const DETAIL_REPLIES: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'Fever', value: 'I have a fever' },
    { label: 'Stomach pain', value: 'I have stomach pain' },
    { label: 'Cough & cold', value: 'I have a cough and cold' },
    { label: 'An injury', value: 'I have an injury' },
  ],
  hi: [
    { label: 'बुखार', value: 'मुझे बुखार है' },
    { label: 'पेट दर्द', value: 'मुझे पेट दर्द है' },
    { label: 'खांसी-जुकाम', value: 'मुझे खांसी और जुकाम है' },
    { label: 'चोट', value: 'मुझे चोट लगी है' },
  ],
  hinglish: [
    { label: 'Bukhar', value: 'mujhe bukhar hai' },
    { label: 'Pet dard', value: 'mujhe pet dard hai' },
    { label: 'Khansi-zukam', value: 'mujhe khansi aur zukam hai' },
    { label: 'Chot', value: 'mujhe chot lagi hai' },
  ],
  bn: [
    { label: 'জ্বর', value: 'আমার জ্বর হয়েছে' },
    { label: 'পেটে ব্যথা', value: 'আমার পেটে ব্যথা' },
    { label: 'কাশি-সর্দি', value: 'আমার কাশি আর সর্দি হয়েছে' },
    { label: 'আঘাত', value: 'আমার চোট লেগেছে' },
  ],
};

export function followUpPrompt(slot: FollowUpSlot, language: Language): { question: string; quickReplies: QuickReply[] } {
  switch (slot.kind) {
    case 'red_flag':
      return { question: pick(RED_FLAG_SCREENS[slot.screen].question, language), quickReplies: pickOf(YES_NO, language) };
    case 'duration':
      return { question: pick(DURATION_Q, language), quickReplies: pickOf(DURATION_REPLIES, language) };
    case 'age_group':
      return { question: pick(AGE_Q, language), quickReplies: pickOf(AGE_REPLIES, language) };
    case 'severity':
      return {
        question: fill(pick(SEVERITY_Q, language), { symptom: pick(SYMPTOM_LABELS[slot.code], language) }),
        quickReplies: pickOf(SEVERITY_REPLIES, language),
      };
    case 'symptom_detail':
      return { question: pick(DETAIL_Q, language), quickReplies: pickOf(DETAIL_REPLIES, language) };
  }
}
