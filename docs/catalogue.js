const CARRIER_PREFIX = {
  CD: /^(?:CD)(?=$|[\s.\-–,;:])/i,
  LP: /^(?:LP)(?=$|[\s.\-–,;:])/i,
};

export function notesCarrier(notes) {
  if (typeof notes !== "string") return null;
  const text = notes.trim();
  if (CARRIER_PREFIX.CD.test(text)) return "CD";
  if (CARRIER_PREFIX.LP.test(text)) return "LP";
  return null;
}

export function carrierOf(row) {
  if (row.format === "CD" || row.format === "LP") return row.format;
  if (row.format === "box set") return notesCarrier(row.notes);
  return null;
}

export function formatMarks(row) {
  return {
    box: row.format === "box set",
    carrier: carrierOf(row),
  };
}

export function isUncertain(row) {
  return row.confidence === "uncertain";
}

export function fold(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en");
}

export function matchesQuery(row, query) {
  const needle = fold(query.trim());
  if (!needle) return true;
  return [row.artist_or_composer, row.title, row.performers].some(
    (value) => typeof value === "string" && fold(value).includes(needle),
  );
}

export function matchesFilters(row, filters) {
  if (filters.composer && row.artist_or_composer !== filters.composer) return false;
  if (filters.label && row.label !== filters.label) return false;
  if (filters.format && carrierOf(row) !== filters.format) return false;
  return matchesQuery(row, filters.query || "");
}

export function selectRows(rows, filters) {
  return rows.filter((row) => matchesFilters(row, filters));
}

export function compareText(a, b) {
  const aBlank = a == null || a === "";
  const bBlank = b == null || b === "";
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;
  return String(a).localeCompare(String(b), "en", { sensitivity: "base", numeric: true });
}

export function groupByArtist(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.row.artist_or_composer ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.keys()]
    .sort(compareText)
    .map((artist) => ({
      artist,
      entries: groups.get(artist).slice().sort((a, b) => {
        const byTitle = compareText(a.row.title, b.row.title);
        if (byTitle) return byTitle;
        return a.index - b.index;
      }),
    }));
}

export function sortByAlbum(entries) {
  return entries.slice().sort((a, b) => {
    const byTitle = compareText(a.row.title, b.row.title);
    if (byTitle) return byTitle;
    const byArtist = compareText(a.row.artist_or_composer, b.row.artist_or_composer);
    if (byArtist) return byArtist;
    return a.index - b.index;
  });
}

export function uniqueSorted(rows, field) {
  const values = new Set();
  for (const row of rows) {
    const value = row[field];
    if (typeof value === "string" && value) values.add(value);
  }
  return [...values].sort(compareText);
}

export function presentString(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function coverUrl(row) {
  return presentString(row.cover_url);
}

export function referenceLinks(row) {
  const links = [];
  const releaseId = presentString(row.musicbrainz_release_id);
  if (releaseId) {
    links.push({
      label: "MusicBrainz release",
      href: `https://musicbrainz.org/release/${encodeURIComponent(releaseId)}`,
    });
  }
  const groupId = presentString(row.musicbrainz_release_group_id);
  if (groupId) {
    links.push({
      label: "MusicBrainz release group",
      href: `https://musicbrainz.org/release-group/${encodeURIComponent(groupId)}`,
    });
  }
  const discogs = presentString(row.discogs_url);
  if (discogs) links.push({ label: "Discogs", href: discogs });
  return links;
}

export function reviewLinks(row) {
  if (!Array.isArray(row.reviews)) return [];
  const links = [];
  for (const review of row.reviews) {
    if (!review || typeof review !== "object") continue;
    const source = presentString(review.source);
    const url = presentString(review.url);
    if (!source || !url) continue;
    links.push({ source, url });
  }
  return links;
}

export function matchFlag(row) {
  return presentString(row.match_flag);
}

export function coverage(rows) {
  let covers = 0;
  let references = 0;
  let reviews = 0;
  for (const row of rows) {
    if (coverUrl(row)) covers += 1;
    if (referenceLinks(row).length) references += 1;
    if (reviewLinks(row).length) reviews += 1;
  }
  return { covers, references, reviews };
}

export function coverageLine({ covers, references, reviews }) {
  const coverWord = covers === 1 ? "cover" : "covers";
  return `${covers} ${coverWord} · ${references} with a reference · ${reviews} with a review`;
}
