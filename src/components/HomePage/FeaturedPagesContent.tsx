import {
  type SearchParams,
  VenueContent,
  getLocalizedContent,
  getPage,
  getPages,
} from "@venuecms/sdk-next";
import { connection } from "next/server";

import {
  contentComponents,
  contentHandlers,
  pageBodyStyles,
} from "@/components/ListingBlock";
import { ColumnLeft, ColumnRight, TwoColumnLayout } from "@/components/layout";

/** A featured page stays featured until its expiration, if it has one. */
const isStillFeatured = (featuredExpiration: unknown, now: number) =>
  typeof featuredExpiration !== "string" ||
  !featuredExpiration ||
  Date.parse(featuredExpiration) > now;

export async function FeaturedPagesContent({
  locale,
  searchParams,
}: {
  locale: string;
  /** Awaited here, inside the Suspense boundary, as EventsContent does. */
  searchParams: Promise<SearchParams>;
}) {
  await connection();

  const [{ data: pages }, resolvedSearchParams] = await Promise.all([
    getPages({ featured: true }),
    searchParams,
  ]);

  const now = Date.now();
  const featured = (pages?.records ?? []).filter(
    (page) => page.featured && isStillFeatured(page.featuredExpiration, now),
  );

  // The page list carries no bodies, so each page is fetched in full. One that
  // fails to load is dropped rather than taking the others down with it.
  const featuredPages = (
    await Promise.all(
      featured.map(({ slug }) =>
        getPage({ slug }).then(
          ({ data }) => data,
          (error) => {
            console.error(`Featured page "${slug}" failed to load`, error);
            return undefined;
          },
        ),
      ),
    )
  ).filter((page) => page != null);

  if (!featuredPages.length) return null;

  // Only the body: no title or image. In the right-hand column, so it lines up
  // under the events list, with no top padding since the events section's
  // bottom padding already spaces the two.
  return (
    <TwoColumnLayout className="pt-0 lg:pt-0">
      <ColumnLeft className="hidden sm:flex" />
      <ColumnRight className="gap-12">
        {featuredPages.map((page) => (
          <VenueContent
            key={page.id}
            components={contentHandlers}
            className={pageBodyStyles}
            content={getLocalizedContent(page.localizedContent, locale).content}
            contentStyles={contentComponents}
            searchParams={resolvedSearchParams}
          />
        ))}
      </ColumnRight>
    </TwoColumnLayout>
  );
}
