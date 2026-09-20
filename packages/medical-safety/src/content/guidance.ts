import type { Localized } from './localized';

/**
 * General, non-prescriptive self-care guidance. No drug names or doses — the
 * product must never prescribe. Wording follows widely published public-health
 * first-aid advice and should be reviewed by a clinician before any change.
 */
export const CARE_ADVICE = {
  rest_fluids: {
    en: 'Rest and drink plenty of fluids — water, ORS or coconut water.',
    hi: 'आराम करें और खूब तरल पिएं — पानी, ORS या नारियल पानी।',
    hinglish: 'Aaram karein aur khoob paani piyein — paani, ORS ya nariyal paani.',
    bn: 'বিশ্রাম নিন এবং প্রচুর তরল খান — জল, ওআরএস বা ডাবের জল।',
  },
  fever_comfort: {
    en: 'Wear light clothes; a lukewarm wet cloth can help you feel more comfortable.',
    hi: 'हल्के कपड़े पहनें; गुनगुने गीले कपड़े से पोंछने से आराम मिल सकता है।',
    hinglish: 'Halke kapde pehnein; gungune geele kapde se ponchhne se aaram mil sakta hai.',
    bn: 'পাতলা জামাকাপড় পরুন; ঈষদুষ্ণ ভেজা কাপড় দিয়ে গা মুছলে আরাম লাগতে পারে।',
  },
  monitor_temperature: {
    en: 'Check your temperature every few hours and note it down for the doctor.',
    hi: 'हर कुछ घंटों में तापमान जांचें और डॉक्टर के लिए लिख लें।',
    hinglish: 'Har kuch ghanton mein temperature check karein aur doctor ke liye likh lein.',
    bn: 'কয়েক ঘণ্টা অন্তর তাপমাত্রা মেপে ডাক্তারের জন্য লিখে রাখুন।',
  },
  no_self_medication: {
    en: 'Ask a doctor or pharmacist before taking any medicine, and don’t start antibiotics on your own.',
    hi: 'कोई भी दवा लेने से पहले डॉक्टर या फार्मासिस्ट से पूछें, और खुद से एंटीबायोटिक शुरू न करें।',
    hinglish: 'Koi bhi dawai lene se pehle doctor ya pharmacist se poochhein, aur khud se antibiotic shuru na karein.',
    bn: 'যেকোনো ওষুধ খাওয়ার আগে ডাক্তার বা ওষুধের দোকানে জিজ্ঞেস করুন, এবং নিজে থেকে অ্যান্টিবায়োটিক শুরু করবেন না।',
  },
  ors_small_sips: {
    en: 'Take small, frequent sips of ORS to replace lost fluids.',
    hi: 'शरीर में पानी की कमी पूरी करने के लिए ORS थोड़ा-थोड़ा बार-बार पिएं।',
    hinglish: 'Paani ki kami poori karne ke liye ORS thoda-thoda baar-baar piyein.',
    bn: 'শরীরের জলের ঘাটতি পূরণ করতে অল্প অল্প করে বারবার ওআরএস খান।',
  },
  light_food: {
    en: 'Eat light, simple food like khichdi or curd rice when you feel able.',
    hi: 'जब मन करे, हल्का खाना जैसे खिचड़ी या दही-चावल लें।',
    hinglish: 'Jab mann kare, halka khana jaise khichdi ya dahi-chawal lein.',
    bn: 'খেতে পারলে খিচুড়ি বা দই-ভাতের মতো হালকা সাধারণ খাবার খান।',
  },
  steam_warm_fluids: {
    en: 'Warm fluids and steam inhalation can ease a sore throat and blocked nose.',
    hi: 'गुनगुना पानी और भाप लेने से गले और बंद नाक में आराम मिल सकता है।',
    hinglish: 'Gungunna paani aur bhaap lene se gale aur band naak mein aaram mil sakta hai.',
    bn: 'গরম পানীয় আর ভাপ নিলে গলা ব্যথা ও বন্ধ নাকে আরাম হয়।',
  },
  wound_clean: {
    en: 'Rinse the wound gently with clean running water and cover it with a clean cloth.',
    hi: 'घाव को साफ़ बहते पानी से धीरे से धोएं और साफ़ कपड़े से ढकें।',
    hinglish: 'Ghaav ko saaf behte paani se dheere se dhoyein aur saaf kapde se dhakein.',
    bn: 'ক্ষতটি পরিষ্কার বইতে থাকা জলে আলতো করে ধুয়ে পরিষ্কার কাপড় দিয়ে ঢেকে দিন।',
  },
  bite_wash: {
    en: 'Wash the bite with soap and running water for about 15 minutes. Anti-rabies care is time-sensitive, so go today.',
    hi: 'काटे हुए स्थान को साबुन और बहते पानी से लगभग 15 मिनट धोएं। रेबीज़ से बचाव का इलाज समय पर ज़रूरी है, इसलिए आज ही जाएं।',
    hinglish: 'Kaate hue jagah ko sabun aur behte paani se lagbhag 15 minute dhoyein. Rabies se bachav ka ilaaj samay par zaroori hai, isliye aaj hi jaayein.',
    bn: 'কামড়ের জায়গা সাবান আর বইতে থাকা জলে প্রায় ১৫ মিনিট ধুয়ে নিন। জলাতঙ্কের চিকিৎসা সময়ের উপর নির্ভর করে, তাই আজই যান।',
  },
  burn_cool: {
    en: 'Cool the burn under cool running water for 20 minutes. Don’t apply ice, toothpaste or oil.',
    hi: 'जले हुए हिस्से को 20 मिनट ठंडे बहते पानी में रखें। बर्फ, टूथपेस्ट या तेल न लगाएं।',
    hinglish: 'Jale hue hisse ko 20 minute thande behte paani mein rakhein. Barf, toothpaste ya tel na lagayein.',
    bn: 'পোড়া জায়গায় ২০ মিনিট ঠান্ডা বইতে থাকা জল ঢালুন। বরফ, টুথপেস্ট বা তেল লাগাবেন না।',
  },
  injury_rest_cold: {
    en: 'Rest the injured part and apply a cold pack wrapped in cloth for short periods.',
    hi: 'चोट वाले हिस्से को आराम दें और कपड़े में लपेटकर ठंडी सिकाई करें।',
    hinglish: 'Chot wale hisse ko aaram dein aur kapde mein lapet kar thandi sikai karein.',
    bn: 'আহত জায়গাটি বিশ্রামে রাখুন এবং কাপড়ে মোড়ানো ঠান্ডা সেঁক অল্প সময়ের জন্য দিন।',
  },
  dental_rinse: {
    en: 'Rinse with warm salt water and avoid very hot or cold food.',
    hi: 'गुनगुने नमक वाले पानी से कुल्ला करें और बहुत गर्म या ठंडा खाने से बचें।',
    hinglish: 'Gungune namak wale paani se kulla karein aur bahut garam ya thanda khane se bachein.',
    bn: 'ঈষদুষ্ণ নুন-জলে কুলকুচি করুন এবং খুব গরম বা খুব ঠান্ডা খাবার এড়িয়ে চলুন।',
  },
  eye_care: {
    en: 'Don’t rub your eyes, wash your hands often, and don’t use old eye drops.',
    hi: 'आंखें न मलें, बार-बार हाथ धोएं, और पुरानी आई-ड्रॉप इस्तेमाल न करें।',
    hinglish: 'Aankhen na malein, baar-baar haath dhoyein, aur purani eye drops use na karein.',
    bn: 'চোখ রগড়াবেন না, বারবার হাত ধুয়ে নিন, এবং পুরনো আই ড্রপ ব্যবহার করবেন না।',
  },
  mental_support: {
    en: 'You don’t have to handle this alone. Tele-MANAS (14416) offers free, confidential support 24×7.',
    hi: 'आपको यह अकेले नहीं झेलना है। टेली-मानस (14416) पर 24×7 मुफ़्त और गोपनीय मदद मिलती है।',
    hinglish: 'Aapko ye akele nahi jhelna hai. Tele-MANAS (14416) par 24×7 muft aur gopniya madad milti hai.',
    bn: 'এটা আপনাকে একা সামলাতে হবে না। টেলি-মানস (১৪৪১৬) বিনামূল্যে, গোপনীয় সহায়তা দেয়, ২৪×৭।',
  },
  sleep_hygiene: {
    en: 'Keep a regular sleep time and avoid screens and tea or coffee late in the day.',
    hi: 'सोने का समय तय रखें और शाम को स्क्रीन, चाय-कॉफ़ी से बचें।',
    hinglish: 'Sone ka samay fix rakhein aur shaam ko screen, chai-coffee se bachein.',
    bn: 'ঘুমের সময় নিয়মিত রাখুন এবং রাতের দিকে স্ক্রিন আর চা-কফি এড়িয়ে চলুন।',
  },
  urination_fluids: {
    en: 'Drink enough water and don’t hold urine for long.',
    hi: 'पर्याप्त पानी पिएं और पेशाब को देर तक न रोकें।',
    hinglish: 'Kaafi paani piyein aur peshab ko der tak na rokein.',
    bn: 'পর্যাপ্ত জল খান এবং বেশিক্ষণ প্রস্রাব চেপে রাখবেন না।',
  },
  keep_company: {
    en: 'Keep someone with you and avoid driving yourself.',
    hi: 'किसी को अपने साथ रखें और खुद गाड़ी न चलाएं।',
    hinglish: 'Kisi ko apne saath rakhein aur khud gaadi na chalayein.',
    bn: 'সঙ্গে কাউকে রাখুন এবং নিজে গাড়ি চালাবেন না।',
  },
  child_fluids: {
    en: 'Keep offering fluids or breast milk in small amounts, and watch how much they drink and pee.',
    hi: 'बच्चे को थोड़ा-थोड़ा पानी या मां का दूध देते रहें, और ध्यान रखें कि वह कितना पी रहा है और पेशाब कर रहा है।',
    hinglish: 'Bachche ko thoda-thoda paani ya maa ka doodh dete rahein, aur dhyan rakhein ki woh kitna pee raha hai aur peshab kar raha hai.',
    bn: 'অল্প অল্প করে জল বা বুকের দুধ দিতে থাকুন, এবং কতটা খাচ্ছে ও প্রস্রাব করছে সেদিকে নজর রাখুন।',
  },
} satisfies Record<string, Localized>;

