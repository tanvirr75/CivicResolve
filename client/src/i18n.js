import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ─── Translations ─────────────────────────────────────────────────────────────
const resources = {
  en: {
    translation: {
      'CivicResolve':              'CivicResolve',
      'Home':                      'Home',
      'Map Dashboard':             'Map Dashboard',
      'Report Issue':              'Report Issue',
      'About':                     'About',
      'Identify the Source Location': 'Identify the Source Location',
      'Drag or click on the map':  'Drag or click on the map to firmly plant your physical GPS marker coordinate.',
      'Report Civic Incident':     'Report Civic Incident',
      'Dashboard':                 'Dashboard',
      'Submit Report':             'Submit Report',
      'Live Map':                  'Live Map',
      'Notifications':             'Notifications',
      'My Drafts':                 'My Drafts',
      'Logout':                    'Logout',
      'Settings':                  'Settings',
    },
  },
  bn: {
    translation: {
      'CivicResolve':              'সিভিকরিজলভ',
      'Home':                      'হোম',
      'Map Dashboard':             'ম্যাপ ড্যাশবোর্ড',
      'Report Issue':              'সমস্যা জানান',
      'About':                     'আমাদের সম্পর্কে',
      'Identify the Source Location': 'মূল অবস্থানটি চিহ্নিত করুন',
      'Drag or click on the map':  'ম্যাপে আপনার সুনির্দিষ্ট অবস্থান নির্দেশ করতে ক্লিক করুন।',
      'Report Civic Incident':     'নাগরিক সমস্যা নিবন্ধন',
      'Dashboard':                 'ড্যাশবোর্ড',
      'Submit Report':             'রিপোর্ট করুন',
      'Live Map':                  'লাইভ ম্যাপ',
      'Notifications':             'বিজ্ঞপ্তি',
      'My Drafts':                 'আমার ড্রাফট',
      'Logout':                    'লগ আউট',
      'Settings':                  'সেটিংস',
    },
  },
};

// ─── Read persisted language choice ──────────────────────────────────────────
const savedLang = localStorage.getItem('civicresolve_lang') ?? 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng:          savedLang,
    fallbackLng:  'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
