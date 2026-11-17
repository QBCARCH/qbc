# QBC Architects, sajt www.qbc.rs

Statičan sajt arhitektonskog studija (Beograd), bez biblioteka, dva jezika (EN u korenu, SR u `/sr/`).
Hosting: GitHub Pages, repo `QBCARCH/qbc`, grana `main` ide uživo za 1 do 2 minuta posle merge-a.
Vlasnik: Slavoljub Ljubić. Piši mu kratko i jasno, na srpskom; on nije programer.

## Zlatno pravilo: HTML u korenu je generisan

Nikad ne menjaj ručno `index.html`, `about.html`, `sr/*.html`, `work/*.html`, `sitemap.xml`. Oni nastaju iz:

- `src/pages/*.html` i `src/pages/sr/*.html` (stranice), `src/partials/` (head, nav, footer; SR verzije u `src/partials/sr/`)
- `src/services.json`, `src/services.sr.json`, `src/faq.json` (usluge, pitanja)
- `data/projects.json` (svi projekti; menja ga admin stranica)
- `tools/build-core.js` (generator) i `tools/build.js` (lokalno pokretanje)

Posle svake izmene u `src/`, `data/` ili `tools/`: `node tools/build.js`, pa `npm run check` (build `--check` mora da kaže „sve je vec aktuelno“, sintaksa JS-a, ispravan JSON).
Generisani fajlovi se komituju zajedno sa izvorima (Pages ih služi direktno).

`tools/build-core.js` radi i u pregledaču (admin ga uvozi), zato u njemu nema Node modula, `fs`, `path` ni ničeg van čistog JS-a.

## Kako se radi izmena

1. Nova grana sa `main` (ime na srpskom bez dijakritika, npr. `fix/telefon`, `feature/tamni-rezim`).
2. Izmena u `src/`, `css/site.css`, `js/site.js`, `tools/`, `admin/`. Build. `node --check js/site.js admin/admin-lib.js`.
3. Lokalni pregled: `python3 -m http.server 8123` iz korena, pa `http://localhost:8123/`. Proveri EN i SR, telefon (375 px) i desktop, konzolu bez novih grešaka.
4. Commit sa porukom na srpskom (prvi red: šta se vidi na sajtu; ispod: kratko zašto i gde).
5. **Push i merge radi vlasnik u GitHub Desktop-u** (u terminalu nema GitHub pristupa, `git push` pada sa „could not read Username“). Otvori mu ga: `open -a "GitHub Desktop" /Users/slavoljubic/Documents/GitHub/qbc`, zamoli ga da klikne *Publish branch*, napravi PR i merge-uje. Posle toga proveri uživo: `curl -s https://www.qbc.rs/... | grep ...` (dodaj `?x=$RANDOM` protiv keša), i tek onda javi da je objavljeno. „Done“ od vlasnika nije dokaz; `git ls-remote origin` jeste.

Poznato bezopasno: konzola javlja `InvalidStateError: Transition was aborted ... Page already revealed` (view transitions). Ne traži popravku.

## Raspored koda

- `css/site.css`: jedan fajl, numerisani delovi (1 tokeni, 2 osnova, 3 tipografija, 4 pomoćne klase, 5 okvir, 6 početna, 7 projekti, 8 o nama, 9 usluge, 10 kontakt, 11 upit, 12 lightbox, 13 responsive, 14 smanjeno kretanje). Svako pravilo na jednom mestu; sve za uske ekrane u delu 13; sve za `prefers-reduced-motion` u delu 14. Fontovi: Geist, Geist Mono, Instrument Serif (kurziv, klasa `.it` za nazive mesta i pojedine reči); svi u `fonts/`, bez spoljnih servisa.
- `js/site.js`: jedan IIFE, funkcije `init*` koje `boot()` poziva redom. Sve preko `data-*` atributa, bez biblioteka. Sve animacije poštuju `reduce`. Novu funkciju dodaj u `boot()` i opiši u komentaru iznad nje čemu služi.
- Verzija u adresi: build upisuje `css/site.css?v=<otisak>` i `js/site.js?v=<otisak>` u sve stranice (FNV-1a sadržaja), zato posle izmene CSS/JS build menja ~37 fajlova. To je normalno.
- Komentari u kodu: srpski, bez dijakritika (kao postojeći). Tekst na sajtu: EN i SR sa dijakritikama.

## Početna (B1, B2, uvedeno novembra 2026)

- Naslovna slika se bira pri svakom otvaranju malom skriptom `HERO_JS` iz `build-core.js` (nikad ista zaredom, nov projekat prvih `promo_days` dana češće). Uz sliku ide skica (`images/<ime>-sketch.json`, pravi je `admin/sketch-lib.js`).
- `.hero` je staza od 220svh kad ima skicu (`is-sketch`): skrol docrtava olovku (`initSketch`), od 58% se pojavljuje slika, merač „Skica / Model / Render“. Bez skice ili uz smanjeno kretanje: obična slika preko ekrana.
- `.reel`: traka sa prvih `home_count` (6) projekata koja klizi bočno dok se stranica spušta (`initReel`, `worksReel` u build-core). Brojke 150+/80+/20+ su ispod teksta o studiju (`.proof--quiet`).
- Ton zaglavlja (`on-dark`, belo preko tamnog) računa `initNav` nad `.hero, .phero, .reel, .inq, .pgal--dark`; naslovna sa skicom je svetla dok nema `is-render`.

