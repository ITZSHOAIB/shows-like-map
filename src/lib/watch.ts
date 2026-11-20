// Where to watch (#3): a link out to JustWatch India's search. JustWatch has no free API, and which service carries a
// show changes too often to bake in at build time, so the search is asked when the link is followed.

/** JustWatch India's search for a show, by name. */
export const watchUrl = (name: string) => `https://www.justwatch.com/in/search?q=${encodeURIComponent(name)}`;
