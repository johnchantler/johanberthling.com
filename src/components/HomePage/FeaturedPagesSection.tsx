import { type SearchParams } from "@venuecms/sdk-next";
import { Suspense } from "react";

import { ErrorBoundary } from "@/components/utils/ErrorBoundary";

import { FeaturedPagesError } from "./ErrorFallbacks";
import { FeaturedPagesContent } from "./FeaturedPagesContent";

export function FeaturedPagesSection({
  locale,
  searchParams,
}: {
  locale: string;
  /**
   * Forwarded unawaited, as EventsSection does: a page body can hold a listing
   * block whose pager needs the URL.
   */
  searchParams: Promise<SearchParams>;
}) {
  return (
    <ErrorBoundary fallback={<FeaturedPagesError />}>
      {/* Nothing while loading: it sits below the events, which hold their
          own skeleton, and a site may feature no pages at all. */}
      <Suspense fallback={null}>
        <FeaturedPagesContent locale={locale} searchParams={searchParams} />
      </Suspense>
    </ErrorBoundary>
  );
}
