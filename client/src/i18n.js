import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "CivicResolve": "CivicResolve",
      "Home": "Home",
      "Map Dashboard": "Map Dashboard",
      "Report Issue": "Report Issue",
      "About": "About",
      "Identify the Source Location": "Identify the Source Location",
      "Drag or click on the map": "Drag or click on the map to firmly plant your physical GPS marker coordinate.",
      "Report Civic Incident": "Report Civic Incident"
    }
  },
  bn: {
    translation: {
      "CivicResolve": "সিভিকরিজলভ",
      "Home": "হোম",
      "Map Dashboard": "ম্যাপ ড্যাশবোর্ড",
      "Report Issue": "সমস্যা জানান",
      "About": "আমাদের সম্পর্কে",
      "Identify the Source Location": "মূল অবস্থানটি চিহ্নিত করুন",
      "Drag or click on the map": "ম্যাপে আপনার সুনির্দিষ্ট অবস্থান নির্দেশ করতে ক্লিক করুন বা টেনে আনুন।",
      "Report Civic Incident": "নাগরিক সমস্যা নিবন্ধন"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // React natively mitigates XSS naturally 
    }
  });

export default i18n;