export type CareAdviceKey = keyof typeof CARE_ADVICE;

/** "Seek help immediately if…" signs. */
export const WARNING_SIGNS = {
  breathing: { en: 'trouble breathing', hi: 'सांस लेने में तकलीफ़', hinglish: 'saans lene mein takleef', bn: 'শ্বাস নিতে কষ্ট' },
  chest_pain: { en: 'chest pain', hi: 'सीने में दर्द', hinglish: 'seene mein dard', bn: 'বুকে ব্যথা' },
  confusion: { en: 'confusion or extreme drowsiness', hi: 'भ्रम या बहुत ज़्यादा सुस्ती', hinglish: 'confusion ya bahut zyada sustee', bn: 'অসংলগ্ন কথা বা খুব বেশি ঝিমুনি' },
  fever_persistent: { en: 'fever lasting more than 3 days', hi: '3 दिन से ज़्यादा बुखार', hinglish: '3 din se zyada bukhar', bn: '৩ দিনের বেশি জ্বর থাকা' },
  cannot_drink: { en: 'being unable to keep fluids down', hi: 'पानी भी न रुक पाना', hinglish: 'paani bhi na ruk paana', bn: 'জল পর্যন্ত পেটে না থাকা' },
  bleeding_signs: { en: 'bleeding from gums or nose, or black stools', hi: 'मसूड़ों या नाक से खून, या काला मल', hinglish: 'masoodon ya naak se khoon, ya kaala mal', bn: 'মাড়ি বা নাক দিয়ে রক্ত, অথবা কালো পায়খানা' },
  severe_abdominal: { en: 'severe stomach pain', hi: 'पेट में तेज़ दर्द', hinglish: 'pet mein tez dard', bn: 'পেটে তীব্র ব্যথা' },
  stiff_neck_rash: { en: 'a stiff neck or a new rash', hi: 'गर्दन में अकड़न या नए दाने', hinglish: 'gardan mein akdan ya naye daane', bn: 'ঘাড় শক্ত হয়ে যাওয়া বা নতুন ফুসকুড়ি' },
  seizure: { en: 'a seizure', hi: 'दौरा पड़ना', hinglish: 'daura padna', bn: 'খিঁচুনি হওয়া' },
  less_urine: { en: 'very little or no urine', hi: 'बहुत कम या बिल्कुल पेशाब न आना', hinglish: 'bahut kam ya bilkul peshab na aana', bn: 'খুব কম বা একেবারেই প্রস্রাব না হওয়া' },
  worsening_pain: { en: 'pain that keeps getting worse', hi: 'लगातार बढ़ता दर्द', hinglish: 'lagataar badhta dard', bn: 'ক্রমশ বেড়ে চলা ব্যথা' },
  numbness_weakness: { en: 'numbness or weakness in a limb', hi: 'हाथ-पैर में सुन्नपन या कमज़ोरी', hinglish: 'haath-pair mein sunnpan ya kamzori', bn: 'হাত বা পায়ে অসাড়তা বা দুর্বলতা' },
  vision_change: { en: 'sudden change in vision', hi: 'अचानक नज़र में बदलाव', hinglish: 'achanak nazar mein badlaav', bn: 'হঠাৎ দৃষ্টিতে পরিবর্তন' },
  self_harm_thoughts: { en: 'thoughts of harming yourself', hi: 'खुद को नुकसान पहुंचाने के विचार', hinglish: 'khud ko nuksaan pahunchane ke vichaar', bn: 'নিজের ক্ষতি করার চিন্তা' },
  infection_signs: { en: 'spreading redness, pus or fever', hi: 'फैलती लालिमा, मवाद या बुखार', hinglish: 'failti laalima, mawaad ya bukhar', bn: 'ছড়িয়ে পড়া লালভাব, পুঁজ বা জ্বর' },
} satisfies Record<string, Localized>;

