# QBC admin: kako se dodaje projekat

Admin stranica je na `https://www.qbc.rs/admin/`.

## Prvo prijavljivanje (jednom)

1. Na GitHub-u napravi token: Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.
2. Repository access: samo `QBCARCH/qbc`. Permissions, Repository permissions, **Contents: Read and write**.
3. Kopiraj token (počinje sa `github_pat_`), otvori `/admin/`, nalepi ga i klikni Prijavi se. Kvačica "Zapamti na ovom uređaju" čuva token samo u tvom pregledaču.

Token je lozinka za admin. Ko nema token, ne može ništa da promeni na sajtu.

## Novi projekat

1. Klikni **Novi projekat**.
2. Upiši naslov i godinu (format naslova: "Villa Duo, Divcibare", naziv pa lokacija posle zareza). Po želji upiši lokaciju, površinu, status i autora slika ili rendera; prazna polja se ne prikazuju. Štikliraj usluge i upiši opis (prazan red razdvaja pasuse).
3. Dodaj naslovnu sliku (obavezna), po želji glavnu sliku (fullscreen na vrhu stranice projekta) i galeriju (više slika odjednom, prevlačenjem menjaš redosled).
4. Klikni **Objavi na sajt**. Za oko minut do dva sajt je ažuran.

Na velikim verzijama slika (od 2000 px) i na kopiji za pregled preko celog ekrana admin automatski dodaje znak QBCARCHITECTS u donjem desnom uglu; manje verzije na sajtu ostaju čiste. Za stare slike to je jednom urađeno alatom `tools/watermark.html` (pokreće se sa `node tools/watermark-server.js`); slika sa znakom ima oznaku `wm: true` i ne obrađuje se ponovo.

Slike se automatski pretvaraju u WebP i smanjuju u više veličina (500 do 3200 px), tako da sajt ostaje brz. Za deljenje na mrežama (LinkedIn, Facebook, WhatsApp) pravi se i jedna JPEG kopija.

Ako je slika uža od 2400 px, admin te upozori: preko celog ekrana takva slika deluje mekano. Ako istu sliku dodaš dvaput, admin je preskoči.

## Slike na početnoj

Velika slika na vrhu bira se pri objavi, ne u pregledaču, pa se stranica otvara brže. Prvih 21 dan posle dodavanja, na vrhu je naslovna slika novog projekta. Posle toga je na vrhu podrazumevani projekat (`hero_slug`, sada Villa Dve Koračice). Promena važi od sledeće objave: ako 21 dan istekne, a ništa novo nije objavljeno, klikni **Objavi na sajt** bez izmena.

Za oštru sliku preko celog ekrana naslovna slika treba da bude široka bar 2400 px.

Pri prvom otvaranju sajta u poseti preko naslovne slike se olovkom iscrta skica zgrade, pa se pretopi u sliku (oko 7 s; skrol, klik ili taster odmah prikazuju sliku). Admin skicu pravi sam za svaku novu horizontalnu sliku široku bar 1200 px (`<slika>-sketch.json`, polje `sketch`). Za stare slike to je jednom urađeno alatom `tools/sketch.html` (uz `node tools/watermark-server.js`). Slika bez skice prikazuje se odmah, bez efekta.

## Redosled i brisanje

Na listi projekata dugmad **Gore / Dole** menjaju redosled na sajtu (prva 4 su na početnoj), **Obriši** uklanja projekat i njegove slike. Izmene se objavljuju dugmetom na dnu ekrana.

## Kako ovo radi

- Svi projekti su u `data/projects.json` (`hero_slug` je podrazumevana slika na početnoj, `promo_days` koliko dana novi projekat ima prednost).
- `tools/build-core.js` iz projekata i šablona pravi `index.html`, `our-work.html` i `work/<projekat>.html`. Isti kod radi u admin stranici i lokalno (`node tools/build.js`, koji gradi i ostale stranice).
- Šabloni su u `src/`: delovi koji se ponavljaju (zaglavlje, meni, podnožje) u `src/partials/`, stranice u `src/pages/`, usluge u `src/services.json`. Tekstove o nama, uslugama, kontaktu i privatnosti menjaš u `src/pages/`, pa pokreneš `node tools/build.js`.
- Izgled je u `css/site.css`, ponašanje i animacije (parallax, otkrivanje, kursor, tranzicije, lightbox) u `js/site.js`. Nema spoljnih biblioteka.
- Svaka objava je jedan commit na grani `main`, pa se svaka izmena može vratiti na GitHub-u.
- Stranice traže `css/site.css?v=...` i `js/site.js?v=...`, gde je `v` otisak sadržaja tih fajlova. Posle izmene CSS-a ili JS-a pokreni `node tools/build.js`, da se verzija promeni i da pregledači odmah uzmu nov fajl umesto zapamćenog.
