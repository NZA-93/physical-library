import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  carrierOf,
  formatMarks,
  matchesFilters,
  notesCarrier,
  selectRows,
} from "../docs/catalogue.js";

const library = JSON.parse(readFileSync(new URL("../docs/library.json", import.meta.url), "utf8"));
const rows = library.rows;

function find(predicate) {
  const row = rows.find(predicate);
  assert.ok(row, "expected row");
  return row;
}

test("catalogue is the shelf pass, unmodified in shape", () => {
  assert.equal(rows.length, 161);
  assert.equal(library.generated, "2026-10-04");
  for (const row of rows) {
    assert.deepEqual(Object.keys(row).sort(), [
      "artist_or_composer",
      "catalogue_number",
      "confidence",
      "disc_count",
      "format",
      "label",
      "notes",
      "performers",
      "source_filename",
      "source_photo",
      "title",
    ]);
  }
});

test("box set notes name CD or LP, and that carrier is what the filters use", () => {
  const boxes = rows.filter((row) => row.format === "box set");
  assert.equal(boxes.length, 23);
  for (const row of boxes) {
    assert.equal(typeof row.notes, "string");
    const carrier = notesCarrier(row.notes);
    assert.ok(carrier === "CD" || carrier === "LP", row.notes);
    assert.equal(carrierOf(row), carrier);
    assert.deepEqual(formatMarks(row), { box: true, carrier });
    assert.equal(row.format, "box set");
  }

  const cdHeight = find((row) => row.notes && row.notes.startsWith("CD-height"));
  const lpSized = find((row) => row.notes && row.notes.startsWith("LP-sized"));
  assert.equal(carrierOf(cdHeight), "CD");
  assert.equal(carrierOf(lpSized), "LP");
  assert.equal(matchesFilters(cdHeight, { format: "CD" }), true);
  assert.equal(matchesFilters(cdHeight, { format: "LP" }), false);
  assert.equal(matchesFilters(lpSized, { format: "LP" }), true);
  assert.equal(matchesFilters(lpSized, { format: "CD" }), false);

  const orff = find((row) => row.title === "Die Kluge · Der Mond");
  assert.equal(orff.notes, "CD");
  assert.equal(orff.format, "box set");
  assert.equal(matchesFilters(orff, { format: "CD" }), true);

  const cd = selectRows(rows, { format: "CD" });
  const lp = selectRows(rows, { format: "LP" });
  assert.equal(cd.length + lp.length, 161);
  assert.equal(cd.length, 119);
  assert.equal(lp.length, 42);
  assert.ok(cd.includes(orff));
  assert.ok(cd.includes(cdHeight));
  assert.ok(lp.includes(lpSized));
  assert.equal(cd.some((row) => row.format === "LP"), false);
  assert.equal(lp.some((row) => row.format === "CD"), false);
});

test("notes that mention the other carrier do not reclassify a CD or an LP", () => {
  const cdMentioningLp = find(
    (row) => row.format === "CD" && typeof row.notes === "string" && row.notes.includes("LP"),
  );
  const lpMentioningCd = find(
    (row) => row.format === "LP" && typeof row.notes === "string" && /\bCD\b/.test(row.notes),
  );
  assert.equal(carrierOf(cdMentioningLp), "CD");
  assert.equal(formatMarks(cdMentioningLp).box, false);
  assert.equal(carrierOf(lpMentioningCd), "LP");
  assert.equal(matchesFilters(cdMentioningLp, { format: "LP" }), false);
  assert.equal(matchesFilters(lpMentioningCd, { format: "CD" }), false);
});

test("filters keep uncertain rows and do not fill nulls", () => {
  const uncertain = rows.filter((row) => row.confidence === "uncertain");
  assert.equal(uncertain.length, 74);
  assert.equal(selectRows(rows, {}).length, 161);
  assert.equal(selectRows(rows, { query: "   " }).length, 161);

  const chailly = find((row) => row.performers === "Riccardo Chailly");
  assert.equal(chailly.title, null);
  assert.equal(chailly.artist_or_composer, null);
  assert.equal(matchesFilters(chailly, { query: "chailly" }), true);
  assert.equal(matchesFilters(chailly, { query: "japanese spine" }), false);

  const noteOnly = "Japanese spine. Katakana reads as a duet of Archie Shepp and Dollar Brand; Latin title not printed";
  const fromNotes = find((row) => row.notes === noteOnly);
  assert.equal(matchesFilters(fromNotes, { query: "Archie Shepp" }), false);
  assert.equal(matchesFilters(fromNotes, { query: "japanese" }), false);

  const mozart = selectRows(rows, { composer: "Mozart" });
  const fullMozart = selectRows(rows, { composer: "Wolfgang Amadeus Mozart" });
  assert.ok(mozart.length > 0);
  assert.ok(fullMozart.length > 0);
  assert.equal(mozart.some((row) => row.artist_or_composer === "Wolfgang Amadeus Mozart"), false);

  const dg = selectRows(rows, { label: "Deutsche Grammophon" });
  assert.ok(dg.length > 0);
  assert.ok(dg.every((row) => row.label === "Deutsche Grammophon"));

  const snapshot = structuredClone(rows);
  selectRows(rows, { query: "beethoven", composer: "Beethoven", label: "EMI", format: "CD" });
  assert.deepEqual(rows, snapshot);
});

test("search folds case and diacritics across artist, title, and performers", () => {
  assert.ok(selectRows(rows, { query: "dvorak" }).some((row) => row.artist_or_composer === "Dvořák"));
  assert.ok(selectRows(rows, { query: "FIGARO" }).some((row) => row.title === "Le nozze di Figaro"));
  assert.equal(selectRows(rows, { query: "no such recording xyz" }).length, 0);
});
