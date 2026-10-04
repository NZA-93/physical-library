import {
  formatMarks,
  groupByArtist,
  isUncertain,
  selectRows,
  sortByAlbum,
  uniqueSorted,
} from "./catalogue.js";

const BLANK_ARTIST = "No artist or composer";

const state = {
  view: "artist",
  query: "",
  composer: "",
  label: "",
  format: "",
};

const browse = document.querySelector("#browse");
const count = document.querySelector("#count");
const composerSelect = document.querySelector("#composer");
const labelSelect = document.querySelector("#label");
const searchInput = document.querySelector("#q");

let catalogue = [];

function textLine(className, value) {
  if (typeof value !== "string" || value === "") return null;
  const node = document.createElement("p");
  node.className = className;
  node.textContent = value;
  return node;
}

function discLine(countValue) {
  if (typeof countValue !== "number") return null;
  const node = document.createElement("p");
  node.className = "discs";
  node.textContent = countValue === 1 ? "1 disc" : `${countValue} discs`;
  return node;
}

function imprintLine(row) {
  const parts = [];
  if (typeof row.label === "string" && row.label) parts.push(row.label);
  if (typeof row.catalogue_number === "string" && row.catalogue_number) parts.push(row.catalogue_number);
  return textLine("imprint", parts.join(" · "));
}

function formatLine(row) {
  const marks = formatMarks(row);
  if (!marks.box && !marks.carrier) return null;
  const node = document.createElement("p");
  node.className = "format";
  if (marks.box) {
    const box = document.createElement("span");
    box.className = "box";
    box.textContent = "Box set";
    node.append(box);
  }
  if (marks.carrier) {
    const carrier = document.createElement("span");
    carrier.className = "carrier";
    carrier.textContent = marks.carrier;
    node.append(carrier);
  }
  return node;
}

function recordingArticle(entry, view) {
  const { row, index } = entry;
  const article = document.createElement("article");
  article.className = "recording";
  article.id = `r-${index}`;
  article.dataset.index = String(index);

  const head = document.createElement("div");
  head.className = "recording-head";
  const titleBlock = document.createElement("div");
  titleBlock.className = "title-block";

  if (typeof row.title === "string" && row.title) {
    const title = document.createElement("h3");
    title.className = "title";
    title.textContent = row.title;
    titleBlock.append(title);
  }

  if (view === "album") {
    const artist = textLine("artist", row.artist_or_composer);
    if (artist) titleBlock.append(artist);
  }

  if (isUncertain(row)) {
    const mark = document.createElement("p");
    mark.className = "uncertain";
    mark.textContent = "Uncertain";
    titleBlock.append(mark);
  }

  head.append(titleBlock);
  const format = formatLine(row);
  if (format) head.append(format);
  article.append(head);

  const performers = textLine("performers", row.performers);
  if (performers) article.append(performers);
  const imprint = imprintLine(row);
  if (imprint) article.append(imprint);
  const discs = discLine(row.disc_count);
  if (discs) article.append(discs);
  const notes = textLine("notes", row.notes);
  if (notes) article.append(notes);

  return article;
}

function fillSelect(select, values, allLabel) {
  const current = select.value;
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = allLabel;
  select.append(all);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  if ([...select.options].some((option) => option.value === current)) {
    select.value = current;
  }
}

function filtersFromState() {
  return {
    query: state.query,
    composer: state.composer,
    label: state.label,
    format: state.format,
  };
}

function render() {
  const entries = selectRows(catalogue, filtersFromState()).map((row) => ({
    row,
    index: catalogue.indexOf(row),
  }));

  const noun = entries.length === 1 ? "recording" : "recordings";
  count.textContent = `${entries.length} ${noun}`;

  browse.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nothing on the shelf matches.";
    browse.append(empty);
    return;
  }

  if (state.view === "artist") {
    const groups = groupByArtist(entries);
    const index = document.createElement("nav");
    index.className = "artist-index";
    index.setAttribute("aria-label", "Artists");
    const list = document.createElement("ol");
    groups.forEach((group, groupIndex) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#g-${groupIndex}`;
      const blank = group.artist == null;
      link.textContent = blank ? BLANK_ARTIST : group.artist;
      if (blank) link.className = "is-blank";
      item.append(link);
      list.append(item);
    });
    index.append(list);
    browse.append(index);

    const shelf = document.createElement("div");
    shelf.className = "groups";
    groups.forEach((group, groupIndex) => {
      const section = document.createElement("section");
      section.className = "artist-group";
      section.id = `g-${groupIndex}`;
      const heading = document.createElement("h2");
      const blank = group.artist == null;
      heading.textContent = blank ? BLANK_ARTIST : group.artist;
      if (blank) heading.className = "is-blank";
      section.append(heading);
      for (const entry of group.entries) section.append(recordingArticle(entry, "artist"));
      shelf.append(section);
    });
    browse.append(shelf);
    return;
  }

  const shelf = document.createElement("div");
  shelf.className = "albums";
  for (const entry of sortByAlbum(entries)) shelf.append(recordingArticle(entry, "album"));
  browse.append(shelf);
}

function setView(view) {
  state.view = view;
  for (const button of document.querySelectorAll(".views button")) {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  }
  render();
}

function bind() {
  document.querySelector("#toolbar").addEventListener("submit", (event) => {
    event.preventDefault();
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    render();
  });

  composerSelect.addEventListener("change", () => {
    state.composer = composerSelect.value;
    render();
  });

  labelSelect.addEventListener("change", () => {
    state.label = labelSelect.value;
    render();
  });

  for (const input of document.querySelectorAll('input[name="format"]')) {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.format = input.value;
        render();
      }
    });
  }

  for (const button of document.querySelectorAll(".views button")) {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
      browse.scrollIntoView({ block: "start" });
    });
  }
}

async function init() {
  const response = await fetch(new URL("./library.json", import.meta.url));
  if (!response.ok) throw new Error("The catalogue file did not load.");
  const data = await response.json();
  if (!Array.isArray(data.rows)) throw new Error("The catalogue has no rows.");
  catalogue = data.rows;
  fillSelect(composerSelect, uniqueSorted(catalogue, "artist_or_composer"), "All");
  fillSelect(labelSelect, uniqueSorted(catalogue, "label"), "All");
  bind();
  render();

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) target.scrollIntoView();
  }
}

init().catch((error) => {
  const message = document.createElement("p");
  message.className = "empty";
  message.textContent = error instanceof Error ? error.message : "The catalogue did not load.";
  browse.replaceChildren(message);
});
