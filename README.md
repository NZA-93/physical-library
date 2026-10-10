# Physical library

Nicolò Zamariola’s music shelves. The catalogue is [`docs/library.json`](docs/library.json) and is not edited here. Empty fields stay empty.

A cover is shown only when `cover_url` is present. Otherwise the entry keeps a plain placeholder. MusicBrainz, Discogs, and review links are rendered only from the flat fields on the row.

The site in `docs/` is static. Search, the artist and album shelves, and the composer, label, and format filters run in the browser. A box set stays a box set. CD and LP filters also include a box when its notes say which it is. Uncertain rows stay on the shelf and are marked.

GitHub Pages serves that folder at <https://nza-93.github.io/physical-library/>. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes `docs/` on every push to `main`.

To read it locally:

```sh
python3 -m http.server -d docs 8000
```