export type WarningSignKey = keyof typeof WARNING_SIGNS;

export const WARNING_PREFIX: Localized = {
  en: 'Go to a hospital immediately or call 112 if you notice',
  hi: 'अगर ये दिखे तो तुरंत अस्पताल जाएं या 112 पर कॉल करें',
  hinglish: 'Agar ye dikhe to turant hospital jaayein ya 112 par call karein',
  bn: 'নিচের কিছু দেখলে সঙ্গে সঙ্গে হাসপাতালে যান বা ১১২ নম্বরে ফোন করুন',
};

/** Emergency first-aid steps. Always short, imperative and free of diagnosis. */
export const EMERGENCY_INSTRUCTIONS: Record<string, Localized[]> = {
  cardiac: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Stop all activity and sit or lie in the most comfortable position.', hi: 'सारी गतिविधि रोकें और आराम की स्थिति में बैठें या लेटें।', hinglish: 'Sab kaam rok dein aur aaram se baithein ya letein.', bn: 'সব কাজ বন্ধ করুন এবং যেভাবে আরাম লাগে সেভাবে বসুন বা শুয়ে পড়ুন।' },
    { en: 'Loosen tight clothing. Do not drive yourself.', hi: 'तंग कपड़े ढीले करें। खुद गाड़ी न चलाएं।', hinglish: 'Tight kapde dheele karein. Khud gaadi na chalayein.', bn: 'আঁটসাঁট জামাকাপড় আলগা করুন। নিজে গাড়ি চালাবেন না।' },
    { en: 'If they stop responding and aren’t breathing normally, start chest compressions if you know how.', hi: 'अगर वे जवाब न दें और ठीक से सांस न लें, तो आता हो तो छाती दबाना (CPR) शुरू करें।', hinglish: 'Agar woh jawab na dein aur theek se saans na lein, to aata ho to CPR shuru karein.', bn: 'যদি সাড়া না দেন এবং স্বাভাবিকভাবে শ্বাস না নেন, আর যদি আপনার জানা থাকে, তবে বুকে চাপ (CPR) দেওয়া শুরু করুন।' },
  ],
  breathing: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Sit upright and stay as calm as possible.', hi: 'सीधे बैठें और जितना हो सके शांत रहें।', hinglish: 'Seedhe baithein aur jitna ho sake shaant rahein.', bn: 'সোজা হয়ে বসুন এবং যতটা সম্ভব শান্ত থাকুন।' },
    { en: 'If an inhaler has been prescribed, use it as directed.', hi: 'अगर इनहेलर लिखा गया है, तो बताए अनुसार इस्तेमाल करें।', hinglish: 'Agar inhaler likha gaya hai, to bataye anusaar use karein.', bn: 'ইনহেলার দেওয়া থাকলে নির্দেশ অনুযায়ী ব্যবহার করুন।' },
    { en: 'Loosen tight clothing and get fresh air.', hi: 'तंग कपड़े ढीले करें और ताज़ी हवा आने दें।', hinglish: 'Tight kapde dheele karein aur taazi hawa aane dein.', bn: 'আঁটসাঁট জামাকাপড় আলগা করুন এবং খোলা হাওয়া আসতে দিন।' },
  ],
  stroke: [
    { en: 'Call 112 now and note the time symptoms started.', hi: 'अभी 112 पर कॉल करें और लक्षण शुरू होने का समय नोट करें।', hinglish: 'Abhi 112 par call karein aur lakshan shuru hone ka samay note karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন এবং লক্ষণ কখন শুরু হয়েছিল সেই সময়টা লিখে রাখুন।' },
    { en: 'Don’t give food, water or medicine.', hi: 'खाना, पानी या दवा न दें।', hinglish: 'Khana, paani ya dawai na dein.', bn: 'খাবার, জল বা ওষুধ দেবেন না।' },
    { en: 'If they are drowsy, lay them on their side.', hi: 'अगर वे सुस्त हैं, तो उन्हें करवट लिटाएं।', hinglish: 'Agar woh sust hain, to unhe karwat litayein.', bn: 'ঝিমিয়ে পড়লে একপাশ করে শুইয়ে দিন।' },
  ],
  unconscious: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Check whether they are breathing.', hi: 'देखें कि वे सांस ले रहे हैं या नहीं।', hinglish: 'Dekhein ki woh saans le rahe hain ya nahi.', bn: 'দেখুন তিনি শ্বাস নিচ্ছেন কি না।' },
    { en: 'If breathing, turn them onto their side.', hi: 'अगर सांस ले रहे हैं, तो करवट लिटा दें।', hinglish: 'Agar saans le rahe hain, to karwat lita dein.', bn: 'শ্বাস নিলে একপাশ করে শুইয়ে দিন।' },
    { en: 'If not breathing normally, start chest compressions if you know how.', hi: 'अगर ठीक से सांस नहीं ले रहे, तो आता हो तो CPR शुरू करें।', hinglish: 'Agar theek se saans nahi le rahe, to aata ho to CPR shuru karein.', bn: 'স্বাভাবিকভাবে শ্বাস না নিলে, জানা থাকলে বুকে চাপ (CPR) দেওয়া শুরু করুন।' },
  ],
  major_trauma: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Don’t move the person unless they are in danger.', hi: 'जब तक खतरा न हो, व्यक्ति को हिलाएं नहीं।', hinglish: 'Jab tak khatra na ho, vyakti ko hilayein nahi.', bn: 'বিপদ না থাকলে তাঁকে নড়াচড়া করাবেন না।' },
    { en: 'Press firmly on any bleeding with a clean cloth.', hi: 'खून बह रहा हो तो साफ़ कपड़े से कसकर दबाएं।', hinglish: 'Khoon beh raha ho to saaf kapde se kas kar dabayein.', bn: 'রক্ত পড়লে পরিষ্কার কাপড় দিয়ে জোরে চেপে ধরুন।' },
  ],
  severe_bleeding: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Press firmly on the wound with a clean cloth and keep pressing.', hi: 'घाव पर साफ़ कपड़े से कसकर दबाएं और दबाए रखें।', hinglish: 'Ghaav par saaf kapde se kas kar dabayein aur dabaye rakhein.', bn: 'ক্ষতের উপর পরিষ্কার কাপড় দিয়ে জোরে চেপে ধরুন এবং চেপে রাখুন।' },
    { en: 'Raise the injured part if you can.', hi: 'हो सके तो चोट वाले हिस्से को ऊपर उठाएं।', hinglish: 'Ho sake to chot wale hisse ko upar uthayein.', bn: 'সম্ভব হলে আহত জায়গাটি উঁচু করে রাখুন।' },
  ],
  seizure: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Move hard objects away. Don’t hold them down.', hi: 'आस-पास की सख्त चीज़ें हटा दें। उन्हें पकड़कर न रोकें।', hinglish: 'Aas-paas ki sakht cheezein hata dein. Unhe pakad kar na rokein.', bn: 'আশেপাশের শক্ত জিনিস সরিয়ে দিন। তাঁকে চেপে ধরে রাখবেন না।' },
    { en: 'Don’t put anything in their mouth.', hi: 'मुंह में कुछ भी न डालें।', hinglish: 'Munh mein kuch bhi na daalein.', bn: 'মুখে কিছু ঢোকাবেন না।' },
    { en: 'When the jerking stops, turn them onto their side.', hi: 'झटके रुकने पर करवट लिटा दें।', hinglish: 'Jhatke rukne par karwat lita dein.', bn: 'খিঁচুনি থেমে গেলে একপাশ করে শুইয়ে দিন।' },
  ],
  anaphylaxis: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'If they carry an adrenaline auto-injector, use it.', hi: 'अगर उनके पास एड्रेनालिन ऑटो-इंजेक्टर है, तो इस्तेमाल करें।', hinglish: 'Agar unke paas adrenaline auto-injector hai, to use karein.', bn: 'সঙ্গে অ্যাড্রেনালিন অটো-ইনজেক্টর থাকলে সেটি ব্যবহার করুন।' },
    { en: 'Sit up if breathing is hard; lie flat with legs raised if faint.', hi: 'सांस में दिक्कत हो तो बैठें; चक्कर आए तो पैर ऊपर करके लेटें।', hinglish: 'Saans mein dikkat ho to baithein; chakkar aaye to pair upar karke letein.', bn: 'শ্বাস নিতে কষ্ট হলে বসুন; মাথা ঘুরলে পা উঁচু করে শুয়ে পড়ুন।' },
  ],
  poisoning: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Don’t try to make them vomit.', hi: 'उल्टी करवाने की कोशिश न करें।', hinglish: 'Ulti karwane ki koshish na karein.', bn: 'বমি করানোর চেষ্টা করবেন না।' },
    { en: 'Keep the container, strip or bottle to show the doctors.', hi: 'डिब्बा, पत्ता या बोतल डॉक्टर को दिखाने के लिए साथ रखें।', hinglish: 'Dabba, patta ya bottle doctor ko dikhane ke liye saath rakhein.', bn: 'কৌটো, পাতা বা বোতলটি ডাক্তারকে দেখানোর জন্য সঙ্গে রাখুন।' },
  ],
  envenomation: [
    { en: 'Call 112 now or go to the nearest hospital emergency.', hi: 'अभी 112 पर कॉल करें या नज़दीकी अस्पताल इमरजेंसी जाएं।', hinglish: 'Abhi 112 par call karein ya nazdeeki hospital emergency jaayein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন অথবা নিকটতম হাসপাতালের জরুরি বিভাগে যান।' },
    { en: 'Keep the person still and calm; keep the bitten limb still.', hi: 'व्यक्ति को शांत और स्थिर रखें; काटे गए अंग को हिलने न दें।', hinglish: 'Vyakti ko shaant aur sthir rakhein; kaate gaye ang ko hilne na dein.', bn: 'তাঁকে স্থির ও শান্ত রাখুন; যেখানে কামড়েছে সেই হাত বা পা নাড়াবেন না।' },
    { en: 'Don’t cut, suck or tie the bite tightly.', hi: 'काटे हुए स्थान को न काटें, न चूसें, न कसकर बांधें।', hinglish: 'Kaate hue jagah ko na kaatein, na choosein, na kas kar baandhein.', bn: 'কামড়ের জায়গা কাটবেন না, চুষবেন না, শক্ত করে বাঁধবেন না।' },
    { en: 'Remove rings or tight items near the bite.', hi: 'काटे हुए स्थान के पास की अंगूठी या तंग चीज़ें उतार दें।', hinglish: 'Kaate hue jagah ke paas ki angoothi ya tight cheezein utaar dein.', bn: 'কামড়ের কাছের আংটি বা আঁটসাঁট জিনিস খুলে ফেলুন।' },
  ],
  self_harm: [
    { en: 'If you are in immediate danger, call 112 now.', hi: 'अगर आप तुरंत खतरे में हैं, तो अभी 112 पर कॉल करें।', hinglish: 'Agar aap turant khatre mein hain, to abhi 112 par call karein.', bn: 'আপনি যদি এই মুহূর্তে বিপদে থাকেন, এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Tele-MANAS 14416 is free, confidential and open 24×7.', hi: 'टेली-मानस 14416 मुफ़्त, गोपनीय और 24×7 उपलब्ध है।', hinglish: 'Tele-MANAS 14416 muft, gopniya aur 24×7 available hai.', bn: 'টেলি-মানস ১৪৪১৬ বিনামূল্যে, গোপনীয় এবং ২৪×৭ খোলা।' },
    { en: 'Please stay near someone you trust.', hi: 'कृपया किसी भरोसेमंद व्यक्ति के पास रहें।', hinglish: 'Kripya kisi bharosemand vyakti ke paas rahein.', bn: 'বিশ্বাস করেন এমন কারও কাছে থাকুন।' },
    { en: 'Move away from anything you could use to hurt yourself.', hi: 'ऐसी चीज़ों से दूर हो जाएं जिनसे आप खुद को चोट पहुंचा सकते हैं।', hinglish: 'Aisi cheezon se door ho jaayein jinse aap khud ko chot pahuncha sakte hain.', bn: 'যা দিয়ে নিজের ক্ষতি করতে পারেন, তার থেকে দূরে সরে যান।' },
  ],
  severe_burn: [
    { en: 'Call 112 now. If there is electricity involved, switch off the power before touching them.', hi: 'अभी 112 पर कॉल करें। करंट हो तो छूने से पहले बिजली बंद करें।', hinglish: 'Abhi 112 par call karein. Current ho to chhoone se pehle bijli band karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন। বিদ্যুৎ জড়িত থাকলে ছোঁয়ার আগে লাইন বন্ধ করুন।' },
    { en: 'Cool the burn with cool running water for 20 minutes.', hi: 'जले हिस्से को 20 मिनट ठंडे बहते पानी से ठंडा करें।', hinglish: 'Jale hisse ko 20 minute thande behte paani se thanda karein.', bn: 'পোড়া জায়গায় ২০ মিনিট ঠান্ডা বইতে থাকা জল ঢালুন।' },
    { en: 'Remove jewellery nearby, but not clothing stuck to the skin.', hi: 'पास के गहने उतारें, पर त्वचा से चिपके कपड़े न हटाएं।', hinglish: 'Paas ke gehne utaarein, par skin se chipke kapde na hatayein.', bn: 'কাছের গয়না খুলে ফেলুন, তবে চামড়ায় লেগে থাকা কাপড় টানবেন না।' },
    { en: 'Cover loosely with a clean cloth or cling film.', hi: 'साफ़ कपड़े या क्लिंग फिल्म से ढीला ढकें।', hinglish: 'Saaf kapde ya cling film se dheela dhakein.', bn: 'পরিষ্কার কাপড় বা ক্লিং ফিল্ম দিয়ে আলগা করে ঢেকে দিন।' },
  ],
  obstetric: [
    { en: 'Call 112 now or go to the nearest hospital with maternity care.', hi: 'अभी 112 पर कॉल करें या प्रसूति सुविधा वाले नज़दीकी अस्पताल जाएं।', hinglish: 'Abhi 112 par call karein ya maternity wale nazdeeki hospital jaayein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন অথবা প্রসূতি বিভাগ আছে এমন নিকটতম হাসপাতালে যান।' },
    { en: 'Lie on your left side while you wait.', hi: 'इंतज़ार करते समय बाईं करवट लेटें।', hinglish: 'Intezaar karte samay baayin karwat letein.', bn: 'অপেক্ষা করার সময় বাঁ দিকে কাত হয়ে শুয়ে থাকুন।' },
    { en: 'Take your pregnancy records with you.', hi: 'गर्भावस्था के कागज़ात साथ ले जाएं।', hinglish: 'Pregnancy ke papers saath le jaayein.', bn: 'গর্ভাবস্থার কাগজপত্র সঙ্গে নিয়ে যান।' },
  ],
  infant_danger: [
    { en: 'Take the baby to a hospital emergency now, or call 112.', hi: 'शिशु को अभी अस्पताल इमरजेंसी ले जाएं, या 112 पर कॉल करें।', hinglish: 'Baby ko abhi hospital emergency le jaayein, ya 112 par call karein.', bn: 'বাচ্চাকে এখনই হাসপাতালের জরুরি বিভাগে নিয়ে যান, অথবা ১১২ নম্বরে ফোন করুন।' },
    { en: 'Keep the baby warm and keep feeding if they are able to.', hi: 'शिशु को गर्म रखें और पी सके तो दूध पिलाते रहें।', hinglish: 'Baby ko garam rakhein aur pee sake to doodh pilate rahein.', bn: 'বাচ্চাকে গরম রাখুন এবং খেতে পারলে দুধ খাওয়াতে থাকুন।' },
  ],
  meningitis_signs: [
    { en: 'Go to a hospital emergency now, or call 112.', hi: 'अभी अस्पताल इमरजेंसी जाएं, या 112 पर कॉल करें।', hinglish: 'Abhi hospital emergency jaayein, ya 112 par call karein.', bn: 'এখনই হাসপাতালের জরুরি বিভাগে যান, অথবা ১১২ নম্বরে ফোন করুন।' },
    { en: 'Don’t wait to see if the fever settles.', hi: 'बुखार उतरने का इंतज़ार न करें।', hinglish: 'Bukhar utarne ka intezaar na karein.', bn: 'জ্বর কমে কি না দেখার জন্য অপেক্ষা করবেন না।' },
    { en: 'Keep someone with the person at all times.', hi: 'व्यक्ति के साथ हर समय कोई रहे।', hinglish: 'Vyakti ke saath har samay koi rahe.', bn: 'তাঁর সঙ্গে সব সময় কেউ একজন থাকুন।' },
  ],
  user_requested: [
    { en: 'Call 112 now.', hi: 'अभी 112 पर कॉल करें।', hinglish: 'Abhi 112 par call karein.', bn: 'এখনই ১১২ নম্বরে ফোন করুন।' },
    { en: 'Stay with the person and keep your phone line free.', hi: 'व्यक्ति के साथ रहें और फ़ोन लाइन खाली रखें।', hinglish: 'Vyakti ke saath rahein aur phone line khaali rakhein.', bn: 'তাঁর সঙ্গে থাকুন এবং ফোনের লাইন খালি রাখুন।' },
    { en: 'Share your location with the responder.', hi: 'मदद करने वाले को अपनी लोकेशन बताएं।', hinglish: 'Madad karne wale ko apni location batayein.', bn: 'যিনি সাহায্যে আসছেন তাঁকে আপনার অবস্থান জানান।' },
  ],
};

