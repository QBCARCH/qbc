# QBC admin: kako se dodaje projekat

Admin stranica je na `https://www.qbc.rs/admin/` (nakon što se ova izmena objavi na glavnoj grani).

## Prvo prijavljivanje (jednom)

1. Na GitHub-u napravi token: Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
2. Repository access: samo `QBCARCH/qbc`. Permissions, Repository permissions, **Contents: Read and write**.
3. Kopiraj token (počinje sa `github_pat_`), otvori `/admin/`, nalepi ga i klikni Prijavi se. Kvačica "Zapamti na ovom uređaju" čuva token samo u tvom pregledaču.

Token je lozinka za admin. Ko nema token, ne može ništa da promeni na sajtu.

## Novi projekat

1. Klikni **Novi projekat**.
2. Upiši naslov i godinu, štikliraj usluge, upiši opis (prazan red razdvaja pasuse).
3. Dodaj naslovnu sliku (obavezna), po želji glavnu i malu sliku, i galeriju (više slika odjednom, prevlačenjem menjaš redosled).
4. Klikni **Objavi na sajt**. Za oko minut do dva sajt je ažuran.

Slike se automatski smanjuju u više veličina (500, 800, 1080, 1600, 2000, 2600, 3200 px), isto kao u Webflow-u, tako da sajt ostaje brz.

## Redosled i brisanje

Na listi projekata dugmad **Gore / Dole** menjaju redosled na sajtu (prva 4 su na početnoj), **Obriši** uklanja projekat i njegove slike. Izmene se objavljuju dugmetom na dnu ekrana.

## Kako ovo radi

- Svi projekti su u `data/projects.json`.
- `tools/build-core.js` iz njih pravi `work/<projekat>.html`, listu na `our-work.html` i listu na `index.html`. Isti kod radi u admin stranici i lokalno (`node tools/build.js`).
- Šablon stranice projekta je `tools/templates/work.html`. Liste na `index.html` i `our-work.html` su između oznaka `QBC:LIST:START` i `QBC:LIST:END`, ne briši ih.
- Efekti (otkrivanje slika pri skrolu, parallax, lightbox za galeriju, indikator skrola) su u `css/qbc-fx.css` i `js/qbc-fx.js`.
- Svaka objava je jedan commit na grani `main`, pa se svaka izmena može vratiti na GitHub-u.
