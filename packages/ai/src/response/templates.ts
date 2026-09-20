import { CONTEXT_NOTES, fill, pick, type ContextNote, type Localized, type LocalizedOf } from '@sanjeevani/medical-safety';
import type { ExtractedSymptom, FacilitiesStatus, Language, QuickReply, RankedFacility, Urgency } from '@sanjeevani/types';
import { formatDuration, formatKm, formatMinutes, symptomPhrase } from './format';

const L = (en: string, hi: string, hinglish: string, bn?: string): Localized => ({ en, hi, hinglish, ...(bn ? { bn } : {}) });

export const T = {
  greeting: L(
    'Namaste, I’m Sanjeevani. Tell me what’s troubling you — in Hindi, English or both.',
    'नमस्ते, मैं संजीवनी हूं। बताइए क्या तकलीफ़ है — हिंदी या अंग्रेज़ी, जैसे आप चाहें।',
    'Namaste, main Sanjeevani hoon. Bataiye kya takleef hai — Hindi ya English, jaise aap chahein.',
    'নমস্কার, আমি সঞ্জীবনী। বলুন কী কষ্ট হচ্ছে — বাংলা, হিন্দি বা ইংরেজি, যেভাবে আপনার সুবিধা।',
  ),
  ackWithDuration: L('I understand — {symptoms} {duration}.', 'समझ गई — {duration} {symptoms}।', 'Samajh gayi — {duration} {symptoms}.', 'বুঝলাম — {duration} {symptoms}।'),
  ack: L('I understand — {symptoms}.', 'समझ गई — {symptoms}।', 'Samajh gayi — {symptoms}.', 'বুঝলাম — {symptoms}।'),
  noted: L('Thank you, noted.', 'धन्यवाद, नोट कर लिया।', 'Shukriya, note kar liya.', 'ধন্যবাদ, লিখে নিলাম।'),
  facilityIntro: L(
    'The nearest suitable option is {name}, about {km} km away{extra}.',
    'सबसे नज़दीकी सही विकल्प {name} है, लगभग {km} km दूर{extra}।',
    'Sabse nazdeeki sahi option {name} hai, lagbhag {km} km door{extra}.',
    'সবচেয়ে কাছের উপযুক্ত জায়গা {name}, প্রায় {km} কিমি দূরে{extra}।',
  ),
  facilityEmergencyExtra: L(', with a 24×7 emergency department', ', जहां 24×7 इमरजेंसी है', ', jahan 24×7 emergency hai', ', যেখানে ২৪×৭ জরুরি বিভাগ আছে'),
  facilityOpenExtra: L(', and it’s open now', ', और अभी खुला है', ', aur abhi khula hai', ', আর এখন খোলা আছে'),
  offerDirections: L('Shall I show you the directions?', 'क्या मैं रास्ता दिखाऊं?', 'Kya main rasta dikhaun?', 'রাস্তাটা দেখিয়ে দেব?'),
  needLocation: L(
    'Share your location and I’ll find the nearest suitable hospital.',
    'अपनी लोकेशन शेयर करें, मैं सबसे नज़दीकी सही अस्पताल ढूंढ दूंगी।',
    'Apni location share karein, main sabse nazdeeki sahi hospital dhoondh doongi.',
    'আপনার অবস্থান শেয়ার করুন, আমি সবচেয়ে কাছের উপযুক্ত হাসপাতাল খুঁজে দিচ্ছি।',
  ),
  noneFound: L(
    'I couldn’t find a suitable facility near you right now. If it gets worse, call 112.',
    'अभी आपके पास कोई सही सुविधा नहीं मिली। हालत बिगड़े तो 112 पर कॉल करें।',
    'Abhi aapke paas koi sahi facility nahi mili. Haalat bigde to 112 par call karein.',
    'এই মুহূর্তে আপনার কাছাকাছি উপযুক্ত কোনও জায়গা পেলাম না। অবস্থা খারাপ হলে ১১২ নম্বরে ফোন করুন।',
  ),
  mapsUnavailable: L(
    'I can’t load nearby hospitals at the moment. Please try again shortly, or call 112 if it’s urgent.',
    'अभी आस-पास के अस्पताल लोड नहीं हो पा रहे। थोड़ी देर में फिर कोशिश करें, या ज़रूरी हो तो 112 पर कॉल करें।',
    'Abhi aas-paas ke hospital load nahi ho pa rahe. Thodi der mein phir koshish karein, ya zaroori ho to 112 par call karein.',
    'এই মুহূর্তে কাছের হাসপাতালের তথ্য আনতে পারছি না। একটু পরে আবার চেষ্টা করুন, জরুরি হলে ১১২ নম্বরে ফোন করুন।',
  ),
  directions: L(
    'Opening directions to {name}. It’s about {km} km — roughly {minutes} min by road.',
    '{name} का रास्ता खोल रही हूं। यह लगभग {km} km है — सड़क से करीब {minutes} min।',
    '{name} ka rasta khol rahi hoon. Ye lagbhag {km} km hai — sadak se kareeb {minutes} min.',
    '{name}-এর রাস্তা খুলছি। প্রায় {km} কিমি — সড়কপথে মোটামুটি {minutes} মিনিট।',
  ),
  directionsNoFacility: L(
    'Tell me what’s wrong first, or ask me for nearby hospitals, and I’ll guide you there.',
    'पहले अपनी तकलीफ़ बताइए, या नज़दीकी अस्पताल पूछिए, फिर मैं रास्ता बताऊंगी।',
    'Pehle apni takleef bataiye, ya nazdeeki hospital poochhiye, phir main rasta bataungi.',
    'আগে বলুন কী কষ্ট হচ্ছে, অথবা কাছের হাসপাতাল জিজ্ঞেস করুন, আমি পথ দেখিয়ে দেব।',
  ),
  facilityList: L(
    'Here are hospitals near you. The closest suitable one is {name}, about {km} km away.',
    'ये रहे आपके पास के अस्पताल। सबसे नज़दीकी सही अस्पताल {name} है, लगभग {km} km दूर।',
    'Ye rahe aapke paas ke hospital. Sabse nazdeeki sahi hospital {name} hai, lagbhag {km} km door.',
    'এই যে আপনার কাছের হাসপাতালগুলি। সবচেয়ে কাছের উপযুক্তটি {name}, প্রায় {km} কিমি দূরে।',
  ),
  thanks: L(
    'Take care. If anything gets worse, call 112 straight away.',
    'अपना ध्यान रखें। हालत बिगड़े तो तुरंत 112 पर कॉल करें।',
    'Apna dhyan rakhein. Haalat bigde to turant 112 par call karein.',
    'নিজের খেয়াল রাখবেন। কিছু খারাপের দিকে গেলে সঙ্গে সঙ্গে ১১২ নম্বরে ফোন করুন।',
  ),
  clarify: L(
    'I can help with health problems and finding care nearby. What are you feeling?',
    'मैं सेहत की तकलीफ़ों और पास में इलाज ढूंढने में मदद करती हूं। आपको क्या महसूस हो रहा है?',
    'Main health problems aur paas mein ilaaj dhoondhne mein madad karti hoon. Aapko kya mehsoos ho raha hai?',
    'আমি শরীর-স্বাস্থ্যের সমস্যা আর কাছাকাছি চিকিৎসা খুঁজতে সাহায্য করতে পারি। আপনার কী কষ্ট হচ্ছে?',
  ),
  addSymptom: L('Sure — tell me what else you’re feeling.', 'ज़रूर — बताइए और क्या तकलीफ़ है।', 'Zaroor — bataiye aur kya takleef hai.', 'নিশ্চয়ই — বলুন আর কী কষ্ট হচ্ছে।'),
  reset: L(
    'Okay, let’s start fresh. What’s troubling you?',
    'ठीक है, नए सिरे से शुरू करते हैं। क्या तकलीफ़ है?',
    'Theek hai, naye sire se shuru karte hain. Kya takleef hai?',
    'ঠিক আছে, নতুন করে শুরু করি। কী কষ্ট হচ্ছে?',
  ),
  noSymptomsYet: L(
    'I didn’t catch a symptom there. Could you describe what you’re feeling?',
    'मुझे कोई लक्षण समझ नहीं आया। क्या आप बता सकते हैं कि क्या महसूस हो रहा है?',
    'Mujhe koi lakshan samajh nahi aaya. Kya aap bata sakte hain ki kya mehsoos ho raha hai?',
    'কোনও লক্ষণ ঠিক বুঝতে পারলাম না। একটু বলবেন কী অনুভব করছেন?',
  ),
  generalAdvice: L(
    'If you feel unwell, a general physician is a good first step. If it feels serious, call 112.',
    'तबीयत ठीक न लगे तो जनरल फिजिशियन को दिखाना अच्छा पहला कदम है। गंभीर लगे तो 112 पर कॉल करें।',
    'Tabiyat theek na lage to general physician ko dikhana achha pehla kadam hai. Serious lage to 112 par call karein.',
    'শরীর খারাপ লাগলে জেনারেল ফিজিশিয়ান দেখানো ভালো প্রথম পদক্ষেপ। গুরুতর মনে হলে ১১২ নম্বরে ফোন করুন।',
  ),
};

