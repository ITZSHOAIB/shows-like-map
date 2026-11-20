// What search engines and link previews read from a show page (#4): a title and description of its own, and structured data.
import type { Show } from "./catalogue";

export const SITE_NAME = "Shows Like Map";
/** Search results cut a description at about 155 characters. */
export const DESCRIPTION_MAX = 155;

/** "The Office (2001)" where another show shares the name, plain "The Office" otherwise. */
export const labelOf = (show: Pick<Show, "name" | "premiered">, repeated: boolean) =>
  repeated && show.premiered ? `${show.name} (${show.premiered.slice(0, 4)})` : show.name;

export const titleOf = (label: string) => `Shows like ${label} | ${SITE_NAME}`;

/**
 * "Shows like Breaking Bad: Better Call Saul, Ozark, Narcos and 7 more, each with why it's similar, ...": as many of the
 * match names as fit, since the names are what a searcher scans for. Names go before the promise does.
 */
export function descriptionOf(label: string, matchNames: string[]) {
  const promise = "each with why it's similar, whether it ended, and hours to finish.";
  for (let k = Math.min(matchNames.length, 5); k > 0; k--) {
    const rest = matchNames.length - k;
    const list = rest > 0 ? `${matchNames.slice(0, k).join(", ")} and ${rest} more` : matchNames.slice(0, k).join(", ");
    const text = `Shows like ${label}: ${list}, ${promise}`;
    if (text.length <= DESCRIPTION_MAX) return text;
  }
  return `Shows like ${label}, ${promise}`;
}

/** JSON for a <script> tag: "<" is escaped so no text in the data, a summary say, can end the tag early. */
export const scriptJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** The show as a TVSeries, and the way back home as breadcrumbs (the one type that changes how a result looks). */
export function structuredData(show: Show, url: string, home: string) {
  const sameAs = [show.tvmaze, show.wikidata && `https://www.wikidata.org/wiki/${show.wikidata}`, show.wikipedia].filter(Boolean);
  return [
    {
      "@context": "https://schema.org",
      "@type": "TVSeries",
      name: show.name,
      url,
      ...(show.poster && { image: show.poster }),
      ...(show.premiered && { datePublished: show.premiered }),
      ...(show.seasons > 0 && { numberOfSeasons: show.seasons }),
      ...(show.episodes > 0 && { numberOfEpisodes: show.episodes }),
      ...(show.genres.length > 0 && { genre: show.genres }),
      ...(show.language && { inLanguage: show.language }),
      sameAs,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE_NAME, item: home },
        { "@type": "ListItem", position: 2, name: `Shows like ${show.name}`, item: url },
      ],
    },
  ];
}
