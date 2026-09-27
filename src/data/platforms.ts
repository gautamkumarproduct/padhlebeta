/**
 * Programmatic "How to print <platform> notes" landing pages (/print/<slug>/).
 *
 * Each entry carries its own intro, material list, settings and FAQ so pages
 * are genuinely different — thin templated copies get treated as doorway
 * pages. Keep claims general: we describe the *kind* of PDF students get,
 * never internal details of a platform we cannot verify.
 */

export type Platform = {
  slug: string;
  /** Short brand name used in headings: "PW", "Unacademy". */
  name: string;
  /** Full name for first mention and schema. */
  fullName: string;
  /** Other ways students search for it. */
  aliases: readonly string[];
  exams: readonly string[];
  intro: string;
  /** What students typically print from this platform. */
  materials: readonly { title: string; note: string }[];
  /** Recommended ToolShell defaults for this platform's PDFs. */
  defaults: { perSheet: '1' | '2' | '4' | '6'; grayscale: boolean };
  settingsWhy: string;
  tips: readonly string[];
  faq: readonly { q: string; a: string }[];
};

export const platforms: readonly Platform[] = [
  {
    slug: 'physics-wallah-notes',
    name: 'PW',
    fullName: 'Physics Wallah (PW)',
    aliases: ['Physics Wallah', 'PW', 'PW app', 'Arjuna', 'Lakshya', 'Yakeen', 'Prayas'],
    exams: ['JEE Main', 'JEE Advanced', 'NEET', 'Class 11', 'Class 12'],
    intro:
      'PW class notes are usually exported straight from the teacher’s dark digital board: white and coloured handwriting on a black page. They are brilliant on a phone and painful to print — every page is almost solid black. Converting them first turns a cartridge-killing PDF into clean black-on-white notes.',
    materials: [
      { title: 'Class notes (board PDFs)', note: 'Dark background — convert before printing. This is where the biggest saving is.' },
      { title: 'DPPs (daily practice problems)', note: 'Usually already white. Auto mode leaves them untouched, so you can run mixed PDFs safely.' },
      { title: 'Module / sheet PDFs', note: 'Typically print-ready. Use Pages per Sheet to fit 2 pages on one A4 side for revision.' },
    ],
    defaults: { perSheet: '2', grayscale: false },
    settingsWhy:
      'Board notes are landscape and use large handwriting, so 2 per sheet stays very readable and halves your paper. Colour is kept because teachers use coloured pens to separate concepts — switch on black & white if your printer is mono.',
    tips: [
      'Download the lecture PDF from the PW app or website first — this tool works on the PDF file, not inside the app.',
      'Batch a whole chapter: merge all class-note PDFs of one chapter, then convert once.',
      'For formula revision, extract just the summary pages and print them 4 per sheet.',
    ],
    faq: [
      {
        q: 'How do I print PW notes without wasting ink?',
        a: 'Download the class-notes PDF, choose it in the converter on this page and click Convert. Dark board pages become white with dark handwriting, and the new PDF downloads automatically. Print that file instead of the original.',
      },
      {
        q: 'Will the coloured handwriting still be visible?',
        a: 'Yes. Inversion keeps colours distinct — they shift to their opposite shade, so different pen colours stay different. If you want pure black text, tick “Black & white output”.',
      },
      {
        q: 'Does this work for Arjuna, Lakshya, Yakeen and Prayas batch notes?',
        a: 'Yes. It works on any PDF, whatever the batch. Padhle Beta is not affiliated with Physics Wallah — it simply converts PDFs you already have.',
      },
    ],
  },
  {
    slug: 'unacademy-notes',
    name: 'Unacademy',
    fullName: 'Unacademy',
    aliases: ['Unacademy', 'Unacademy Plus', 'Unacademy Iconic', 'Unacademy class notes'],
    exams: ['JEE', 'NEET', 'UPSC', 'Class 11', 'Class 12'],
    intro:
      'Unacademy educators often teach on dark-themed slides, and the downloadable class notes keep that dark look. With dozens of classes per course, printing them as-is gets expensive fast. Convert them to light pages first and print exactly the same content for a fraction of the ink.',
    materials: [
      { title: 'Class notes / slides', note: 'Often dark — convert first.' },
      { title: 'Practice sets and PYQ PDFs', note: 'Usually white already; Auto mode skips them.' },
      { title: 'Handwritten educator notes', note: 'Convert, then print 2 per sheet — handwriting stays legible.' },
    ],
    defaults: { perSheet: '2', grayscale: false },
    settingsWhy:
      'Slides are 16:9 with big fonts, so two fit comfortably on one A4 page. Keep colour on if your educator colour-codes diagrams.',
    tips: [
      'Rename each download with the class number before merging, so your merged file stays in order.',
      'Delete intro and “subscribe” slides with Organise PDF before printing.',
      'For UPSC notes that are mostly text, 4 per sheet is still readable.',
    ],
    faq: [
      {
        q: 'How do I convert Unacademy dark slides to white for printing?',
        a: 'Download the class notes PDF, choose it in the converter on this page and click Convert. You get a light version ready to print in a few seconds.',
      },
      {
        q: 'Can I convert many Unacademy classes at once?',
        a: 'Merge them into one PDF with the Merge tool first, then convert the merged file in one go.',
      },
      {
        q: 'Is this an official Unacademy tool?',
        a: 'No. Padhle Beta is independent and not affiliated with Unacademy. It only converts PDFs you already have on your device.',
      },
    ],
  },
  {
    slug: 'vedantu-notes',
    name: 'Vedantu',
    fullName: 'Vedantu',
    aliases: ['Vedantu', 'Vedantu class notes', 'Vedantu slides'],
    exams: ['JEE', 'NEET', 'CBSE Class 9–12', 'Olympiads'],
    intro:
      'Vedantu live-class slides are designed for screens, and many exported PDFs keep dark or heavily coloured backgrounds. Converting them to white pages keeps every diagram and equation while cutting the ink bill dramatically.',
    materials: [
      { title: 'Live class slides', note: 'Convert dark slides; Auto mode leaves white pages alone.' },
      { title: 'Chapter notes', note: 'Often colourful — try Grayscale PDF if you print in black only.' },
      { title: 'Worksheets', note: 'Usually print-ready as-is.' },
    ],
    defaults: { perSheet: '2', grayscale: false },
    settingsWhy:
      'Two slides per sheet is the sweet spot for readability. If slides have coloured panels rather than black backgrounds, run Grayscale PDF instead to stop colour-ink use.',
    tips: [
      'School-level (CBSE) slides often have large fonts — try 4 per sheet.',
      'Add page numbers after converting so loose printed pages stay in order.',
    ],
    faq: [
      {
        q: 'How do I print Vedantu notes cheaply?',
        a: 'Convert dark slides to light with the tool on this page, then print 2 slides per sheet. For colourful but not dark slides, use Grayscale PDF so only black ink is used.',
      },
      {
        q: 'Are my Vedantu PDFs uploaded?',
        a: 'No. Everything happens in your browser. Padhle Beta is not affiliated with Vedantu.',
      },
    ],
  },
  {
    slug: 'allen-notes',
    name: 'ALLEN',
    fullName: 'ALLEN (ALLEN Online / Digital)',
    aliases: ['Allen', 'Allen Digital', 'Allen Online', 'Allen Kota notes'],
    exams: ['JEE Main', 'JEE Advanced', 'NEET', 'Pre-foundation'],
    intro:
      'ALLEN’s printed modules are famous, but online lecture notes and class PDFs are a different story — many come from dark-themed boards and slides. Converting them lets you add them to your module binder without draining a cartridge.',
    materials: [
      { title: 'Online lecture notes', note: 'Convert dark pages before printing.' },
      { title: 'Test papers and solutions', note: 'Usually white. Crop PDF can trim wide margins so text prints bigger.' },
      { title: 'Revision PDFs', note: 'Print 4 per sheet for quick flip-through revision.' },
    ],
    defaults: { perSheet: '2', grayscale: true },
    settingsWhy:
      'Black & white output keeps notes consistent with the printed modules and uses only black toner. Two per sheet keeps board writing large.',
    tips: [
      'Punch-hole margin: set Crop to 0 and Pages per Sheet margin to 12 mm so nothing gets punched through.',
      'Use Split PDF to break a long revision PDF into subject files.',
    ],
    faq: [
      {
        q: 'Can I convert ALLEN online class notes to white background?',
        a: 'Yes — choose the PDF in the converter above and click Convert. Padhle Beta is independent and not affiliated with ALLEN.',
      },
      {
        q: 'Should I print ALLEN test papers with this?',
        a: 'Test papers are usually already white, so you do not need Dark → Light. Try Crop PDF to remove margins, or Pages per Sheet to save paper on solutions.',
      },
    ],
  },
  {
    slug: 'aakash-notes',
    name: 'Aakash',
    fullName: 'Aakash (Aakash Digital)',
    aliases: ['Aakash', 'Aakash Digital', 'Aakash iTutor', 'Aakash BYJU’S'],
    exams: ['NEET', 'JEE', 'Foundation'],
    intro:
      'NEET aspirants at Aakash often combine printed study material with digital lecture PDFs. The digital ones frequently use dark slides — great for a tablet, wasteful on paper. Convert them first and your biology diagrams print crisp on white.',
    materials: [
      { title: 'Digital lecture slides', note: 'Convert first — Auto mode detects dark pages.' },
      { title: 'Biology diagrams', note: 'Use High quality so fine labels stay sharp.' },
      { title: 'Practice PDFs', note: 'Usually print-ready.' },
    ],
    defaults: { perSheet: '1', grayscale: false },
    settingsWhy:
      'Biology diagrams have small labels, so one slide per sheet at standard or high quality is safest. Use 2 per sheet for Physics and Chemistry slides.',
    tips: ['Merge a unit (e.g. Human Physiology) into one file before converting.', 'Print diagrams single-sided so you can annotate the back.'],
    faq: [
      {
        q: 'How do I print Aakash digital notes for NEET?',
        a: 'Convert the dark lecture PDF on this page, then print. For diagram-heavy biology, keep 1 per sheet and choose High quality.',
      },
      {
        q: 'Is Padhle Beta connected to Aakash?',
        a: 'No. It is an independent free tool that works on any PDF you already have.',
      },
    ],
  },
  {
    slug: 'byjus-notes',
    name: 'BYJU’S',
    fullName: 'BYJU’S',
    aliases: ['Byjus', 'BYJU’S', 'Byju notes'],
    exams: ['CBSE', 'ICSE', 'JEE', 'NEET', 'Class 6–12'],
    intro:
      'BYJU’S learning material mixes colourful illustrated pages with dark video-style slides. Most of the ink goes on backgrounds rather than content. Convert dark pages to white, or strip colour completely, before you print.',
    materials: [
      { title: 'Dark slides and screenshots', note: 'Use Dark → Light.' },
      { title: 'Colourful illustrated notes', note: 'Use Grayscale PDF to stop colour-ink use.' },
    ],
    defaults: { perSheet: '2', grayscale: true },
    settingsWhy: 'School-level material has large text and diagrams, so 2 per sheet in black & white is readable and cheap.',
    tips: ['Screenshots from a tablet? Use Image to PDF first, then convert.'],
    faq: [
      {
        q: 'How do I print BYJU’S notes in black and white?',
        a: 'Use the converter on this page with “Black & white output” ticked. For pages that are colourful but not dark, use Grayscale PDF instead.',
      },
      { q: 'Is this an official BYJU’S tool?', a: 'No — Padhle Beta is independent and free.' },
    ],
  },
  {
    slug: 'motion-notes',
    name: 'Motion',
    fullName: 'Motion Education',
    aliases: ['Motion', 'Motion Kota', 'Motion Education notes'],
    exams: ['JEE', 'NEET'],
    intro:
      'Motion’s online classes produce long lecture PDFs, often with dark board backgrounds. A single chapter can run to a hundred pages — convert and print them multiple-per-sheet and a whole chapter fits in a slim booklet.',
    materials: [
      { title: 'Lecture board notes', note: 'Convert first; 2 per sheet recommended.' },
      { title: 'Sheets and DPPs', note: 'Usually white — print directly or 2 per sheet.' },
    ],
    defaults: { perSheet: '2', grayscale: false },
    settingsWhy: 'Board notes are landscape; two per portrait A4 page keeps them large.',
    tips: ['Add page numbers after converting to keep a 100-page chapter in order.'],
    faq: [
      {
        q: 'How do I print Motion lecture notes?',
        a: 'Convert the PDF on this page (2 per sheet is pre-selected) and print the result. Padhle Beta is not affiliated with Motion Education.',
      },
    ],
  },
  {
    slug: 'competishun-notes',
    name: 'Competishun',
    fullName: 'Competishun',
    aliases: ['Competishun', 'Competishun notes'],
    exams: ['JEE Main', 'JEE Advanced'],
    intro:
      'Competishun’s JEE lectures lean heavily on handwritten problem-solving on a dark board. Printing those notes as-is is expensive; inverted, they read like a clean handwritten notebook.',
    materials: [
      { title: 'Lecture notes', note: 'Convert — dark board pages.' },
      { title: 'Problem sheets', note: 'Usually white; use Extract Pages to print just the ones you are stuck on.' },
    ],
    defaults: { perSheet: '2', grayscale: true },
    settingsWhy: 'Handwritten maths is monochrome in spirit — black & white output keeps it crisp and saves colour ink.',
    tips: ['Convert only the solved-example pages you want by extracting them first.'],
    faq: [
      {
        q: 'Can I print Competishun notes with a white background?',
        a: 'Yes. Choose the PDF above and click Convert. Padhle Beta is independent of Competishun.',
      },
    ],
  },
  {
    slug: 'esaral-notes',
    name: 'eSaral',
    fullName: 'eSaral',
    aliases: ['eSaral', 'esaral notes'],
    exams: ['JEE', 'NEET'],
    intro:
      'eSaral notes and lecture PDFs are popular for quick revision. If yours came from dark-theme lectures, convert before printing so the revision notes you carry around are light and easy to annotate.',
    materials: [
      { title: 'Revision notes', note: 'Print 4 per sheet for pocket revision.' },
      { title: 'Lecture PDFs', note: 'Convert dark pages first.' },
    ],
    defaults: { perSheet: '4', grayscale: false },
    settingsWhy: 'Revision notes are dense summaries — 4 per sheet gives a compact booklet you can carry.',
    tips: ['If 4 per sheet feels small, try 2 per sheet with Crop PDF to remove margins.'],
    faq: [
      {
        q: 'How do I print eSaral notes cheaply?',
        a: 'Convert them on this page with 4 per sheet selected. Padhle Beta is not affiliated with eSaral.',
      },
    ],
  },
  {
    slug: 'apni-kaksha-notes',
    name: 'Apni Kaksha',
    fullName: 'Apni Kaksha',
    aliases: ['Apni Kaksha', 'Apni Kaksha notes'],
    exams: ['JEE', 'Class 11', 'Class 12', 'Coding'],
    intro:
      'Apni Kaksha’s free YouTube lectures come with shared notes PDFs, many written on a dark board. Printing them for free-course learners should not cost more than the course did — convert them first.',
    materials: [
      { title: 'Lecture notes PDFs', note: 'Convert dark pages first.' },
      { title: 'Coding notes with dark code screenshots', note: 'Dark → Light makes code readable on paper.' },
    ],
    defaults: { perSheet: '2', grayscale: true },
    settingsWhy: 'Two per sheet, black & white: the cheapest readable combination for handwritten lecture notes.',
    tips: ['Merge a full playlist’s notes into one PDF before converting.'],
    faq: [
      {
        q: 'How do I print Apni Kaksha notes?',
        a: 'Download the notes PDF, choose it on this page and click Convert. Padhle Beta is independent.',
      },
    ],
  },
  {
    slug: 'next-toppers-notes',
    name: 'Next Toppers',
    fullName: 'Next Toppers',
    aliases: ['Next Toppers', 'Class 10 notes', 'Class 9 notes'],
    exams: ['Class 9', 'Class 10', 'CBSE Boards'],
    intro:
      'Next Toppers notes help Class 9 and 10 students prepare for boards, and a lot of them are dark-board PDFs. Parents printing these at home or at the local Xerox shop can save a lot by converting first.',
    materials: [
      { title: 'Chapter notes', note: 'Convert dark pages, 2 per sheet.' },
      { title: 'One-shot revision notes', note: 'Great at 4 per sheet before exams.' },
    ],
    defaults: { perSheet: '2', grayscale: true },
    settingsWhy: 'Xerox shops usually charge less for black & white prints — convert to B&W before you go.',
    tips: ['Taking notes to a print shop? Compress the converted PDF so it sends easily on WhatsApp.'],
    faq: [
      {
        q: 'How do I print Class 10 notes cheaply?',
        a: 'Convert dark PDFs to light black & white on this page and print 2 per sheet. Padhle Beta is not affiliated with Next Toppers.',
      },
    ],
  },
  {
    slug: 'mathongo-notes',
    name: 'MathonGo',
    fullName: 'MathonGo',
    aliases: ['MathonGo', 'Mathongo notes', 'Mathongo PYQ'],
    exams: ['JEE Main', 'JEE Advanced'],
    intro:
      'MathonGo is known for JEE question banks and chapter-wise PYQs. Lecture PDFs and dark-mode screenshots from the app still need converting before you print — question banks usually do not.',
    materials: [
      { title: 'Chapter-wise PYQ PDFs', note: 'Usually white — use Pages per Sheet and Crop to save paper.' },
      { title: 'Lecture notes / dark screenshots', note: 'Convert with Dark → Light.' },
    ],
    defaults: { perSheet: '2', grayscale: true },
    settingsWhy: 'Question banks are text-dense; 2 per sheet keeps them solvable on paper.',
    tips: ['Extract only unattempted questions and print them as a custom practice sheet.'],
    faq: [
      {
        q: 'Can I print MathonGo PYQs in less paper?',
        a: 'Yes — use Pages per Sheet (2 per sheet) and Crop PDF to trim margins. Padhle Beta is independent of MathonGo.',
      },
    ],
  },
  {
    slug: 'college-lecture-slides',
    name: 'College lecture slides',
    fullName: 'College & university lecture slides',
    aliases: ['university slides', 'dark PPT', 'dark theme PowerPoint', 'lecture PDF'],
    exams: ['B.Tech', 'MBBS', 'B.Sc', 'University exams'],
    intro:
      'Professors love dark PowerPoint themes. Exported to PDF, a 60-slide deck is 60 almost-black pages. Convert them and print 4 or 6 per sheet — the standard way students turn slide decks into study handouts.',
    materials: [
      { title: 'Dark-theme slide decks', note: 'Convert first.' },
      { title: 'Light slide decks', note: 'Skip conversion — just use Pages per Sheet.' },
    ],
    defaults: { perSheet: '4', grayscale: true },
    settingsWhy: 'Slide decks have large text and lots of white space — 4 per sheet is readable and uses a quarter of the paper.',
    tips: ['Export PPTX to PDF first (File → Save as → PDF), then convert here.'],
    faq: [
      {
        q: 'How do I print dark PowerPoint slides to save ink?',
        a: 'Export the deck to PDF, convert it on this page, and print 4 slides per sheet (pre-selected).',
      },
    ],
  },
  {
    slug: 'code-screenshots',
    name: 'Dark code screenshots',
    fullName: 'Dark-mode code screenshots and IDE exports',
    aliases: ['VS Code screenshots', 'dark mode PDF', 'terminal output', 'coding notes'],
    exams: ['Coding interviews', 'DSA', 'B.Tech labs'],
    intro:
      'Dark-mode code screenshots and IDE exports are unreadable when printed — muddy grey syntax on a black slab. Converting inverts them into light-theme code that prints sharp, ideal for DSA notes and lab records.',
    materials: [
      { title: 'PDF of screenshots', note: 'Convert with Dark → Light.' },
      { title: 'Loose PNG/JPG screenshots', note: 'Combine with Image to PDF first.' },
    ],
    defaults: { perSheet: '1', grayscale: true },
    settingsWhy: 'Code needs sharp small text — keep 1 per sheet and pick High quality.',
    tips: ['Syntax colours invert to their complements; tick Black & white for the cleanest print.'],
    faq: [
      {
        q: 'How do I print dark-mode code screenshots?',
        a: 'Put the screenshots into a PDF with Image to PDF, then convert on this page with Black & white output ticked.',
      },
    ],
  },
];

export function getPlatform(slug: string): Platform | undefined {
  return platforms.find((p) => p.slug === slug);
}
