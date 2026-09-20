import { ReviewView } from '@/components/review/review-view';

export const metadata = {
  title: 'Clinical review — Sanjeevani',
  description: 'Clinician review of triage decisions. Structured clinical facts only — no transcripts, no identifiers.',
  // A staff console has no business in search results, and the decisions behind it
  // are not public even though nothing on the page identifies anyone.
  robots: { index: false, follow: false },
};

export default function ReviewPage() {
  return <ReviewView />;
}