export const DISCLAIMER: Record<'short' | 'full', Localized> = {
  short: {
    en: 'Sanjeevani is not a doctor and cannot diagnose. In an emergency, call 112.',
    hi: 'संजीवनी डॉक्टर नहीं है और निदान नहीं कर सकती। इमरजेंसी में 112 पर कॉल करें।',
    hinglish: 'Sanjeevani doctor nahi hai aur diagnosis nahi kar sakti. Emergency mein 112 par call karein.', bn: 'সঞ্জীবনী ডাক্তার নয় এবং রোগ নির্ণয় করতে পারে না। জরুরি অবস্থায় ১১২ নম্বরে ফোন করুন।',
  },
  full: {
    en: 'Sanjeevani Voice gives general guidance to help you choose the right next step. It is not a doctor, does not diagnose, and does not replace medical advice. If you think it is an emergency, call 112 immediately.',
    hi: 'संजीवनी वॉइस आपको सही अगला कदम चुनने में सामान्य मार्गदर्शन देती है। यह डॉक्टर नहीं है, निदान नहीं करती, और चिकित्सीय सलाह की जगह नहीं लेती। इमरजेंसी लगे तो तुरंत 112 पर कॉल करें।',
    hinglish: 'Sanjeevani Voice aapko sahi agla kadam chunne mein general guidance deti hai. Ye doctor nahi hai, diagnosis nahi karti, aur doctor ki salah ki jagah nahi leti. Emergency lage to turant 112 par call karein.', bn: 'সঞ্জীবনী ভয়েস সঠিক পরবর্তী পদক্ষেপ বেছে নিতে সাধারণ দিকনির্দেশ দেয়। এটি ডাক্তার নয়, রোগ নির্ণয় করে না, এবং ডাক্তারের পরামর্শের বিকল্প নয়। জরুরি অবস্থা মনে হলে সঙ্গে সঙ্গে ১১২ নম্বরে ফোন করুন।',
  },
};