/** Short spoken form of the recommended action — the full text is shown in the summary card. */
export const SPOKEN_ACTION: Record<'urgent' | 'routine' | 'self_care', Localized> = {
  urgent: L('Please see a doctor today.', 'कृपया आज ही डॉक्टर को दिखाएं।', 'Kripya aaj hi doctor ko dikhayein.', 'আজই ডাক্তার দেখান।'),
  routine: L(
    'Please see a doctor in the next day or two.',
    'कृपया अगले एक-दो दिन में डॉक्टर को दिखाएं।',
    'Kripya agle ek-do din mein doctor ko dikhayein.',
    'আগামী এক-দুই দিনের মধ্যে ডাক্তার দেখান।',
  ),
  self_care: L(
    'This can usually be managed at home — see a doctor if it isn’t better in 2–3 days.',
    'आमतौर पर इसे घर पर संभाला जा सकता है — 2–3 दिन में आराम न मिले तो डॉक्टर को दिखाएं।',
    'Aam taur par ise ghar par sambhala ja sakta hai — 2–3 din mein aaram na mile to doctor ko dikhayein.',
    'সাধারণত এটা বাড়িতেই সামলানো যায় — ২–৩ দিনে ভালো না হলে ডাক্তার দেখান।',
  ),
};

export function acknowledgement(symptoms: readonly ExtractedSymptom[], durationHours: number | null, language: Language): string {
  if (symptoms.length === 0) return pick(T.noted, language);
  const phrase = symptomPhrase(symptoms, language);
  const duration = formatDuration(durationHours, language);
  return duration
    ? fill(pick(T.ackWithDuration, language), { symptoms: phrase, duration })
    : fill(pick(T.ack, language), { symptoms: phrase });
}

