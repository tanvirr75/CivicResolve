import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// ─── Translations ─────────────────────────────────────────────────────────────
const resources = {
  en: {
    translation: {
      // ── Brand (never translate) ──────────────────────────────────────────
      'CivicResolve': 'CivicResolve',

      // ── Navigation labels ────────────────────────────────────────────────
      'Dashboard':       'Dashboard',
      'Submit Report':   'Submit Report',
      'Live Map':        'Live Map',
      'Notifications':   'Notifications',
      'My Drafts':       'My Drafts',
      'My Profile':      'My Profile',
      'Reports':         'Reports',
      'Assign Workers':  'Assign Workers',
      'Work Orders':     'Work Orders',
      'Users':           'Users',
      'Analytics':       'Analytics',
      'Logout':          'Logout',
      'Navigation':      'Navigation',

      // ── Role labels ──────────────────────────────────────────────────────
      'Citizen':         'Citizen',
      'Ward Official':   'Ward Official',
      'Field Worker':    'Field Worker',
      'System Admin':    'System Admin',

      // ── Auth pages ───────────────────────────────────────────────────────
      'Sign in':                          'Sign in',
      'Email address':                    'Email address',
      'Password':                         'Password',
      "Don't have an account?":           "Don't have an account?",
      'Create one →':                     'Create one →',
      'Create account':                   'Create account',
      'Already registered?':              'Already registered?',
      'Sign in →':                        'Sign in →',
      'Full name':                        'Full name',
      'Confirm password':                 'Confirm password',
      'Phone Number':                     'Phone Number',
      'Date of Birth':                    'Date of Birth',
      'Blood Group':                      'Blood Group',
      'Continue':                         'Continue',
      'Back':                             'Back',
      'Skip and create with just credentials →': 'Skip and create with just credentials →',
      'Create an account to submit reports →':   'Create an account to submit reports →',
      'Or continue as':                   'Or continue as',
      'Welcome back':                     'Welcome back',
      'Account':                          'Account',
      'Login credentials':                'Login credentials',
      'Profile':                          'Profile',
      'Optional details':                 'Optional details',

      // ── Password strength ────────────────────────────────────────────────
      '✓ Strong password':                '✓ Strong password',
      'Moderate — add uppercase or special characters': 'Moderate — add uppercase or special characters',
      'Weak — add numbers and uppercase letters':       'Weak — add numbers and uppercase letters',

      // ── Common actions ───────────────────────────────────────────────────
      'Submit':          'Submit',
      'Cancel':          'Cancel',
      'Save':            'Save',
      'Next':            'Next',
      'Search':          'Search',
      'Filter':          'Filter',
      'Clear':           'Clear',
      'Clear filters':   'Clear filters',
      'Loading':         'Loading',
      'No results found':'No results found',
      'View all →':      'View all →',
      'Close':           'Close',
      'Save as Draft':   'Save as Draft',
      'Assign':          'Assign',
      'Confirm Assignment': 'Confirm Assignment',

      // ── Status labels ────────────────────────────────────────────────────
      'Open':        'Open',
      'Assigned':    'Assigned',
      'In Progress': 'In Progress',
      'Resolved':    'Resolved',

      // ── Category labels ──────────────────────────────────────────────────
      'Road':     'Road',
      'Waste':    'Waste',
      'Drainage': 'Drainage',
      'Lighting': 'Lighting',
      'Water':    'Water',
      'Other':    'Other',
      'Safety':   'Safety',
      'Parks':    'Parks',

      // ── Citizen Dashboard ────────────────────────────────────────────────
      'Good morning':  'Good morning',
      'Good afternoon':'Good afternoon',
      'Good evening':  'Good evening',
      'Track all your civic reports in one place.': 'Track all your civic reports in one place.',
      'My Reports':    'My Reports',
      'Total':         'Total',
      'Live Heatmap (Around you)': 'Live Heatmap (Around you)',
      'active issues': 'active issues',
      'No reports found.': 'No reports found.',
      'Submit your first report →': 'Submit your first report →',
      'Search reports…': 'Search reports…',
      'Filter by status': 'Filter by status',

      // ── Table headers ────────────────────────────────────────────────────
      'Title':        'Title',
      'Category':     'Category',
      'Status':       'Status',
      'Priority':     'Priority',
      'Submitted':    'Submitted',
      'Submitted By': 'Submitted By',
      'Assigned To':  'Assigned To',

      // ── Submit report page ───────────────────────────────────────────────
      'Submit a Report':   'Submit a Report',
      'Complete all four steps to submit your civic issue report.':
        'Complete all four steps to submit your civic issue report.',
      'Location':          'Location',
      'Details':           'Details',
      'Evidence':          'Evidence',
      'Review & Submit':   'Review & Submit',
      'Click anywhere on the map to drop a pin at the issue location.':
        'Click anywhere on the map to drop a pin at the issue location.',
      'No location selected — click the map to place your pin.':
        'No location selected — click the map to place your pin.',
      "We'll check for nearby duplicate reports automatically.":
        "We'll check for nearby duplicate reports automatically.",
      'Submit anonymously': 'Submit anonymously',
      'Report title':       'Report title',
      'Description':        'Description',
      'Describe the issue in detail — the AI will auto-categorize it...':
        'Describe the issue in detail — the AI will auto-categorize it...',
      'Upload a photo or short video as evidence. (Optional but recommended)':
        'Upload a photo or short video as evidence. (Optional but recommended)',
      'Image or video evidence (JPG, PNG, MP4 · max 10MB)':
        'Image or video evidence (JPG, PNG, MP4 · max 10MB)',
      'Choose file':       'Choose file',
      'Submit Report':     'Submit Report',
      'Report Civic Incident': 'Report Civic Incident',
      "You're offline":    "You're offline",
      "Report saved as draft and will sync when you're back online.":
        "Report saved as draft and will sync when you're back online.",
      'Anonymous':         'Anonymous',
      'Yes':               'Yes',
      'No':                'No',
      'None attached':     'None attached',
      'Pending AI':        'Pending AI',
      'Not estimated':     'Not estimated',
      'Possible duplicate':'Possible duplicate',

      // ── Notifications ────────────────────────────────────────────────────
      'All notifications':       'All notifications',
      'Mark all as read':        'Mark all as read',
      'No notifications yet':    'No notifications yet',
      'You are all caught up!':  'You are all caught up!',

      // ── Map Dashboard ─────────────────────────────────────────────────────
      'Map Dashboard': 'Map Dashboard',
      'Identify the Source Location': 'Identify the Source Location',
      'Drag or click on the map': 'Drag or click on the map to firmly plant your physical GPS marker coordinate.',

      // ── Report detail ─────────────────────────────────────────────────────
      'Report Details':  'Report Details',
      'Community Thread': 'Community Thread',
      'Verify':          'Verify',
      'Official Authority Controls': 'Official Authority Controls',
      'Digital Field Operations':    'Digital Field Operations',
      'No comments yet. Be the first to respond.': 'No comments yet. Be the first to respond.',

      // ── Landing page ──────────────────────────────────────────────────────
      'About': 'About',
      'Report Issue': 'Report Issue',
      'Home': 'Home',
      'Settings': 'Settings',
    },
  },

  bn: {
    translation: {
      // ── Brand (never translate) ──────────────────────────────────────────
      'CivicResolve': 'CivicResolve',

      // ── Navigation labels ────────────────────────────────────────────────
      'Dashboard':       'ড্যাশবোর্ড',
      'Submit Report':   'রিপোর্ট করুন',
      'Live Map':        'লাইভ ম্যাপ',
      'Notifications':   'বিজ্ঞপ্তি',
      'My Drafts':       'আমার ড্রাফট',
      'My Profile':      'আমার প্রোফাইল',
      'Reports':         'রিপোর্টসমূহ',
      'Assign Workers':  'কর্মী নিযুক্ত করুন',
      'Work Orders':     'কার্যাদেশ',
      'Users':           'ব্যবহারকারী',
      'Analytics':       'বিশ্লেষণ',
      'Logout':          'লগ আউট',
      'Navigation':      'নেভিগেশন',

      // ── Role labels ──────────────────────────────────────────────────────
      'Citizen':         'নাগরিক',
      'Ward Official':   'ওয়ার্ড কর্মকর্তা',
      'Field Worker':    'মাঠকর্মী',
      'System Admin':    'সিস্টেম অ্যাডমিন',

      // ── Auth pages ───────────────────────────────────────────────────────
      'Sign in':                          'সাইন ইন',
      'Email address':                    'ইমেইল ঠিকানা',
      'Password':                         'পাসওয়ার্ড',
      "Don't have an account?":           'অ্যাকাউন্ট নেই?',
      'Create one →':                     'তৈরি করুন →',
      'Create account':                   'অ্যাকাউন্ট তৈরি করুন',
      'Already registered?':              'ইতিমধ্যে নিবন্ধিত?',
      'Sign in →':                        'সাইন ইন →',
      'Full name':                        'পুরো নাম',
      'Confirm password':                 'পাসওয়ার্ড নিশ্চিত করুন',
      'Phone Number':                     'ফোন নম্বর',
      'Date of Birth':                    'জন্ম তারিখ',
      'Blood Group':                      'রক্তের গ্রুপ',
      'Continue':                         'চালিয়ে যান',
      'Back':                             'ফিরে যান',
      'Skip and create with just credentials →': 'শুধু তথ্য দিয়ে তৈরি করুন →',
      'Create an account to submit reports →':   'রিপোর্ট করতে অ্যাকাউন্ট তৈরি করুন →',
      'Or continue as':                   'অথবা চালিয়ে যান',
      'Welcome back':                     'স্বাগতম',
      'Account':                          'অ্যাকাউন্ট',
      'Login credentials':                'লগইন তথ্য',
      'Profile':                          'প্রোফাইল',
      'Optional details':                 'ঐচ্ছিক বিবরণ',

      // ── Password strength ────────────────────────────────────────────────
      '✓ Strong password':                '✓ শক্তিশালী পাসওয়ার্ড',
      'Moderate — add uppercase or special characters': 'মাঝারি — বড় হরফ বা বিশেষ অক্ষর যোগ করুন',
      'Weak — add numbers and uppercase letters':       'দুর্বল — সংখ্যা ও বড় হরফ যোগ করুন',

      // ── Common actions ───────────────────────────────────────────────────
      'Submit':          'জমা দিন',
      'Cancel':          'বাতিল',
      'Save':            'সংরক্ষণ',
      'Next':            'পরবর্তী',
      'Search':          'অনুসন্ধান',
      'Filter':          'ফিল্টার',
      'Clear':           'মুছুন',
      'Clear filters':   'ফিল্টার মুছুন',
      'Loading':         'লোড হচ্ছে',
      'No results found':'কোনো ফলাফল পাওয়া যায়নি',
      'View all →':      'সব দেখুন →',
      'Close':           'বন্ধ করুন',
      'Save as Draft':   'ড্রাফট সংরক্ষণ করুন',
      'Assign':          'নিযুক্ত করুন',
      'Confirm Assignment': 'নিযুক্তি নিশ্চিত করুন',

      // ── Status labels ────────────────────────────────────────────────────
      'Open':        'খোলা',
      'Assigned':    'নিযুক্ত',
      'In Progress': 'চলমান',
      'Resolved':    'সমাধান হয়েছে',

      // ── Category labels ──────────────────────────────────────────────────
      'Road':     'সড়ক',
      'Waste':    'বর্জ্য',
      'Drainage': 'ড্রেনেজ',
      'Lighting': 'আলো',
      'Water':    'পানি',
      'Other':    'অন্যান্য',
      'Safety':   'নিরাপত্তা',
      'Parks':    'পার্ক',

      // ── Citizen Dashboard ────────────────────────────────────────────────
      'Good morning':  'শুভ সকাল',
      'Good afternoon':'শুভ অপরাহ্ণ',
      'Good evening':  'শুভ সন্ধ্যা',
      'Track all your civic reports in one place.': 'আপনার সমস্ত নাগরিক রিপোর্ট এক জায়গায় ট্র্যাক করুন।',
      'My Reports':    'আমার রিপোর্ট',
      'Total':         'মোট',
      'Live Heatmap (Around you)': 'লাইভ হিটম্যাপ (আপনার আশেপাশে)',
      'active issues': 'সক্রিয় সমস্যা',
      'No reports found.': 'কোনো রিপোর্ট পাওয়া যায়নি।',
      'Submit your first report →': 'আপনার প্রথম রিপোর্ট করুন →',
      'Search reports…': 'রিপোর্ট খুঁজুন…',
      'Filter by status': 'অবস্থা অনুযায়ী ফিল্টার',

      // ── Table headers ────────────────────────────────────────────────────
      'Title':        'শিরোনাম',
      'Category':     'বিভাগ',
      'Status':       'অবস্থা',
      'Priority':     'অগ্রাধিকার',
      'Submitted':    'জমাদান',
      'Submitted By': 'জমাদানকারী',
      'Assigned To':  'নিযুক্ত কর্মী',

      // ── Submit report page ───────────────────────────────────────────────
      'Submit a Report':   'একটি রিপোর্ট করুন',
      'Complete all four steps to submit your civic issue report.':
        'আপনার নাগরিক সমস্যার রিপোর্ট জমা দিতে চারটি ধাপ সম্পন্ন করুন।',
      'Location':          'অবস্থান',
      'Details':           'বিস্তারিত',
      'Evidence':          'প্রমাণ',
      'Review & Submit':   'পর্যালোচনা ও জমা',
      'Click anywhere on the map to drop a pin at the issue location.':
        'সমস্যার অবস্থানে মানচিত্রে যেকোনো জায়গায় ক্লিক করুন।',
      'No location selected — click the map to place your pin.':
        'কোনো অবস্থান নির্বাচন করা হয়নি — পিন রাখতে মানচিত্রে ক্লিক করুন।',
      "We'll check for nearby duplicate reports automatically.":
        'আমরা স্বয়ংক্রিয়ভাবে কাছাকাছি একই রকম রিপোর্ট খুঁজে দেখব।',
      'Submit anonymously': 'নামহীনভাবে জমা দিন',
      'Report title':       'রিপোর্টের শিরোনাম',
      'Description':        'বিবরণ',
      'Describe the issue in detail — the AI will auto-categorize it...':
        'সমস্যাটি বিস্তারিত বর্ণনা করুন — AI স্বয়ংক্রিয়ভাবে শ্রেণিবদ্ধ করবে...',
      'Upload a photo or short video as evidence. (Optional but recommended)':
        'প্রমাণ হিসেবে একটি ছবি বা ছোট ভিডিও আপলোড করুন। (ঐচ্ছিক কিন্তু বাঞ্ছনীয়)',
      'Image or video evidence (JPG, PNG, MP4 · max 10MB)':
        'ছবি বা ভিডিও প্রমাণ (JPG, PNG, MP4 · সর্বোচ্চ 10MB)',
      'Choose file':       'ফাইল বেছে নিন',
      'Submit Report':     'রিপোর্ট জমা দিন',
      'Report Civic Incident': 'নাগরিক সমস্যা নিবন্ধন',
      "You're offline":    'আপনি অফলাইনে আছেন',
      "Report saved as draft and will sync when you're back online.":
        'রিপোর্টটি ড্রাফট হিসেবে সংরক্ষিত হয়েছে এবং অনলাইন হলে সিঙ্ক হবে।',
      'Anonymous':         'নামহীন',
      'Yes':               'হ্যাঁ',
      'No':                'না',
      'None attached':     'কিছু যুক্ত নেই',
      'Pending AI':        'AI বিশ্লেষণ বাকি',
      'Not estimated':     'অনুমান করা হয়নি',
      'Possible duplicate':'সম্ভাব্য ডুপ্লিকেট',

      // ── Notifications ────────────────────────────────────────────────────
      'All notifications':       'সমস্ত বিজ্ঞপ্তি',
      'Mark all as read':        'সব পঠিত চিহ্নিত করুন',
      'No notifications yet':    'এখনো কোনো বিজ্ঞপ্তি নেই',
      'You are all caught up!':  'সব বিজ্ঞপ্তি দেখা হয়েছে!',

      // ── Map Dashboard ─────────────────────────────────────────────────────
      'Map Dashboard': 'ম্যাপ ড্যাশবোর্ড',
      'Identify the Source Location': 'মূল অবস্থানটি চিহ্নিত করুন',
      'Drag or click on the map': 'ম্যাপে আপনার সুনির্দিষ্ট অবস্থান নির্দেশ করতে ক্লিক করুন।',

      // ── Report detail ─────────────────────────────────────────────────────
      'Report Details':  'রিপোর্টের বিবরণ',
      'Community Thread': 'সামাজিক আলোচনা',
      'Verify':          'যাচাই করুন',
      'Official Authority Controls': 'কর্তৃপক্ষের নিয়ন্ত্রণ',
      'Digital Field Operations':    'ডিজিটাল মাঠ পরিচালনা',
      'No comments yet. Be the first to respond.': 'এখনো কোনো মন্তব্য নেই। প্রথম মন্তব্য করুন।',

      // ── Landing page ──────────────────────────────────────────────────────
      'About': 'আমাদের সম্পর্কে',
      'Report Issue': 'সমস্যা জানান',
      'Home': 'হোম',
      'Settings': 'সেটিংস',
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

// Persist language to localStorage on every change
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('civicresolve_lang', lng);
});

export default i18n;
