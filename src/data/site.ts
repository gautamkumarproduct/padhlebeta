/**
 * Single source of truth for site-wide config.
 * Update `siteUrl` once you attach a custom domain (e.g. https://padhlebeta.in).
 */
export const site = {
  name: 'Padhle Beta',
  tagline: 'Free PDF tools for Indian students.',
  description:
    'Convert dark coaching PDFs to ink-saving prints, merge notes, compress files, and more — all in your browser. Files never leave your device. Free, forever.',
  // Update this when you attach a custom domain.
  siteUrl: 'https://gautamkumarproduct.github.io',
  basePath: '/padhlebeta',
  locale: 'en-IN',
  twitterHandle: '@padhlebeta',
  founder: 'Padhle Beta',
  contactEmail: 'hello@padhlebeta.in',
  ogImage: '/og-default.svg',
  github: {
    org: 'gautamkumarproduct',
    repo: 'padhlebeta',
  },
} as const;

export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Tools', href: '/tools/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'About', href: '/about/' },
] as const;

export type Tool = {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  benefits: readonly string[];
  faq: readonly { q: string; a: string }[];
  steps: readonly string[];
  keywords: readonly string[];
};

export const tools: readonly Tool[] = [
  {
    slug: 'dark-to-light',
    name: 'Dark PDF to Light PDF',
    shortName: 'Dark → Light',
    description:
      'Convert dark-backgrounded lecture slides into ink-saving, black-on-white printables. Save up to 60% on printer ink.',
    longDescription:
      'Most coaching slides are designed for screen — black background, white text. Printing them as-is wastes a fortune in ink. Padhle Beta inverts every page: white background, dark text, optimised margins. The result is a clean, readable printable that uses a fraction of the ink.',
    benefits: [
      'Save up to 60% on printer ink per page',
      'Improves readability on paper — no more squinting at dark slides',
      'Same file, same size — pages are visually transformed in place',
      'Works entirely in your browser — your notes never leave your device',
    ],
    steps: [
      'Drop your dark-themed PDF into the uploader below.',
      'Click "Convert to light PDF".',
      'Preview the result page by page.',
      'Download the converted PDF — ready to print.',
    ],
    faq: [
      {
        q: 'Does this change the page order or content?',
        a: 'No. Every page is preserved in order. Only the colours and contrast are inverted for paper.',
      },
      {
        q: 'Will images look weird?',
        a: 'Logos and charts may look inverted on light backgrounds. For pure-text slides this is the single biggest ink saving you can make.',
      },
      {
        q: 'Is there a file size limit?',
        a: 'No server upload — everything runs in your browser, so the limit is just your device memory. We have tested with 500+ page PDFs.',
      },
      {
        q: 'Are my files private?',
        a: 'Yes. Your PDF is processed entirely in your browser. Nothing is uploaded, logged, or stored anywhere.',
      },
    ],
    keywords: [
      'dark pdf to light pdf',
      'print dark slides without ink',
      'save ink printing coaching notes',
      'invert pdf for printing',
    ],
  },
  {
    slug: 'merge',
    name: 'Merge PDFs',
    shortName: 'Merge',
    description:
      'Combine multiple PDFs into one document. Reorder pages, drag to upload, download a single merged file.',
    longDescription:
      'Stop juggling ten PDFs. Padhle Beta merges them into a single, ordered file in seconds. Drag to reorder, drop to add, and download.',
    benefits: [
      'Combine an entire subject\'s notes into one file',
      'Reorder pages by drag-and-drop before merging',
      'No upload, no signup, no watermarks',
      'Handles large files — tested with 1000+ pages',
    ],
    steps: [
      'Drop your PDFs into the uploader (multiple files supported).',
      'Drag to reorder the files in the order you want.',
      'Click "Merge PDFs".',
      'Download the combined file.',
    ],
    faq: [
      {
        q: 'Is there a limit on how many files I can merge?',
        a: 'No hard limit — it depends on your device. Most browsers handle 10+ files of 200 pages each without breaking a sweat.',
      },
      {
        q: 'Can I reorder pages inside a single PDF?',
        a: 'This tool merges whole files. For reordering pages inside a single PDF, use the Extract Pages tool.',
      },
      {
        q: 'Are my files uploaded to a server?',
        a: 'No. Merging happens in your browser using pdf-lib. Nothing leaves your device.',
      },
    ],
    keywords: ['merge pdf online free', 'combine pdf files', 'pdf merger for students'],
  },
  {
    slug: 'compress',
    name: 'Compress PDF',
    shortName: 'Compress',
    description:
      'Shrink large coaching PDFs for easier sharing and faster downloads. Useful when WhatsApp refuses to send a file.',
    longDescription:
      'Coaching PDFs are often huge — 50MB+ for a single subject. Padhle Beta compresses them in your browser by optimising embedded images and stripping metadata, so they fit WhatsApp, email, and Google Drive limits.',
    benefits: [
      'Get under WhatsApp\'s 100MB limit reliably',
      'Optimised for sharing — smaller file, same content',
      'Browser-based — files stay on your device',
      'No quality compromise on text — only images are re-encoded',
    ],
    steps: [
      'Drop your PDF into the uploader.',
      'Click "Compress PDF".',
      'See the size reduction in real time.',
      'Download the smaller file.',
    ],
    faq: [
      {
        q: 'How much will the size drop?',
        a: 'Typical reduction: 30–70% on image-heavy slides. Text-only PDFs may compress less because they are already small.',
      },
      {
        q: 'Will quality suffer?',
        a: 'Text is preserved at full quality. Embedded images are re-encoded at a sensible resolution — readable, not pixel-perfect.',
      },
      {
        q: 'Is there a file size limit?',
        a: 'No server upload means no server limit. Only your device RAM matters.',
      },
    ],
    keywords: ['compress pdf online free', 'reduce pdf size', 'shrink coaching pdf'],
  },
  {
    slug: 'image-to-pdf',
    name: 'Image to PDF',
    shortName: 'Image → PDF',
    description:
      'Combine photos of handwritten notes, textbook pages, or whiteboards into a single, shareable PDF.',
    longDescription:
      'Capture a chapter with your phone, drop the images in, and get a clean PDF back. Perfect for handwritten notes, textbook page photos, or whiteboard captures.',
    benefits: [
      'Turn phone photos into clean, shareable notes',
      'Auto-fit each image to A4 with sensible margins',
      'Reorder images before exporting',
      'Works entirely offline once loaded',
    ],
    steps: [
      'Drop your images (JPG, PNG, HEIC) into the uploader.',
      'Drag to reorder.',
      'Click "Convert to PDF".',
      'Download the resulting PDF.',
    ],
    faq: [
      {
        q: 'Will my photos be cropped?',
        a: 'No. Each image is fit to A4 with margins so nothing is cropped. Original aspect ratio is preserved.',
      },
      {
        q: 'Can I convert HEIC files (iPhone)?',
        a: 'Yes — modern browsers handle HEIC. If yours does not, convert to JPG first.',
      },
      {
        q: 'Is there a limit on number of images?',
        a: 'No server-side limit. Your device memory is the only constraint.',
      },
    ],
    keywords: ['image to pdf online free', 'convert photos to pdf', 'jpg to pdf'],
  },
  {
    slug: 'extract-pages',
    name: 'Extract Pages from PDF',
    shortName: 'Extract',
    description:
      'Pull out only the pages you need from a long PDF. Perfect for sharing one chapter or one topic.',
    longDescription:
      'Got a 600-page PDF but only need pages 142 to 178? Padhle Beta extracts exactly the range you specify into a new PDF — no re-uploading, no signups.',
    benefits: [
      'Pull a single chapter or topic from a large PDF',
      'Specify page ranges like 12-25, 40, 55-60',
      'Browser-based, no upload, no waiting',
      'Preserves original quality',
    ],
    steps: [
      'Drop your PDF into the uploader.',
      'Enter the page ranges you want (e.g. 1-5, 12, 18-22).',
      'Click "Extract pages".',
      'Download the new PDF containing only those pages.',
    ],
    faq: [
      {
        q: 'What page range formats are supported?',
        a: 'Comma-separated ranges like "1-5, 10, 15-20". The tool will show you exactly how many pages match before extracting.',
      },
      {
        q: 'Are original pages preserved?',
        a: 'Yes. Pages are copied byte-perfect from the source PDF.',
      },
      {
        q: 'Can I extract in reverse order or duplicate a page?',
        a: 'Not in v1. Each page appears at most once in the output.',
      },
    ],
    keywords: ['extract pages from pdf', 'pdf page extractor', 'split pdf online free'],
  },
] as const;

export function getTool(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}