export function facilitySentence(
  facility: RankedFacility | undefined,
  status: FacilitiesStatus,
  urgency: Urgency,
  language: Language,
): string | null {
  if (status === 'needs_location') return pick(T.needLocation, language);
  if (status === 'unavailable') return pick(T.mapsUnavailable, language);
  if (status === 'none_found' || !facility) return status === 'not_needed' ? null : pick(T.noneFound, language);
  let extra = '';
  if (facility.emergency24x7 && urgency !== 'self_care') extra = pick(T.facilityEmergencyExtra, language);
  else if (facility.openNow === true) extra = pick(T.facilityOpenExtra, language);
  return fill(pick(T.facilityIntro, language), { name: facility.name, km: formatKm(facility.travel.distanceMeters), extra });
}

export function directionsSentence(facility: RankedFacility, language: Language): string {
  return fill(pick(T.directions, language), {
    name: facility.name,
    km: formatKm(facility.travel.distanceMeters),
    minutes: formatMinutes(facility.travel.durationSeconds),
  });
}

export function noteSentences(notes: readonly ContextNote[], language: Language, limit = 1): string[] {
  return notes.slice(0, limit).map((n) => pick(CONTEXT_NOTES[n], language));
}

export const ADVICE_REPLIES: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'Show directions', value: 'show directions' },
    { label: 'Nearby hospitals', value: 'show nearby hospitals' },
    { label: 'Add a symptom', value: 'I have another symptom' },
    { label: 'Start over', value: 'start over' },
  ],
  hi: [
    { label: 'रास्ता दिखाएं', value: 'रास्ता दिखाओ' },
    { label: 'पास के अस्पताल', value: 'पास के अस्पताल दिखाओ' },
    { label: 'एक और तकलीफ़', value: 'एक और तकलीफ है' },
    { label: 'फिर से शुरू', value: 'फिर से शुरू करो' },
  ],
  hinglish: [
    { label: 'Rasta dikhao', value: 'rasta dikhao' },
    { label: 'Paas ke hospital', value: 'paas ke hospital dikhao' },
    { label: 'Ek aur takleef', value: 'ek aur takleef hai' },
    { label: 'Phir se shuru', value: 'phir se shuru karo' },
  ],
  bn: [
    { label: 'রাস্তা দেখান', value: 'রাস্তা দেখাও' },
    { label: 'কাছের হাসপাতাল', value: 'কাছের হাসপাতাল দেখাও' },
    { label: 'আরও একটা কষ্ট', value: 'আমার আরও একটা কষ্ট আছে' },
    { label: 'নতুন করে শুরু', value: 'নতুন করে শুরু করো' },
  ],
};

export const STARTER_REPLIES: LocalizedOf<QuickReply[]> = {
  en: [
    { label: 'I have a fever', value: 'I have had a fever since yesterday' },
    { label: 'Find a hospital', value: 'find the nearest hospital' },
  ],
  hi: [
    { label: 'बुखार है', value: 'मुझे कल से बुखार है' },
    { label: 'अस्पताल ढूंढें', value: 'नज़दीकी अस्पताल बताओ' },
  ],
  hinglish: [
    { label: 'Bukhar hai', value: 'mujhe kal se bukhar hai' },
    { label: 'Hospital dhoondho', value: 'nazdeeki hospital batao' },
  ],
  bn: [
    { label: 'জ্বর হয়েছে', value: 'আমার কাল থেকে জ্বর' },
    { label: 'হাসপাতাল খুঁজুন', value: 'কাছের হাসপাতাল বলো' },
  ],
};