## Stranica projekta

- `src/pages/work.html` je šablon; `gallery()` u build-core pravi `<figure data-full>` za lightbox.
- Osnova iza rendera (B3): slika u galeriji može imati `plan` (objekat slike) i `plan_label`. Tada figure dobija klasu `pfig`: miš otkriva crtež kao brisanje, dodir prebacuje, dugmad Render / naziv / ⤢. U lightbox-u je osnova svoj kadar (`initGallery`). U adminu: dugme „+ osnova“ na svakoj slici galerije; crtež se obrađuje bez znaka i skice (`processImage(file, { plain: true })`).
- Tamna galerija: `p.dark = true` daje `.pgal--dark`.

## Slike i podaci

- `data/projects.json`: `{version, home_count, last_work_count, hero_slug, promo_days, projects: [...]}`. Projekat: `slug, title ("Naziv, Mesto"), year, services[], description (HTML), type, location, area, status, credit, added, dark, cover, thumb, hero, gallery[]`; srpski prevodi su u objektu `sr` sa istim ključevima (`p.sr.description`, `p.sr.type`...; `tr(p, k, lang)` u build-core). Slika: `{file, widths[], w, h, og, full, wm, sketch?}`; slika galerije uz to može imati `plan` (ista struktura) i `plan_label`.
- Format fajla je `JSON.stringify(data, null, 1)` (uvlačenje JEDAN razmak, bez `\u` eskejpa). Kad ga menjaš skriptom, zadrži to, inače diff ima hiljade linija. Najsigurnije: tekstualna zamena, pa `json.load` kao provera.
- `images/`: `<hex>_<ime>.webp` original, `-p-<širina>.webp` za širine iz `widths`, `-og.jpg` za mreže, `-full.webp` sa znakom za ceo ekran, `-sketch.json`. `widths` u JSON-u mora da odgovara fajlovima koji postoje. Admin pravi sve to u pregledaču (`admin/admin-lib.js`, `processImage`). Ručno dodavanje: `sips` radi za JPEG/PNG (`sips -Z 1080 in --out out`), WebP ne; JPEG je u redu, `img()` ne zavisi od ekstenzije.
- `assets/`: slike van projekata (logo, meni, About, osnivači). Bez stock fotografija; About koristi render Villa Duo.
- Ne dodavaj `.DS_Store` (u `.gitignore`); `images/` ima ~150 MB, ne kopiraj ga bez potrebe.

## Činjenice koje se ne pogađaju

- Telefon: **+381 63 411 066** (`tel:+38163411066`, `wa.me/38163411066`). E-pošta: office@qbc.rs. Forma šalje preko FormSubmit alias-a (vidi `src/pages/contact.html`), bez CAPTCHA, sa honeypot poljem.
- Studio osnovan 2010. Brojke na početnoj: 150+ projekata, 80+ klijenata, 20+ godina iskustva (iskustvo osnivača, ne studija).
- Jezici: EN u korenu, SR u `/sr/`, hreflang i canonical pravi build; sitemap i robots takođe.
- Admin je na `/admin/` i piše direktno u `main` preko GitHub tokena vlasnika (`admin/UPUTSTVO.md`). Posle izmena u build-core proveri da admin i dalje radi: otvori `/admin/` lokalno, učitaj projekat, klikni „Objavi“ samo ako vlasnik to traži.

## Šta je dogovoreno, a nije urađeno (predlog „2027“, novembar 2026)

- B3 radi, ali ima samo jedan primer (Villa BC 3721, prizemlje isečeno iz kompozicije). Vlasnik treba da izveze osnove iz Revita (PNG/PDF kao slika, bela podloga, bez zaglavlja, ≥2000 px) i doda ih u adminu, bar po jednu za prvu sliku svakog projekta.
- B5 je urađen (tamni režim po sistemu, zrnasta tekstura `body::after`); nema prekidača na sajtu, prati samo sistem.
- Naziv osnove (`plan_label`) je jedno polje, isti tekst na EN i SR; ako zatreba prevod, dodati `plan_label_sr` u admin i `gallery()`.
- B6: prelaz slike projekta u hero sledeće stranice (`view-transition-name` po slici), kursor „View“ nad karticama, pregled slike u Index prikazu.
- Sadržaj od vlasnika: fotografije sa gradilišta i kratak film po projektu; admin za to još nema polja.
- Pre svake nove faze: napravi mockup kao Artifact, pa tek posle odobrenja menjaj sajt. Vlasnik tako radi.
