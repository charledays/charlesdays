/**
 * stories.js — CharlesDays.art Wall content model
 *
 * This file is NOT wired to wall-final-test.html or index.html yet.
 * It exists to establish the real content architecture ahead of building
 * the Wall from data instead of hand-authored HTML. See CONTENT_PENDING.md
 * for a plain-language summary of everything still missing.
 *
 * Shape of one entry:
 *   {
 *     id,                // required, always — internal-only, never shown to the visitor
 *     slug,               // only exists for a real standalone /projects/[slug] story
 *     title,              // a real title only — null when a piece is untitled; never invented
 *     year,
 *     discipline,         // array, e.g. ["tattoo"], ["art-direction"]
 *     disciplineLabel,    // presentation metadata: "ART DIRECTION" | "TATTOO" | "FILM" | "MANIFIESTO"
 *     project,            // the larger universe when relevant, e.g. "Vida Bandida" — independent of slug/title
 *     series,             // Film-only, optional: editorial group within Film —
 *                         // "lost-frames" | "vidabandida" | "days-off". Not used
 *                         // by other disciplines. See "Film content model" below.
 *     destinationType,    // "project" | "discipline" | "manifiesto"
 *     destinationUrl,
 *
 *     cover: { src, alt },
 *     supportingImages: [ { src, alt, caption } ],
 *
 *     role,                // array
 *     credits,             // array of { role, name, url } — only populated entries render
 *
 *     context,
 *     location,
 *
 *     wall: { include, order, tileSize, fit, position, image },
 *     // `wall.image` is optional: { src, alt }, only set when the Wall must
 *     // show a different still than `cover` for the same story (e.g. the
 *     // canonical Film/discipline cover doesn't suit the Wall composition).
 *     // Absent by default — the Wall falls back to `cover` when it's unset.
 *     // `cover` itself (read by film.html and any future discipline page)
 *     // is never touched by adding this.
 *
 *     externalLinks: [ { label, url, platform } ]
 *     // Media/action links to a piece's native published destination
 *     // (e.g. an Instagram Reel), separate from internal site navigation.
 *     // See "External media links" note below for the full principle.
 *   }
 *
 * Rules this file follows throughout:
 * - Unknown metadata is null / empty — never guessed (no invented authorship,
 *   year, artist, title, collaborators, or role).
 * - `fit`/`position` are presentation defaults matching the Wall's existing,
 *   frozen CSS (object-fit: cover, centered) — not content facts, so they're
 *   filled in consistently rather than left null.
 * - An asset that is confirmed to exist locally but hasn't been copied into
 *   /images yet is noted with a comment pointing at its current location.
 * - An asset that does NOT exist locally at all is `src: null`, flagged
 *   PENDING, and must be manually supplied — never substituted with an
 *   unrelated placeholder image.
 *
 * External media links (`externalLinks`):
 * - `destinationUrl` (internal navigation, e.g. "/tattoo", "/projects/x")
 *   and `externalLinks` (media/action links to a piece's native published
 *   format, e.g. an Instagram Reel) are separate concepts and must never
 *   be conflated.
 * - The website stays lightweight: stills/covers/context live here, while
 *   the finished video may remain hosted on Instagram (or another native
 *   platform) rather than being embedded/autoplayed on-site.
 * - Routing principle: the Wall never sends a visitor straight to an
 *   external link. Wall -> internal destination (a discipline page or a
 *   project page) -> `externalLinks` surfaced once inside that context
 *   (e.g. a "WATCH REEL ↗" CTA). This applies to Film in particular, and
 *   to any other entry with a real external destination (e.g. VIDABANDIDA
 *   TRACKS).
 * - `externalLinks: []` when no confirmed URL exists yet — never invent a
 *   URL. Absence is noted as pending metadata (see CONTENT_PENDING.md),
 *   not filled with a placeholder link.
 *
 * Film content model:
 * - Film entries are ordinary `stories` entries (same array, same shape —
 *   no second/parallel schema) with `discipline: ["film"]`. The `/film`
 *   page reads this same `stories` array and filters by discipline, exactly
 *   like any other discipline page would.
 * - `series` (Film-only) groups entries into the three permanent editorial
 *   sections on `/film`: "lost-frames" | "vidabandida" | "days-off".
 * - `cover` holds the selected FILM STILL used on the website — never the
 *   Instagram Reel cover graphic. Instagram keeps its own designed cover;
 *   charlesdays.art shows the photograph/frame.
 * - No Film entries exist in `stories` below until real stills + confirmed
 *   metadata are approved one at a time (see CONTENT_PENDING.md "Film" and
 *   `PENDING_CONTENT.film` below for referenced-but-unapproved subjects).
 *
 * Shape once a Film entry is approved:
 *   {
 *     id: "...",
 *     slug: null,               // no /projects/[slug] for a discipline-routed Film piece
 *     title: null,              // real subject/project name only — never "Lost Frames 01" etc.
 *     year: null,
 *     discipline: ["film"],
 *     disciplineLabel: "FILM",
 *     series: "lost-frames",    // | "vidabandida" | "days-off"
 *     destinationType: "discipline",
 *     destinationUrl: "/film/",
 *     cover: { src: "...", alt: null },
 *     role: [...],
 *     credits: [],
 *     context: null,
 *     externalLinks: [
 *       { label: "WATCH REEL", url: "...", platform: "instagram" }
 *       // only when a real, confirmed URL exists — otherwise []
 *     ]
 *   }
 */

export const stories = [

  // ==========================================================================
  // CONFIRMED — VIDABANDIDA TRACKS
  // Standalone story within the broader Vida Bandida universe (ongoing music
  // series — ARTISTS × their musical influences). Cover/detail-01 document
  // an earlier episode (Karem Ro); the five new images below document a
  // separate, later episode shoot at the same recurring location — no
  // individual-artist credits added for the people in either shoot beyond
  // what was already confirmed, per instruction.
  //
  // `year` is numeric (2026) to match the existing schema convention — the
  // series' "Ongoing" status has no equivalent field anywhere in this file
  // and is not force-fit into `year` as a string; see CONTENT_PENDING.md.
  //
  // `location` corrected from "La Fvbrikv" to "Fvbrikv" — the physical
  // signage visible in detail-02 (IMG_0187.JPG) reads "FVBRIKV", no article.
  //
  // `role` updated from ["Photography", "Direction"] to Charles' confirmed
  // project-level role, ["Creative Direction", "Art Direction"] — Camera for
  // this episode is a separate person, credited below.
  //
  // Asset provenance (copies, originals left in place — see CONTENT_PENDING.md
  // history / chat log for identification notes):
  //   cover.jpg      <- wall-images/6065eab8-d6b0-4da5-b32b-75004cb6da04.jpg
  //   detail-01.jpg  <- F2915C86-B9A0-4004-AE8F-006B7B6C3E48.jpg
  //   detail-02.jpg  <- CHARLESDAYS_INBOX/IMG_0187.JPG (copied as-is, already
  //     web-sized — no RAW conversion needed)
  //   detail-03.jpg  <- CHARLESDAYS_INBOX/DSC_0104.NEF
  //   detail-04.jpg  <- CHARLESDAYS_INBOX/DSC_0103.NEF
  //   detail-05.jpg  <- CHARLESDAYS_INBOX/DSC_0091.NEF
  //   detail-06.jpg  <- CHARLESDAYS_INBOX/DSC_0092.NEF
  //     (all four .NEF masters converted via `sips`: proportional resize to
  //     2400px on the long edge, JPEG quality 85 — format/optimization only,
  //     no crop/color-grade/sharpen/AI enhancement; original .NEF masters
  //     left untouched in CHARLESDAYS_INBOX/)
  //
  // SEO title/meta description approved and ready for when /projects/
  // vida-bandida-tracks is built (no SEO field exists in this schema and no
  // project-detail page exists yet to consume it — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "vida-bandida-tracks",
    slug: "vida-bandida-tracks",
    title: "VIDABANDIDA TRACKS",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: "Vida Bandida",
    destinationType: "project",
    destinationUrl: "/projects/vida-bandida-tracks/",
    cover: {
      src: "/images/stories/vida-bandida-tracks/cover.jpg",
      alt: "Karem Ro, retrato — VIDABANDIDA TRACKS"
    },
    supportingImages: [
      {
        src: "/images/stories/vida-bandida-tracks/detail-01.jpg",
        alt: "Karem Ro preparándose para la sesión, detalle",
        caption: "Karem Ro preparándose para su sesión de VIDABANDIDA TRACKS."
      },
      {
        src: "/images/stories/vida-bandida-tracks/detail-02.jpg",
        alt: "Tres personas durante una sesión de VIDABANDIDA TRACKS en un espacio industrial: una persona sentada elige música en su teléfono mientras otra la asiste, y una tercera graba con un teléfono montado en estabilizador",
        caption: null
      },
      {
        src: "/images/stories/vida-bandida-tracks/detail-03.jpg",
        alt: "Retrato de una persona con gorro Kangol y camiseta VIDABANDIDA, mirando directo a cámara",
        caption: null
      },
      {
        src: "/images/stories/vida-bandida-tracks/detail-04.jpg",
        alt: "La misma persona ajustándose el gorro con ambas manos, fotografía con desenfoque de movimiento",
        caption: null
      },
      {
        src: "/images/stories/vida-bandida-tracks/detail-05.jpg",
        alt: "Retrato de una persona con gorro bucket, camiseta blanca y cadena dorada, sonriendo con las manos cruzadas",
        caption: null
      },
      {
        src: "/images/stories/vida-bandida-tracks/detail-06.jpg",
        alt: "La misma persona haciendo un gesto con los dedos hacia la cámara, fotografía con desenfoque de movimiento",
        caption: null
      }
    ],
    role: ["Creative Direction", "Art Direction"],
    credits: [
      { role: "Camera", name: "Fabrizio Díaz", url: null }
    ],
    context: "VIDABANDIDA TRACKS nace como una forma de conocer a distintos artistas a través de la música que los acompaña.\n\nInvitamos a artistas de diferentes disciplinas y géneros a compartir sus influencias musicales, la música con la que crecieron y aquello que los inspira a crear.\n\nCada entrega abre una pequeña ventana a su universo musical bajo un formato de reels y el sello de VIDABANDIDA.",
    location: "Fvbrikv",
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [] // PENDING — Instagram Reel URL not yet confirmed, see CONTENT_PENDING.md
  },

  // ==========================================================================
  // CONFIRMED — INTERNAZIONALE (album, Roc One & Zecobeats)
  // Migrated from the earlier "album-blue-broken-heads" placeholder — same
  // project, now confirmed. Former id/slug "album-blue-broken-heads" is
  // retired; only this entry represents it. The former placeholder assets
  // at /images/stories/album-blue-broken-heads/ (cover.jpg, back-cover.jpg,
  // framed-artwork.jpg) are superseded and no longer referenced anywhere —
  // left in place on disk, not deleted, per project convention.
  //
  // Portfolio role is now "Art & Visual Resources" (Charles' current
  // confirmed wording, replacing the earlier two-item ["Art Direction",
  // "Visual Resources"]) — distinct from the printed back-cover credit
  // "ARTE GRÁFICO, ITEMS & RECURSOS: CHARLES DAYS", which is not rewritten
  // or treated as identical. Zecobeats (Artist) and Andresito Schweinsteiger
  // (Photography) are newly confirmed and added to `credits` alongside the
  // existing Roc One / Bélica entries; the rest of the printed credits
  // block (Garaje Studio, Orlando Pestano, Ariagna Belisario, sound
  // curation names, etc.) is still NOT ingested — see CONTENT_PENDING.md.
  //
  // Context: Roc One described this album as born from the Venezuelan
  // experience of displacement/hardship, with music as catharsis and a
  // point of encounter. The full personal Instagram caption is Roc's own
  // and is not reproduced here — only the approved, condensed website copy
  // below is used, and it is written as Charles' own account of his
  // contribution, not as Charles narrating Roc's personal story.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/internazionale/cover.jpg    <- CHARLESDAYS_INBOX/cc6de2a2-a4af-4d69-b9fd-8c1fd7558e23.jpg
  //   images/stories/internazionale/detail-01.jpg <- CHARLESDAYS_INBOX/15276514-563c-4e8a-87cc-97d55de55f71.jpg
  //   images/stories/internazionale/detail-02.jpg <- CHARLESDAYS_INBOX/28431a6a-9d6b-4761-9ac1-02dc9919de90.jpg
  //   images/stories/internazionale/detail-03.png <- CHARLESDAYS_INBOX/1165f70b-3763-4aff-9a9f-74e6050d8b73.png
  //   images/stories/internazionale/detail-04.jpg <- CHARLESDAYS_INBOX/IMG_0123.JPG
  //     (documentary photo — outdoors with the broken classical-style item)
  //   images/stories/internazionale/detail-05.png <- CHARLESDAYS_INBOX/IMG_0325.PNG
  //     (raw black/blue handwritten graphic-resource composition)
  //   images/stories/internazionale/detail-06.png <- CHARLESDAYS_INBOX/IMG_0339.PNG
  //     (developed/layered blue-gray graphic composition)
  //   images/stories/internazionale/detail-07.png <- CHARLESDAYS_INBOX/IMG_0429.PNG
  //     (final portrait/composite application)
  //   All four copied as-is — no crop/recolor/retouch/AI-enhancement; no
  //   format conversion was technically required for web use.
  //
  // SEO title/meta description approved and ready for when /projects/
  // internazionale is built (no SEO field exists in this schema and no
  // project-detail page exists yet — see CONTENT_PENDING.md).
  //
  // Not the same entry as the Film/DAYS OFF story "internazionale-statement"
  // — that is a separate, unrelated Film piece. Do not merge or confuse them.
  // ==========================================================================
  {
    id: "internazionale",
    slug: "internazionale",
    title: "INTERNAZIONALE",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/internazionale/",
    cover: {
      src: "/images/stories/internazionale/cover.jpg",
      alt: "Portada del álbum INTERNAZIONALE — cabezas clásicas fragmentadas, superficies metálicas doradas, fondo azul"
    },
    supportingImages: [
      {
        src: "/images/stories/internazionale/detail-01.jpg",
        alt: "Obra enmarcada de INTERNAZIONALE sobre una mesa, junto a libros y objetos",
        caption: null
      },
      {
        src: "/images/stories/internazionale/detail-02.jpg",
        alt: "Contraportada del álbum INTERNAZIONALE — lista de canciones y créditos",
        caption: "Back cover / tracklist"
      },
      {
        src: "/images/stories/internazionale/detail-03.png",
        alt: "Proceso — recursos visuales (cabezas clásicas fragmentadas) en iPad con Apple Pencil",
        caption: null
      },
      {
        src: "/images/stories/internazionale/detail-04.jpg",
        alt: "Dos personas en la calle, una de ellas sosteniendo frente a su rostro un busto clásico fragmentado en blanco y dorado",
        caption: null
      },
      {
        src: "/images/stories/internazionale/detail-05.png",
        alt: "Composición tipográfica manuscrita en negro y azul sobre fondo blanco, con nombres y referencias del álbum INTERNAZIONALE",
        caption: null
      },
      {
        src: "/images/stories/internazionale/detail-06.png",
        alt: "Composición gráfica en capas de azul y gris sobre la misma tipografía manuscrita, con formas pintadas más grandes",
        caption: null
      },
      {
        src: "/images/stories/internazionale/detail-07.png",
        alt: "Retrato compuesto de una persona sosteniendo el busto clásico fragmentado junto al rostro, con grandes trazos gráficos sobre la imagen",
        caption: null
      }
    ],
    role: ["Art & Visual Resources"],
    credits: [
      { role: "Artist", name: "Roc One", url: null },
      { role: "Artist", name: "Zecobeats", url: null },
      { role: "Graphic Design", name: "Bélica", url: null },
      { role: "Photography", name: "Andresito Schweinsteiger", url: null }
    ],
    context: "INTERNAZIONALE nace desde la música como catarsis, resistencia y punto de encuentro. Un proyecto de Roc One & Zecobeats construido alrededor de aquello que permanece incluso cuando todo lo demás cambia.\n\nPara el lanzamiento desarrollé el item y un sistema de recursos gráficos e ilustraciones que expanden visualmente el universo del álbum, trabajando junto a Bélica, responsable del diseño gráfico y la edición visual.",
    location: null, // PENDING
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      // AVIREX (id: "avirex", the album's opening track) already exists as
      // a LOST FRAMES entry in Film, but like every Film entry its
      // destinationUrl is just the generic "/film" — no slug, no anchor id,
      // no hash/query route in film.html to land on it specifically. No
      // stable internal destination exists yet, so the "WATCH AVIREX —
      // LOST FRAMES →" CTA is NOT added here — see CONTENT_PENDING.md.
      { label: "ESCUCHAR ÁLBUM COMPLETO", url: "https://www.youtube.com/watch?v=c15HK4ZP5o4&list=RDc15HK4ZP5o4&start_radio=1", platform: "youtube" }
    ]
  },

  // ==========================================================================
  // CONFIRMED — UFOLOGY (ALIEN HDZ)
  // Migrated from the earlier untitled/unconfirmed "Ufology" placeholder —
  // same project, now confirmed. Old images/stories/ufology/alternate-01.jpg
  // (identical source to detail-02.jpg below) is superseded and no longer
  // referenced — left in place on disk, not deleted, per project convention.
  //
  // `role` updated from ["Graphic Design", "Visual Resources"] to Charles'
  // confirmed wording, ["Art Direction", "Visual Art"]. Pre-existing credit
  // — Artist: ALIEN HDZ — is the only prior confirmed collaborator and is
  // preserved unchanged; no other credits existed to report.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/ufology/cover.jpg    <- CHARLESDAYS_INBOX/Ilustración_sin_título (1).jpg
  //   images/stories/ufology/detail-01.jpg <- CHARLESDAYS_INBOX/8B64C867-0DC7-4ADA-B636-7387857B1301.jpg
  //   images/stories/ufology/detail-02.jpg <- CHARLESDAYS_INBOX/Ilustración_sin_título (2).jpg
  //   images/stories/ufology/detail-03.jpg <- CHARLESDAYS_INBOX/IMG_2294.heic
  //     (format-converted HEIC -> JPEG for web compatibility only, via
  //     `sips`, same resolution/orientation, no crop/recolor/enhance;
  //     original .heic left untouched in CHARLESDAYS_INBOX/)
  //   (unchanged by this pass — no images added/removed/reordered)
  //
  // Note on detail-01.jpg: the canvas is signed "Money Maker" / "Charles
  // Days 2025" in the photo itself. Not a mismatch with the project's 2026
  // year: this is the original physical artwork Charles created in 2025,
  // later used as a visual resource for the 2026 UFOLOGY album project —
  // confirmed. Alt text below describes the visual (circular gold
  // calligraphic structure on a gray wall), not the "Money Maker" title,
  // since it documents the artwork's role as a UFOLOGY visual resource
  // rather than as a standalone "Money Maker" piece.
  //
  // Money Maker (2025) does NOT currently have its own standalone entry,
  // Shop listing, or any stable internal destination anywhere in this file
  // or the site (checked — no Shop exists yet per project architecture; no
  // "Money Maker" id/slug exists). No link/route was invented here — the
  // desired future UFOLOGY -> Money Maker connection is documented in
  // CONTENT_PENDING.md instead.
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project uses the canonical `cover` (no local override) at crop
  // `50% 50%`, kept in art-direction-cinematic-strips-prototype.html —
  // read and confirmed unchanged, not touched by this pass.
  //
  // SEO title/meta description approved and ready for when /projects/
  // ufology is built (no SEO field exists in this schema and no
  // project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "ufology",
    slug: "ufology",
    title: "UFOLOGY",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/ufology/",
    cover: {
      src: "/images/stories/ufology/cover.jpg",
      alt: "Portada UFOLOGY — estructura circular de caligrafía dorada sobre fondo oscuro"
    },
    supportingImages: [
      {
        src: "/images/stories/ufology/detail-01.jpg",
        alt: "Obra física terminada, estructura circular de caligrafía dorada, colgada en pared gris",
        caption: null
      },
      {
        src: "/images/stories/ufology/detail-02.jpg",
        alt: "Versión digital/cósmica de la estructura circular UFOLOGY, con textura de estrellas",
        caption: null
      },
      {
        src: "/images/stories/ufology/detail-03.jpg",
        alt: "Proceso — lienzo sobre mesa de trabajo, caligrafía dorada en desarrollo, ventana con paisaje exterior de fondo",
        caption: null
      }
    ],
    role: ["Art Direction", "Visual Art"],
    credits: [
      { role: "Artist", name: "ALIEN HDZ", url: null }
    ],
    context: "UFOLOGY nace a partir del universo construido para el álbum de Alien HDZ, artista venezolano radicado en Medellín, atravesado por experiencias de violencia, drogas e injusticia, narradas desde una perspectiva de superación y ambición.\n\nPartiendo de la identidad extraterrestre detrás de “UFO”, desarrollé un lenguaje visual alrededor de formas circulares que pueden leerse como ovnis, portales o elementos suspendidos en un espacio desconocido. Ese imaginario se mezcla con Money Maker, una de mis pinturas de 2025, incorporando parte de mi obra física dentro del universo gráfico del álbum.",
    location: "Medellín, Colombia",
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // CONFIRMED — New Yorker 85'
  // Standalone Art Direction project. The vehicle belongs to Minelly, aka
  // "León con Cola" — the same New Yorker her grandfather used to drive her
  // to school in, brought from New York City to Peru and later transformed
  // through Charles Days' graphic intervention into a visual statement for
  // Fvbrikv. No further detail (import dates, restoration, mechanical work,
  // materials, production process, or ownership history) is invented beyond
  // what's stated in `context`.
  //
  // Credits replace the earlier provisional single entry ("Video and
  // Photography — Fabrizio Díaz Rodriguez") with the confirmed full list
  // below — a distinct, more precise credit ("Photography — Fabrizio
  // Díaz") for this same project, not appended alongside the old one.
  // Minelly's "Car Owner" credit is intentional and kept exactly as
  // supplied — not rewritten as "Featuring" — and coexists with the
  // narrative mention in `context`; one doesn't replace the other.
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project uses a prototype-local image override (detail-01.png) and its
  // own crop (50% 40%), kept in art-direction-cinematic-strips-prototype.html
  // — NOT in this canonical entry. Nothing here affects that override.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/new-yorker-85/cover.png    <- CHARLESDAYS_INBOX/64987ca1-e340-49e2-9217-4692195ae821.png
  //   images/stories/new-yorker-85/detail-01.png <- CHARLESDAYS_INBOX/0bf49902-ca96-4054-80b3-547590a51b0e.png
  //   images/stories/new-yorker-85/detail-02.png <- CHARLESDAYS_INBOX/f03bdb84-b41f-4f3c-9777-69430ee201a0.png
  //   images/stories/new-yorker-85/detail-03.png <- CHARLESDAYS_INBOX/c57629e4-e38b-41eb-92aa-cc18e5680080.png
  //     (approved color-corrected replacement for the BTS/process shot —
  //     the version currently in CHARLESDAYS_INBOX/ is the canonical one;
  //     no earlier version is referenced or used)
  //   images/stories/new-yorker-85/detail-04.jpg <- CHARLESDAYS_INBOX/IMG_9623.jpg
  //     (full vehicle, finished graphic intervention)
  //   images/stories/new-yorker-85/detail-05.jpg <- CHARLESDAYS_INBOX/IMG_3127.jpg
  //     (Charles Days standing in front of the car)
  //   images/stories/new-yorker-85/detail-06.jpg <- CHARLESDAYS_INBOX/PHOTO-2026-09-22-12-58-52.jpg
  //     (behind-the-scenes — photographers/camera operators around the car)
  //
  // SEO title/meta description approved and ready for when /projects/
  // new-yorker-85 is built (no SEO field exists in this schema and no
  // project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "new-yorker-85",
    slug: "new-yorker-85",
    title: "New Yorker 85'",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/new-yorker-85/",
    cover: {
      src: "/images/stories/new-yorker-85/cover.png",
      alt: "Chrysler New Yorker amarillo con intervención gráfica blanca, persona fotografiando el capó"
    },
    supportingImages: [
      {
        src: "/images/stories/new-yorker-85/detail-01.png",
        alt: "Persona sentada frente al costado del auto amarillo",
        caption: null
      },
      {
        src: "/images/stories/new-yorker-85/detail-02.png",
        alt: "Auto amarillo dentro del garaje/galpón, personas cerca",
        caption: null
      },
      {
        src: "/images/stories/new-yorker-85/detail-03.png",
        alt: "Proceso — personas reunidas alrededor del auto",
        caption: null
      },
      {
        src: "/images/stories/new-yorker-85/detail-04.jpg",
        alt: "Chrysler New Yorker amarillo completo con intervención gráfica blanca en capó y costados, fotografiado en ángulo frontal dentro de Fvbrikv",
        caption: null
      },
      {
        src: "/images/stories/new-yorker-85/detail-05.jpg",
        alt: "Charles Days de pie frente al New Yorker amarillo intervenido, dentro de Fvbrikv",
        caption: null
      },
      {
        src: "/images/stories/new-yorker-85/detail-06.jpg",
        alt: "Escena detrás de cámaras: varias personas fotografiando el New Yorker intervenido dentro de Fvbrikv",
        caption: null
      }
    ],
    role: ["Art Direction"],
    credits: [
      { role: "Photography", name: "Nikholas Ortiz", url: null },
      { role: "Photography", name: "Johanderson Raga", url: null },
      { role: "Photography", name: "Fabrizio Díaz", url: null },
      { role: "Photography", name: "Ric Juke", url: null },
      { role: "Car Owner", name: "Minelly “León con Cola”", url: null }
    ],
    context: "NEW YORKER 85' parte de un objeto cargado de memoria. El auto pertenece a nuestra hermana Minelly, aka León con Cola, y fue el mismo New Yorker en el que su abuelo la llevaba a la escuela.\n\nTraído directamente de Nueva York a Perú, lo transformamos a través de una intervención gráfica en un statement de nuestro espacio creativo, Fvbrikv: una pieza donde memoria, identidad y cultura visual conviven sobre un objeto que ya tenía su propia historia.",
    location: "Fvbrikv",
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      // Confirmed Instagram process video/Reel documenting the New Yorker 85'
      // process. Media/action link only (per the schema's externalLinks
      // principle) — separate from destinationUrl, not embedded/hosted on
      // site. Will be surfaced from the project detail page once built,
      // same philosophy already used for Film's "Watch Reel" links.
      { label: "VER PROCESO", url: "https://www.instagram.com/p/DSQ4z8xkfIN/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // NEW YORKER 85' — Wall-only entries (approved batch, later pruned). These
  // reuse supportingImages already approved above for the "new-yorker-85"
  // project page (detail-01 through detail-06, same supply order — no new
  // copies, no new crops) but are separate Wall tiles with their own
  // destinations: Art Direction ones route to /art-direction/ (discipline,
  // not the project page), the behind-the-scenes shot of photographers
  // around the car routes to /film/ instead.
  //
  // Originally 6 entries (5 AD + 1 Film) were added; a follow-up pass
  // removed detail-02 (wide garage shot, car dominant, two people
  // disengaged in the background — read as a repetitive "car in a room"
  // view) and detail-04 (solo car, no people at all) for repeating the
  // yellow-car subject without adding context. detail-01 (Charles seated,
  // marker in hand), detail-03 (crew actively working around the car —
  // bumped to t-large in the Wall size sequence since it's now the
  // strongest remaining AD moment) and detail-05 (Charles standing in
  // frame with BTS camera gear) were kept for having people/process/
  // context. The Film entry (detail-06) was not touched.
  // ==========================================================================
  {
    id: "new-yorker-85-wall-01",
    slug: null,
    title: "New Yorker 85'",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/art-direction/",
    cover: { src: "/images/stories/new-yorker-85/detail-01.png", alt: "Persona sentada frente al costado del auto amarillo" },
    supportingImages: [],
    role: ["Art Direction"],
    credits: [],
    context: null,
    wall: { include: true, order: 1.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },
  {
    id: "new-yorker-85-wall-03",
    slug: null,
    title: "New Yorker 85'",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/art-direction/",
    cover: { src: "/images/stories/new-yorker-85/detail-03.png", alt: "Proceso — personas reunidas alrededor del auto" },
    supportingImages: [],
    role: ["Art Direction"],
    credits: [],
    context: null,
    wall: { include: true, order: 4.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },
  {
    id: "new-yorker-85-wall-05",
    slug: null,
    title: "New Yorker 85'",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/art-direction/",
    cover: { src: "/images/stories/new-yorker-85/detail-05.jpg", alt: "Charles Days de pie frente al New Yorker amarillo intervenido, dentro de Fvbrikv" },
    supportingImages: [],
    role: ["Art Direction"],
    credits: [],
    context: null,
    wall: { include: true, order: 8.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },
  {
    id: "new-yorker-85-wall-06-bts-film",
    slug: null,
    title: "New Yorker 85'",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/stories/new-yorker-85/detail-06.jpg", alt: "Escena detrás de cámaras: varias personas fotografiando el New Yorker intervenido dentro de Fvbrikv" },
    supportingImages: [],
    role: ["Art Direction"],
    credits: [],
    context: null,
    wall: { include: true, order: 10.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // CONFIRMED — 3rd Gen Building Systems
  // Ongoing visual-identity case study Charles is developing for 3rd Gen
  // Building Systems (photography, typography, graphic composition, brand
  // messaging, content). This first batch (5 images) is not the full case
  // study — more 3rd Gen material is expected to be added to this same
  // entry's `supportingImages` later as the project grows; do not create a
  // second "3rd Gen" story for future batches.
  //
  // `role` updated from ["Art Direction", "Visual Identity", "Content
  // Direction"] to Charles' confirmed wording, ["Creative Direction",
  // "Brand Identity", "Content Direction"]. CEO Devin Osorio is credited
  // via `credits`; Charles is not redundantly added there since his
  // contribution is already represented by `role`.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/3rd-gen-building-systems/cover.png    <- CHARLESDAYS_INBOX/53900b84-3c89-41c9-93b7-22bda4f764a4.png
  //   images/stories/3rd-gen-building-systems/detail-01.png <- CHARLESDAYS_INBOX/a4a8e4cf-177e-4321-8ea3-22a9c8d9006b.png
  //   images/stories/3rd-gen-building-systems/detail-02.png <- CHARLESDAYS_INBOX/153744f1-58da-4653-beba-3a09c344f638.png
  //   images/stories/3rd-gen-building-systems/detail-03.png <- CHARLESDAYS_INBOX/22d256c8-d3d4-452f-8196-643e7194339c.png
  //   images/stories/3rd-gen-building-systems/detail-04.png <- CHARLESDAYS_INBOX/9ad22718-b699-458e-838f-d7198a894c4d.png
  //   images/stories/3rd-gen-building-systems/detail-05.jpg <- CHARLESDAYS_INBOX/PHOTO-2026-07-30-11-42-14 3.JPG
  //     (copied as-is — no crop/recolor/retouch/AI-enhancement; no format
  //     conversion was technically required for web use)
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project uses a prototype-local image override (detail-02.png) and its
  // own crop (50% 33%), kept in art-direction-cinematic-strips-prototype.html
  // — NOT in this canonical entry. Nothing here touches that override.
  //
  // SEO title/meta description approved and ready for when /projects/
  // 3rd-gen-building-systems is built (no SEO field exists in this schema
  // and no project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "3rd-gen-building-systems",
    slug: "3rd-gen-building-systems",
    title: "3rd Gen Building Systems",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/3rd-gen-building-systems/",
    cover: {
      src: "/images/stories/3rd-gen-building-systems/cover.png",
      alt: "Fotografía arquitectónica en blanco y negro con grúa frente a edificio histórico — tipografía \"3RDGEN BUILDING SYSTEMS\""
    },
    supportingImages: [
      {
        src: "/images/stories/3rd-gen-building-systems/detail-01.png",
        alt: "Planos y laptop ThinkPad — tipografía \"BETTER BUILDINGS START WITH BETTER SYSTEMS\"",
        caption: null
      },
      {
        src: "/images/stories/3rd-gen-building-systems/detail-02.png",
        alt: "Instalación de equipo HVAC en azotea, grúa levantando equipo, dos trabajadores",
        caption: null
      },
      {
        src: "/images/stories/3rd-gen-building-systems/detail-03.png",
        alt: "Interior de construcción con trabajadores, branding 3rd Gen en la espalda de un hoodie",
        caption: null
      },
      {
        src: "/images/stories/3rd-gen-building-systems/detail-04.png",
        alt: "Azotea con equipo HVAC, trabajador, skyline de San Francisco — tipografía \"3RDGEN HEATING & COOLING\"",
        caption: null
      },
      {
        src: "/images/stories/3rd-gen-building-systems/detail-05.jpg",
        alt: "Planos de una instalación HVAC sobre una mesa de trabajo, una persona marca el plano con un lápiz rojo, laptop ThinkPad con software técnico encima de los planos",
        caption: null
      }
    ],
    role: ["Creative Direction", "Brand Identity", "Content Direction"],
    credits: [
      { role: "CEO", name: "Devin Osorio", url: null }
    ],
    context: "3rd Gen Building Systems es una empresa de HVAC que ofrece servicios residenciales y comerciales en el Bay Area, California. Mi trabajo parte de una idea simple: hacer que la calidad que existe en sus instalaciones también se perciba en la manera en que la marca se presenta.\n\nA partir de conversaciones con su CEO, Devin Osorio, sobre cómo deben construirse las marcas actuales, comenzamos a desarrollar una identidad visual y una dirección de contenido capaces de llevar una industria tradicionalmente técnica hacia un lenguaje más cuidado, contemporáneo y reconocible.\n\nEl objetivo no es hacer que HVAC parezca otra cosa, sino construir una presencia visual a la altura del trabajo que 3rd Gen ya hace.",
    location: null, // PENDING
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "VISITAR SITIO WEB", url: "https://www.3rdgen.io", platform: "website" }
    ]
  },

  // ==========================================================================
  // CONFIRMED — VIDABANDIDA — Chlorotype Series
  // Standalone Art Direction / fashion campaign story for VIDABANDIDA's
  // Chlorotype Series. Distinct from "vida-bandida-tracks" (a separate
  // Creative/Art Direction story documenting a different photography
  // session) and from the Film-series "vidabandida" entries — none of
  // those are touched or referenced by this entry.
  //
  // `role` updated from ["Art Direction"] to Charles' confirmed wording,
  // ["Creative Direction"]. No new credit added for Charles — represented
  // via `role` only, per instruction.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/vidabandida-chlorotype-series/cover.jpeg    <- CHARLESDAYS_INBOX/IMG_8026.jpeg
  //   images/stories/vidabandida-chlorotype-series/detail-01.jpg  <- CHARLESDAYS_INBOX/4F8A84EB-2965-43D7-95E2-F1B98C47DACB.JPG
  //   images/stories/vidabandida-chlorotype-series/detail-02.jpeg <- CHARLESDAYS_INBOX/IMG_7791.jpeg
  //   images/stories/vidabandida-chlorotype-series/detail-03.jpeg <- CHARLESDAYS_INBOX/IMG_8021.jpeg
  //   images/stories/vidabandida-chlorotype-series/detail-04.jpeg <- CHARLESDAYS_INBOX/IMG_8023.jpeg
  //   images/stories/vidabandida-chlorotype-series/detail-05.jpeg <- CHARLESDAYS_INBOX/IMG_8030.jpeg
  //   (detail-06.jpeg exists on disk but is a Prototype-C-only teaser
  //   override — src/CHARLESDAYS_INBOX/IMG_1651.jpg — never promoted into
  //   this canonical `supportingImages` array; not touched by this pass)
  //   images/stories/vidabandida-chlorotype-series/detail-07.jpeg <- CHARLESDAYS_INBOX/7D009C74-205D-484C-8413-B8FC0EDD2369.jpg
  //     (multiple Chlorotype garments layered together, showing bleach-
  //     treatment variation — pink, black/orange, light blue, dark/purple)
  //   images/stories/vidabandida-chlorotype-series/detail-08.jpeg <- CHARLESDAYS_INBOX/IMG_4626.jpeg
  //     (model wearing the pink Chlorotype shirt, graffiti background)
  //   Both new files copied as-is — no crop/recolor/retouch/AI-enhancement;
  //   no format conversion was technically required for web use.
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project uses a prototype-local image override (detail-06.jpeg) and its
  // own crop (50% 20%), kept in art-direction-cinematic-strips-prototype.html
  // — read and confirmed unchanged, not touched by this pass.
  //
  // SEO title/meta description approved and ready for when /projects/
  // vidabandida-chlorotype-series is built (no SEO field exists in this
  // schema and no project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "vidabandida-chlorotype-series",
    slug: "vidabandida-chlorotype-series",
    title: "VIDABANDIDA — Chlorotype Series",
    year: 2025,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/vidabandida-chlorotype-series/",
    cover: {
      src: "/images/stories/vidabandida-chlorotype-series/cover.jpeg",
      alt: "Tres modelos posando juntos en unas escaleras exteriores frente a una fachada oscura"
    },
    supportingImages: [
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-01.jpg",
        alt: "Retrato frente a un fondo azul/cian, gorro beanie negro, sosteniendo un balón de fútbol americano VIDABANDIDA",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-02.jpeg",
        alt: "Retrato de modelo con cabello estampado rosa/negro, camiseta VIDABANDIDA rosa pálido/crema",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-03.jpeg",
        alt: "Retrato cercano, trenzas negras/rojas, lentes de sol reflectantes, camiseta VIDABANDIDA gris",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-04.jpeg",
        alt: "Tres modelos caminando juntos en la calle con piezas de la serie",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-05.jpeg",
        alt: "Retrato de modelo en cuclillas, atuendo VIDABANDIDA rosa/crema, bucket hat y lentes de sol",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-07.jpeg",
        alt: "Variaciones de camisetas Chlorotype de VIDABANDIDA intervenidas mediante decoloración con cloro",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-chlorotype-series/detail-08.jpeg",
        alt: "Retrato con camiseta Chlorotype rosa de VIDABANDIDA frente a un fondo cubierto de graffiti",
        caption: null
      }
    ],
    role: ["Creative Direction"],
    credits: [
      { role: "Photography", name: "Nikholas Ortiz", url: null },
      { role: "Model", name: "Ariagna Belisario", url: null },
      { role: "Model", name: "Sheiler Naranjo", url: null },
      { role: "Model", name: "Sara Cordovez", url: null },
      { role: "Model", name: "Carlos Diaz", url: null }
    ],
    context: "Chlorotype Series nace de trabajar la prenda desde lo que ya existe en ella. En lugar de agregar una nueva capa mediante pintura o serigrafía, el diseño aparece al decolorar directamente el tejido con cloro, haciendo que la intervención forme parte de la propia prenda.\n\nLa naturaleza impredecible del proceso también introduce la imperfección como parte del diseño. Aunque una misma pieza pueda producirse cientos de veces, ninguna decoloración responde exactamente igual: cada prenda termina teniendo pequeñas variaciones que la acercan a la lógica de un one-of-one.",
    location: null, // PENDING — not inferred from the photographs
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      // Reel documenting Charles Days testing/experimenting with the
      // Chlorotype bleach process. Media/action link only, same field
      // already used elsewhere in this file — not embedded/hosted on-site.
      { label: "VER PROCESO", url: "https://www.instagram.com/p/DPUE26KDjAU/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // CONFIRMED — VIDABANDIDA — Buenas Malas Decisiones
  // Standalone Art Direction story documenting Charles Days' digital art
  // intervention (the calligraphic circular graphics) over existing
  // photography — not the photography itself, and not full campaign art
  // direction, unless separately confirmed. Distinct from
  // "vidabandida-chlorotype-series", "vida-bandida-tracks", and the
  // Film-series "vidabandida" entries — none of those are touched or
  // referenced by this entry.
  //
  // `role` updated from ["Digital Intervention"] to Charles' confirmed
  // wording, ["Digital Art"]. Charles Days is intentionally added to the
  // Model credits below (in addition to the existing Model entries) — he
  // physically appears as a model in the campaign, which is separate from
  // and not redundant with his Digital Art role.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/vidabandida-buenas-malas-decisiones/cover.jpg    <- CHARLESDAYS_INBOX/wall-13.jpg
  //     (this file previously sat unreferenced in CHARLESDAYS_INBOX/, also
  //     used as generic filler imagery in the historical wall-final-test.html
  //     prototype — it is now confirmed as real approved content for this
  //     project; the prototype's own use of it as a placeholder is unrelated
  //     and unaffected)
  //   images/stories/vidabandida-buenas-malas-decisiones/detail-01.png <- CHARLESDAYS_INBOX/IMG_0209.png
  //   images/stories/vidabandida-buenas-malas-decisiones/detail-02.png <- CHARLESDAYS_INBOX/IMG_0423.PNG
  //   images/stories/vidabandida-buenas-malas-decisiones/detail-03.png <- CHARLESDAYS_INBOX/IMG_0425.PNG
  //   (unchanged by this pass — no images added/removed/replaced)
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project (canonical `cover`, no local override) and its own crop
  // (50% 8%), kept in art-direction-cinematic-strips-prototype.html, were
  // read and left exactly as-is — not touched by this pass.
  //
  // SEO title/meta description approved and ready for when /projects/
  // vidabandida-buenas-malas-decisiones is built (no SEO field exists in
  // this schema and no project-detail page exists yet — see
  // CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "vidabandida-buenas-malas-decisiones",
    slug: "vidabandida-buenas-malas-decisiones",
    title: "VIDABANDIDA — Buenas Malas Decisiones",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/vidabandida-buenas-malas-decisiones/",
    cover: {
      src: "/images/stories/vidabandida-buenas-malas-decisiones/cover.jpg",
      alt: "Hombre patinando frente a un muro oscuro, rodeado de una gran intervención circular caligráfica gris claro/blanca"
    },
    supportingImages: [
      {
        src: "/images/stories/vidabandida-buenas-malas-decisiones/detail-01.png",
        alt: "Retrato de hombre orando, camisa blanca, lentes de sol/bandana, intervención circular caligráfica azul",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-buenas-malas-decisiones/detail-02.png",
        alt: "Retrato de hombre ajustándose un bucket hat negro, camisa blanca, intervención circular caligráfica roja/naranja",
        caption: null
      },
      {
        src: "/images/stories/vidabandida-buenas-malas-decisiones/detail-03.png",
        alt: "Retrato de hombre con bucket hat negro y camisa blanca, mirando hacia abajo, intervención circular caligráfica roja/naranja",
        caption: null
      }
    ],
    role: ["Digital Art"],
    credits: [
      { role: "Photography", name: "Nikholas Ortiz", url: null },
      { role: "Photography", name: "Andresito Schweinsteiger", url: null },
      { role: "Model", name: "Carlos Diaz", url: null },
      { role: "Model", name: "Kavoz Wonder", url: null },
      { role: "Model", name: "Sheiler Naranjo", url: null },
      { role: "Model", name: "Charles Days", url: null }
    ],
    context: "Buenas Malas Decisiones es una intervención digital desarrollada para VIDABANDIDA alrededor de una de sus nuevas prendas y la contradicción que le da nombre.\n\nLa pieza parte de esas decisiones que sabemos que pueden ser dañinas o autodestructivas, pero que aun así elegimos —y disfrutamos— tomar. A partir de esa idea, la fotografía se transforma mediante intervención gráfica para construir el universo visual de la prenda.",
    location: null, // PENDING
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // CONFIRMED — CAOS TIPOGRÁFICO (id/slug remain "art" — asset directory,
  // destinationUrl and all references are unchanged; only the canonical
  // `title` was corrected. "CAOS TIPOGRÁFICO" is the real title of this
  // artwork/project per its MANIFIESTO technical sheet — the placeholder
  // title "ART" used before was not the actual project name.
  // Standalone Art Direction entry for an individual 2025 painting by
  // Charles Days (Art Direction, Photography, Painting — all Charles'
  // own combined practice on this piece; not duplicated into `credits`
  // since no other collaborator is confirmed).
  //
  // MANIFIESTO relationship: this painting belongs to Charles' larger
  // MANIFIESTO body of work/exhibition, but is intentionally represented
  // here as its own Art Direction project rather than merged into the
  // "manifiesto" entry — per explicit instruction. The "manifiesto" story
  // (id: "manifiesto") is untouched and unreferenced by this entry; no
  // `series`/`exhibition`/`parentProject`-style field exists in the
  // current schema, so this relationship is documented here and in
  // CONTENT_PENDING.md only, not modeled as a new data field.
  //
  // Cover choice: Image 2 (Charles holding the work in front of the same
  // wall, editorial/fashion treatment) is the confirmed cover rather than
  // Image 1 (the artwork alone) — intentional, so the Art Direction index
  // foregrounds the fashion/editorial visual language of Charles' practice
  // rather than presenting this purely as painting documentation.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/art/cover.jpg    <- CHARLESDAYS_INBOX/IMG_3897.JPG
  //   images/stories/art/detail-01.jpg <- CHARLESDAYS_INBOX/IMG_3853.HEIC
  //     (format-converted HEIC -> JPEG for web compatibility only, via
  //     `sips`, same resolution/orientation, no crop/recolor/enhance;
  //     original .heic left untouched in CHARLESDAYS_INBOX/)
  //   images/stories/art/detail-02.jpg <- CHARLESDAYS_INBOX/924118C7-ECB6-46C4-8036-AE8B38579DD2.jpg
  //     (close-up/detail of the canvas surface)
  //   images/stories/art/detail-03.jpeg <- CHARLESDAYS_INBOX/IMG_3863.jpeg
  //     (canvas against the same large textured concrete wall, closer framing
  //     and two-tone blue/warm lighting — a distinct shot from detail-01, not
  //     a duplicate)
  //   images/stories/art/detail-04.jpg <- CHARLESDAYS_INBOX/EB974E0F-E364-4ED9-9056-70C8F86BDA4F.jpg
  //     (canvas displayed in front of a window, coastal Lima landscape behind)
  //   images/stories/art/detail-05.jpg <- CHARLESDAYS_INBOX/IMG_1651.jpg
  //     (Charles carrying a different typographic canvas through a store
  //     aisle, strong motion blur — process/movement documentation)
  //
  // Technique/materials and Studio are confirmed (Technique: aerosol and
  // acrylic paint on canvas; Studio: INKFAME) but have no dedicated schema
  // field yet — Studio is modeled via `credits` below (matches the existing
  // {role,name,url} shape); Technique has no equivalent field and is not
  // force-fit into one. See CONTENT_PENDING.md for both, plus the approved
  // SEO title/meta description for when /projects/art is built.
  // ==========================================================================
  {
    id: "art",
    slug: "art",
    title: "CAOS TIPOGRÁFICO",
    year: 2025,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/art/",
    cover: {
      src: "/images/stories/art/cover.jpg",
      alt: "Charles Days de pie frente a un muro texturizado, sosteniendo la obra frente a él, luz azul a la izquierda y cálida/amarilla a la derecha"
    },
    supportingImages: [
      {
        src: "/images/stories/art/detail-01.jpg",
        alt: "Obra terminada colgada sola en un gran muro gris texturizado, con amplio espacio negativo",
        caption: null
      },
      {
        src: "/images/stories/art/detail-02.jpg",
        alt: "Primer plano de la superficie del lienzo, letras en dorado y blanco sobre fondo negro con texturas de aerosol",
        caption: null
      },
      {
        src: "/images/stories/art/detail-03.jpeg",
        alt: "El lienzo apoyado contra un muro de concreto texturizado, iluminado con luz azul de un lado y cálida del otro",
        caption: null
      },
      {
        src: "/images/stories/art/detail-04.jpg",
        alt: "El lienzo completo frente a una ventana, con vista al mar y parapentes sobrevolando la costa de Lima al fondo",
        caption: null
      },
      {
        src: "/images/stories/art/detail-05.jpg",
        alt: "Charles Days caminando con otra obra tipográfica bajo el brazo dentro de un pasillo de tienda, fotografía con desenfoque de movimiento",
        caption: null
      }
    ],
    role: ["Art Direction", "Photography", "Painting"],
    credits: [
      { role: "Location", name: "INKFAME", url: null }
    ],
    context: "CAOS TIPOGRÁFICO nace de mi exploración personal como escritor de graffiti: deformar letras, cruzar estilos y construir texturas hasta encontrar movimiento dentro del caos.\n\nTrabajo desde la experimentación y las técnicas mixtas. Aerosol, pintura acrílica y cualquier recurso que permita llevar la idea hasta donde tiene que llegar. Soy fiel creyente de que el fin justifica los medios.\n\nEl resultado no termina en la pieza. La fotografía también forma parte del proceso: contexto, encuadre y movimiento terminan de construir la imagen.",
    location: null, // PENDING
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // CONFIRMED — HIGHEND — Night Car Meet
  // Standalone Art Direction case study documenting Charles Days' art
  // direction / visual intervention of a Mercedes-Benz AMG at HIGHEND's
  // Night Car Meet. Independent entry — not related in the data model to
  // any other project (VIDABANDIDA, 3rd Gen, ART, MANIFIESTO, etc.); none
  // of those are touched or referenced.
  //
  // Attribution: Charles Days' contribution was Art Direction / the car's
  // visual intervention specifically — NOT overall event Creative Direction
  // (that belongs to Baluga Studio, credited below). `role` reflects this;
  // the pre-existing "Mercedes-Benz AMG Intervention" descriptor is kept
  // alongside "Art Direction" rather than removed, matching this site's
  // convention of specific intervention-type role labels (see INTERLOCK's
  // "Mural Intervention", REFLECTIONS' "Spatial Intervention", etc.).
  //
  // Vözchler/Film connection: a related Film entry already exists —
  // id "vozchler-charles-ft-dj-sheiler" ("VÖZCHLER: CHARLES ft DJ SHEILER",
  // series "vidabandida") — but like every Film entry its `destinationUrl`
  // is just the generic "/film"; there is no per-entry deep link, hash, or
  // query-param route in film.html to land on it specifically (filtering
  // there is pure client-side state). No stable destination exists yet, so
  // no link to it was added here — see CONTENT_PENDING.md. Film itself is
  // untouched.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/highend-night-car-meet/cover.jpeg    <- CHARLESDAYS_INBOX/IMG_3841.jpeg
  //   images/stories/highend-night-car-meet/detail-01.jpeg <- CHARLESDAYS_INBOX/IMG_3844.jpeg
  //   images/stories/highend-night-car-meet/detail-02.jpeg <- CHARLESDAYS_INBOX/IMG_3851.jpeg
  //   images/stories/highend-night-car-meet/detail-03.jpeg <- CHARLESDAYS_INBOX/IMG_3854.jpeg
  //   images/stories/highend-night-car-meet/detail-04.jpeg <- CHARLESDAYS_INBOX/IMG_3868.jpeg
  //   images/stories/highend-night-car-meet/detail-06.jpeg <- CHARLESDAYS_INBOX/IMG_3872.jpeg
  //   images/stories/highend-night-car-meet/detail-07.jpeg <- CHARLESDAYS_INBOX/IMG_6381.jpg
  //   images/stories/highend-night-car-meet/detail-08.jpeg <- CHARLESDAYS_INBOX/IMG_6386.jpg
  //
  // The former detail-05.jpeg (front-wheel/rim detail, <- IMG_3867.jpeg) was
  // removed — replaced by detail-07/detail-08 above. Confirmed unreferenced
  // anywhere else in the repo before deletion; the file itself was deleted,
  // not archived. detail-06 keeps its existing name/position (closing
  // portrait) — only the freed 05 slot and a new 07/08 pair changed.
  //
  // externalLinks: DJ set link is a YouTube video (DJ Sheller), not an
  // Instagram Reel like every other externalLinks entry in this file —
  // `platform` is a free string, not an enum, so "youtube" is a natural,
  // non-refactoring value for it.
  //
  // SEO title/meta description approved and ready for when /projects/
  // highend-night-car-meet is built (no SEO field exists in this schema and
  // no project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "highend-night-car-meet",
    slug: "highend-night-car-meet",
    title: "HIGHEND — Night Car Meet",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/highend-night-car-meet/",
    cover: {
      src: "/images/stories/highend-night-car-meet/cover.jpeg",
      alt: "Charles Days inclinado sobre el capó de un Mercedes-Benz AMG blanco, interviniendo el vehículo con un marcador amarillo, ambiente nocturno de car meet"
    },
    supportingImages: [
      {
        src: "/images/stories/highend-night-car-meet/detail-01.jpeg",
        alt: "Charles Days trabajando de cerca sobre el auto con el marcador amarillo, chaqueta y gorra negra",
        caption: null
      },
      {
        src: "/images/stories/highend-night-car-meet/detail-02.jpeg",
        alt: "Charles Days agachado junto al Mercedes-Benz blanco, dibujando líneas amarillas sobre la carrocería",
        caption: null
      },
      {
        src: "/images/stories/highend-night-car-meet/detail-03.jpeg",
        alt: "Fotografía contextual del evento nocturno, otra persona en primer plano, Charles Days trabajando en el Mercedes-Benz al fondo",
        caption: null
      },
      {
        src: "/images/stories/highend-night-car-meet/detail-04.jpeg",
        alt: "Detalle de la intervención amarilla terminada sobre la carrocería del Mercedes-Benz AMG, insignia TURBO visible",
        caption: null
      },
      {
        src: "/images/stories/highend-night-car-meet/detail-06.jpeg",
        alt: "Retrato de Charles Days agachado frente al Mercedes-Benz intervenido durante el evento nocturno",
        caption: null
      },
      {
        src: "/images/stories/highend-night-car-meet/detail-07.jpeg",
        alt: "Persona apoyada sobre el capó del Mercedes-Benz intervenido bajo luz morada, otros asistentes al car meet nocturno al fondo",
        caption: null
      },
      {
        src: "/images/stories/highend-night-car-meet/detail-08.jpeg",
        alt: "Detalle de la intervención gráfica dorada sobre la carrocería del Mercedes-Benz bajo luz morada",
        caption: null
      }
    ],
    role: ["Art Direction", "Mercedes-Benz AMG Intervention"],
    credits: [
      { role: "Creative Direction", name: "Baluga Studio", url: null },
      { role: "Event Production", name: "Vözchler", url: null },
      { role: "Camera", name: "Nikholas Ortiz", url: null },
      { role: "Camera", name: "Ehycker Tovar", url: null }
    ],
    context: "HIGHEND — Night Car Meet reúne cultura automotriz, música e intervención visual.\n\nMi participación se centró en la dirección de arte y la intervención visual del vehículo, desarrollada dentro del universo creativo del evento.",
    location: null, // PENDING
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      // DJ session by DJ Sheller.
      { label: "VER DJ SET", url: "https://www.youtube.com/watch?v=FJb6mS7qBL0&list=RDFJb6mS7qBL0&start_radio=1", platform: "youtube" }
    ]
  },

  // ==========================================================================
  // CONFIRMED — REFLECTIONS
  // Standalone Art Direction spatial-intervention project: a large mirror
  // with a white calligraphic intervention painted across it, alongside an
  // intervened Buddha sculpture/head. Independent entry — not related in
  // the data model to any other project.
  //
  // `role` updated from ["Spatial Intervention"] to Charles' confirmed
  // wording, ["Art Intervention"]. Commissioned-for attribution (Emi Xu)
  // added via `credits` — the existing {role,name,url} shape cleanly
  // supports this without a new field, same principle already used for
  // "Studio", "Car Owner", "CEO", etc. elsewhere in this file. Pre-existing
  // credit (Photography & Video — Ric Juke) is preserved unchanged; it was
  // the only prior credit on record.
  //
  // Medium ("Acrylic paint on mirror") is confirmed but has no equivalent
  // schema field — this file has no medium/material field anywhere (same
  // situation already documented for CAOS TIPOGRÁFICO's Technique) — so it
  // is not force-fit into `credits` or invented as a new field. Recorded in
  // CONTENT_PENDING.md only.
  //
  // Buddha/provenance: the Buddha incorporated here is an earlier Charles
  // Days piece already gifted to Emi Xu years before this project; only
  // two pieces of that Buddha series exist, the second at Oh My Gold
  // Boutique. This is provenance/context, not a credit — no Buddha
  // project/artwork entry or Oh My Gold Boutique reference exists anywhere
  // in this file (checked), and none was created; the relationship is
  // expressed through `context` only, per instruction.
  //
  // Cover choice: the cleaned Buddha detail image is the confirmed cover
  // (not the process shot, not the full-mirror installation shot) — it
  // communicates the artwork/visual language immediately rather than
  // leading with process, per explicit instruction.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/reflections/cover.png    <- CHARLESDAYS_INBOX/074462f1-7f08-490e-9fb5-f854537f426a.png
  //     (already a clean, non-screenshot image — no separate Instagram-UI
  //     screenshot version of this shot was found among unreferenced inbox
  //     files; this file itself was used as-is, not re-edited)
  //   images/stories/reflections/detail-01.png <- CHARLESDAYS_INBOX/6a9b1cee-94d5-4a8d-9891-3952860647ae.png
  //   images/stories/reflections/detail-02.png <- CHARLESDAYS_INBOX/535785b1-61dd-4319-9af4-4bd88e9b1bb5.png
  //   images/stories/reflections/detail-03.png <- CHARLESDAYS_INBOX/32960229-8dc5-43b1-a96b-0b53fb0dac33.png
  //   (unchanged by this pass — no images added/removed/reordered)
  //
  // External video: reuses the same generic `externalLinks` field already
  // used by Film and by "new-yorker-85" — not a REFLECTIONS-specific or
  // NEW YORKER-specific mechanism; any story can carry this field.
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project uses the canonical `cover` (no local override) at crop
  // `45% 42%`, kept in art-direction-cinematic-strips-prototype.html —
  // read and confirmed unchanged, not touched by this pass.
  //
  // SEO title/meta description approved and ready for when /projects/
  // reflections is built (no SEO field exists in this schema and no
  // project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "reflections",
    slug: "reflections",
    title: "REFLECTIONS",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/reflections/",
    cover: {
      src: "/images/stories/reflections/cover.png",
      alt: "Detalle de cabeza de Buda intervenida, con intervención caligráfica blanca reflejada en el espejo detrás"
    },
    supportingImages: [
      {
        src: "/images/stories/reflections/detail-01.png",
        alt: "Charles Days pintando directamente sobre el espejo con un marcador/herramienta blanca",
        caption: null
      },
      {
        src: "/images/stories/reflections/detail-02.png",
        alt: "Detalle de cerca de la intervención caligráfica blanca sobre el espejo",
        caption: null
      },
      {
        src: "/images/stories/reflections/detail-03.png",
        alt: "Espejo completo con la intervención blanca terminada, instalación final",
        caption: null
      }
    ],
    role: ["Art Intervention"],
    credits: [
      { role: "Photography & Video", name: "Ric Juke", url: null },
      { role: "Commissioned For", name: "Emi Xu", url: null }
    ],
    context: "REFLECTIONS nace a partir de un espejo de gran formato en el nuevo espacio de Emi Xu. La intención era transformar una pieza central de la sala en algo propio, integrándola al espacio a través de una intervención hecha directamente sobre su superficie.\n\nUtilicé manifiestos de poder para enmarcar el reflejo y coroné la composición con un Buddha intervenido que había creado y regalado a Emi años atrás. Solo existen dos piezas de esta serie: la segunda se encuentra en Oh My Gold Boutique.\n\nEl resultado convierte el espejo en una pieza que convive con quien habita el espacio: imagen, palabra y objeto alrededor de un reflejo que cambia constantemente.",
    location: null,
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      // Same confirmed URL as before (Ric Juke's process video, already
      // credited above as Photography & Video) — label updated to the
      // approved CTA wording rather than duplicated as a second entry.
      { label: "VER PROCESO", url: "https://www.instagram.com/p/DRlJernDh3u/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // CONFIRMED — INTERLOCK
  // Standalone Art Direction mural/intervention by Charles Days. Independent
  // entry — not related in the data model to any other project.
  //
  // Note on identification: the cover asset (IMG_1958.jpg) was initially
  // misidentified in an earlier session pass as unrelated filler imagery
  // from a different location and excluded. The user explicitly reviewed
  // and confirmed it as the correct finished-mural photo for this project
  // before this entry was created.
  //
  // `role` updated from ["Mural Intervention", "Painting"] to Charles'
  // confirmed wording, ["Mural", "Art Intervention"]. No pre-existing
  // credits were found (was `[]`) — Commissioned By (Ryan Sanchez) and
  // Studio (Tatuajes Para Llevar) are both newly added below, using the
  // existing {role,name,url} credits shape (same principle already used
  // for "Studio", "Car Owner", "Commissioned For" elsewhere in this file).
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/interlock/cover.jpg    <- CHARLESDAYS_INBOX/IMG_1958.jpg
  //   images/stories/interlock/detail-01.jpg <- CHARLESDAYS_INBOX/IMG_0084.jpg
  //   images/stories/interlock/detail-02.jpg <- CHARLESDAYS_INBOX/IMG_0085.jpg
  //   (unchanged by this pass — no images added/removed/reordered)
  //
  // Prototype C note: the cinematic-strips prototype's teaser for this
  // project uses the canonical `cover` (no local override) at crop
  // `50% 42%`, kept in art-direction-cinematic-strips-prototype.html —
  // read and confirmed unchanged, not touched by this pass.
  //
  // SEO title/meta description approved and ready for when /projects/
  // interlock is built (no SEO field exists in this schema and no
  // project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "interlock",
    slug: "interlock",
    title: "INTERLOCK",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/interlock/",
    cover: {
      src: "/images/stories/interlock/cover.jpg",
      alt: "Mural terminado — grandes formas geométricas azules entrelazadas con elementos caligráficos blancos/plateados sobre fondo oscuro"
    },
    supportingImages: [
      {
        src: "/images/stories/interlock/detail-01.jpg",
        alt: "Charles Days de pie frente al mural, trabajando en él, visto principalmente desde atrás",
        caption: null
      },
      {
        src: "/images/stories/interlock/detail-02.jpg",
        alt: "Charles Days sentado en el piso trabajando en el mural, banco rodante negro visible",
        caption: null
      }
    ],
    role: ["Mural", "Art Intervention"],
    credits: [
      { role: "Commissioned By", name: "Ryan Sanchez", url: null },
      { role: "Studio", name: "Tatuajes Para Llevar", url: null }
    ],
    context: "INTERLOCK es un mural comisionado por Ryan Sanchez para Tatuajes Para Llevar, su estudio de tatuaje.\n\nCon una trayectoria construida alrededor del tatuaje oriental, Ryan me dio libertad creativa para desarrollar la pieza que recibe a las personas al entrar al área de tatuajes. El mural nace desde esa posición dentro del espacio: no como un elemento secundario, sino como parte de la primera impresión y la identidad visual del estudio.\n\nEl resultado es una intervención creada específicamente para habitar ese muro y funcionar como punto de entrada al universo de Tatuajes Para Llevar.",
    location: null,
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "VER VLOG", url: "https://www.instagram.com/p/DU4MCccDvbr/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // CONFIRMED — MR ENZ × CHARLES DAYS
  // Standalone Art Direction bleach collaboration between MR ENZ and
  // Charles Days on a single garment, painted simultaneously by both
  // artists. Independent entry — not related in the data model to any
  // other project.
  //
  // Charles Days is represented through `role` ("Bleach Collab") as a
  // collaborating artist/co-creator, not through a separate self-credit.
  // Collaborating Artist — MR ENZ — is the only credit; no photography
  // credit exists (none was supplied, none invented).
  //
  // Cover choice: `IMG_3805` — both artists visible working simultaneously,
  // black/orange piece dominating the foreground — confirmed by visual
  // inspection to match the intended cover description before use.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/stories/mr-enz-x-charles-days/cover.jpg     <- CHARLESDAYS_INBOX/IMG_3805.HEIC
  //   images/stories/mr-enz-x-charles-days/detail-01.jpg <- CHARLESDAYS_INBOX/IMG_3807.HEIC
  //   images/stories/mr-enz-x-charles-days/detail-02.jpg <- CHARLESDAYS_INBOX/IMG_3811.HEIC
  //     (all three format-converted HEIC -> JPEG for web compatibility only,
  //     via `sips`, same resolution/orientation, no crop/recolor/enhance;
  //     original .heic files left untouched in CHARLESDAYS_INBOX/)
  //   images/stories/mr-enz-x-charles-days/detail-03.jpg <- CHARLESDAYS_INBOX/IMG_7262.JPG
  //   images/stories/mr-enz-x-charles-days/detail-04.jpg <- CHARLESDAYS_INBOX/IMG_7311.JPG
  //   images/stories/mr-enz-x-charles-days/detail-05.jpg <- CHARLESDAYS_INBOX/IMG_7315.JPG
  //   images/stories/mr-enz-x-charles-days/detail-06.png <- CHARLESDAYS_INBOX/enz x charles.png
  //     (seventh/closing asset — a wide panoramic editorial collage of the
  //     collaboration; PNG format preserved as-is, no conversion needed)
  //
  // Gallery order is a deliberate narrative progression: collaborative
  // process (cover) -> wider process/documentary view -> bleach/detail
  // close-up -> more developed construction stage -> finished garment ->
  // finished garment in the street (motion) -> closing panoramic editorial
  // key visual. Filenames were NOT assumed to already match this order —
  // each of the seven images was visually inspected first to confirm
  // placement.
  //
  // PENDING — cinematic strip: this project is canonical but intentionally
  // NOT yet added to art-direction-cinematic-strips-prototype.html's
  // SEQUENCE. No teaser crop/object-position has been art-directed for it.
  // The existing 11-strip order/prototype file were not touched by this
  // pass. See CONTENT_PENDING.md for the pending-insertion note.
  //
  // SEO title/meta description approved and ready for when /projects/
  // mr-enz-x-charles-days is built (no SEO field exists in this schema and
  // no project-detail page exists yet — see CONTENT_PENDING.md).
  // ==========================================================================
  {
    id: "mr-enz-x-charles-days",
    slug: "mr-enz-x-charles-days",
    title: "MR ENZ × CHARLES DAYS",
    year: 2026,
    discipline: ["art-direction"],
    disciplineLabel: "ART DIRECTION",
    project: null,
    destinationType: "project",
    destinationUrl: "/projects/mr-enz-x-charles-days/",
    cover: {
      src: "/images/stories/mr-enz-x-charles-days/cover.jpg",
      alt: "MR ENZ y Charles Days interviniendo simultáneamente una prenda negra con bleach, marcas naranjas en desarrollo"
    },
    supportingImages: [
      {
        src: "/images/stories/mr-enz-x-charles-days/detail-01.jpg",
        alt: "Vista amplia del estudio durante la intervención colaborativa, ambos artistas trabajando sobre la prenda",
        caption: null
      },
      {
        src: "/images/stories/mr-enz-x-charles-days/detail-02.jpg",
        alt: "Detalle cercano de las marcas de bleach naranja desarrollándose sobre la tela negra",
        caption: null
      },
      {
        src: "/images/stories/mr-enz-x-charles-days/detail-03.jpg",
        alt: "Composición en desarrollo, líneas de construcción en tiza blanca junto a las marcas de bleach naranja",
        caption: null
      },
      {
        src: "/images/stories/mr-enz-x-charles-days/detail-04.jpg",
        alt: "Prenda terminada en negro y naranja, puesta frente a un muro cubierto de graffiti",
        caption: null
      },
      {
        src: "/images/stories/mr-enz-x-charles-days/detail-05.jpg",
        alt: "Fotografía nocturna con desenfoque de movimiento de la prenda terminada en uso, en plena calle",
        caption: null
      },
      {
        src: "/images/stories/mr-enz-x-charles-days/detail-06.png",
        alt: "Collage editorial panorámico que reúne el proceso colaborativo, tipografía Inkfame 2026 y la prenda terminada",
        caption: null
      }
    ],
    role: ["Bleach Collab"],
    credits: [
      { role: "Collaborating Artist", name: "MR ENZ", url: null },
      { role: "Special Thanks", name: "VIDABANDIDA", url: null },
      { role: "Location", name: "INKFAME", url: null }
    ],
    context: "MR ENZ × CHARLES DAYS nace como una colaboración entre dos lenguajes sobre una misma prenda. Utilizando bleach directamente sobre el tejido, ENZ y yo intervenimos la pieza simultáneamente, dejando que nuestros trazos se crucen y construyan una sola composición.\n\nUna pieza hecha a cuatro manos donde el proceso, la improvisación y las marcas de cada artista forman parte del resultado.",
    location: null,
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: eagle (full arm,
  // front-facing). Cover asset approved and copied — see provenance note
  // below. Everything else about this piece (year/context/location/
  // credits) remains unknown and stays null/empty; do not infer from the
  // photo.
  //
  // Wall correction pass: removed from the Wall (wall.include:false) —
  // the approved final 6-entry Wall selection uses the side-view/profile
  // eagle piece (id "tattoo-eagle-profile", below) as the eagle
  // representative instead. This entry stays confirmed content and
  // remains visible in the /tattoo gallery; it just isn't a duplicate
  // eagle slot on the Wall alongside the profile piece.
  //
  // Asset provenance:
  //   images/wall/tattoo-eagle.png <- cropped from wall-images/IMG_7502.PNG
  //   (crop-only: removed screenshot letterbox bars top/bottom and a UI
  //   navigation chevron on the left edge; no retouching/color/scale change;
  //   original file untouched, still at wall-images/IMG_7502.PNG)
  // ==========================================================================
  {
    id: "tattoo-eagle",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/wall/tattoo-eagle.png",
      alt: "Tatuaje de águila, brazo completo"
    },
    supportingImages: [],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: black/red
  // Cover and continuation/supporting image both approved and copied (see
  // provenance below).
  //
  // Asset provenance (copies, originals left in place):
  //   images/wall/tattoo-black-red.jpg <- IMG_1556.JPG (Downloads root)
  //     (byte-identical copy; no crop/resize/retouch/color-correction)
  //   images/stories/tattoo-black-red/detail-01.jpg <- CHARLESDAYS_INBOX/IMG_0475.JPG
  //   (continuation of the same tattoo, extended onto the abdomen; no
  //   cleanup needed — already a clean photograph, used as supplied)
  // ==========================================================================
  {
    id: "tattoo-black-red",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/wall/tattoo-black-red.jpg",
      alt: null
    },
    supportingImages: [
      {
        src: "/images/stories/tattoo-black-red/detail-01.jpg",
        alt: "Continuación del tatuaje sobre el abdomen",
        caption: null
      }
    ],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: true, order: 13, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: leg (black/red
  // ornamental). Cover asset approved and copied — see provenance below.
  // Everything else about this piece (year/context/location/credits)
  // remains unknown and stays null/empty; do not infer from the photo.
  //
  // Asset provenance (copy, original left in place):
  //   images/wall/tattoo-leg-red-black.jpg <- tatuajues web/IMG_1286.JPG
  //   (byte-identical copy; no crop/resize/retouch/color-correction)
  // ==========================================================================
  {
    id: "tattoo-leg-red-black",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/wall/tattoo-leg-red-black.jpg",
      alt: "Tatuaje ornamental negro y rojo en la pantorrilla"
    },
    supportingImages: [],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: true, order: 14, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: neck/head (outdoor,
  // sky background). Cover asset approved and copied — see provenance
  // below. Everything else about this piece (year/context/location/
  // credits) remains unknown and stays null/empty; do not infer from the
  // photo.
  //
  // Asset provenance (copy, original left in place):
  //   images/wall/tattoo-neck-sky.jpg <- CHARLESDAYS_INBOX/IMG_9875.jpg
  //   (byte-identical copy; no crop/resize/retouch/color-correction)
  // ==========================================================================
  {
    id: "tattoo-neck-sky",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/wall/tattoo-neck-sky.jpg",
      alt: "Tatuaje de cabeza y cuello, fotografiado al aire libre con cielo y mar de fondo"
    },
    supportingImages: [],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: true, order: 15, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: sloth (hand).
  // Wall correction pass — one of the approved final 6 Wall entries.
  // Everything else about this piece (year/context/location/credits)
  // remains unknown and stays null/empty; do not infer from the photo.
  //
  // Asset provenance: no dedicated full-resolution photo of this piece
  // exists elsewhere in the repository (confirmed only after an
  // exhaustive multi-pass search — see CONTENT_PENDING.md). The only
  // available source is a pinned post thumbnail visible in a screenshot
  // of Charles' own Instagram profile (Downloads root, IMG_4537.PNG) —
  // real, confirmed work, not invented. images/tattoo/sloth-hand.jpg is
  // that thumbnail cropped to remove only the Instagram "pinned post"
  // pin-icon UI overlay in the corner (same crop-only treatment already
  // approved for tattoo-eagle.png above) — no retouching/color change.
  // Lower native resolution than the rest of the set as a result.
  // ==========================================================================
  {
    id: "tattoo-sloth-hand",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/tattoo/sloth-hand.jpg",
      alt: "Tatuaje de perezoso en el dorso de la mano"
    },
    supportingImages: [],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: true, order: 16, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: eagle (side-view/
  // profile, leg). Wall correction pass — one of the approved final 6
  // Wall entries; the eagle representative on the Wall (see the removal
  // note on id "tattoo-eagle" above). Everything else about this piece
  // (year/context/location/credits) remains unknown and stays null/
  // empty; do not infer from the photo.
  //
  // Asset provenance: same situation as tattoo-sloth-hand above — no
  // dedicated full-resolution photo found after exhaustive search; only
  // source is the same Instagram profile screenshot (IMG_4537.PNG),
  // cropped to remove the pin-icon overlay only. Lower native resolution
  // than the rest of the set as a result.
  // ==========================================================================
  {
    id: "tattoo-eagle-profile",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/tattoo/eagle-profile.jpg",
      alt: "Tatuaje de águila de perfil, pierna"
    },
    supportingImages: [],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: true, order: 17, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // DISCIPLINE-ROUTED (no standalone story) — Tattoo: ornamental face
  // (black tribal linework, ear to jaw). Wall correction pass — one of
  // the approved final 6 Wall entries. Everything else about this piece
  // (year/context/location/credits) remains unknown and stays null/
  // empty; do not infer from the photo.
  //
  // Asset provenance (copy, original left in place):
  //   images/tattoo/head-lettering-02.jpg <- tatuajues web/IMG_3555.HEIC
  //   (format conversion only — HEIC to JPEG, via sips — no crop/resize/
  //   retouch/color-correction)
  // ==========================================================================
  {
    id: "tattoo-ornamental-face",
    slug: null,
    title: null,
    year: null,
    discipline: ["tattoo"],
    disciplineLabel: "TATTOO",
    project: null,
    destinationType: "discipline",
    destinationUrl: "/tattoo/",
    cover: {
      src: "/images/tattoo/head-lettering-02.jpg",
      alt: "Tatuaje ornamental en el rostro, líneas negras desde la oreja hasta la mandíbula"
    },
    supportingImages: [],
    role: ["Tattoo Artist"],
    credits: [],
    context: null,
    location: null,
    wall: { include: true, order: 18, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // COMPLETE (aside from year/venue/dates/credits) — Manifiesto
  // Standalone top-level exhibition page — never /projects/manifiesto.
  // Cover approved by Charles and copied — see provenance below.
  //
  // Asset provenance (copy, original left in place):
  //   images/manifiesto/cover.jpg <- CHARLESDAYS_INBOX/IMG_6947.JPG
  // ==========================================================================
  {
    id: "manifiesto",
    slug: null, // Manifiesto is a standalone top-level page, not /projects/[slug]
    title: "Manifiesto",
    year: null, // PENDING
    discipline: [],
    disciplineLabel: "MANIFIESTO",
    project: "Manifiesto",
    destinationType: "manifiesto",
    destinationUrl: "/manifiesto/",
    cover: {
      src: "/images/manifiesto/cover.jpg",
      alt: null // PENDING — no confirmed description to build real alt text from yet
    },
    supportingImages: [],
    role: [], // PENDING
    credits: [], // PENDING
    context: "Primera exposición individual de Charles Days en Lima.",
    location: "Lima",
    wall: { include: false, order: null, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // MANIFIESTO — 4 new Wall-only entries (approved batch). Each is a single
  // image from the exhibition, routed straight to the standalone /manifiesto/
  // page per the Wall Routing Rules (Manifiesto is never a /projects/[slug]
  // case study). These are separate from the "manifiesto" story above (its
  // own cover/data are untouched) — Wall tiles only, no new page content.
  //
  // Asset provenance (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/manifiesto/bust-detail.jpg            <- CHARLESDAYS_INBOX/027C6D93-8603-4827-9F69-DF3B713AF322.jpg
  //     (already the canonical copy — byte-identical, no new copy made)
  //   images/manifiesto/canvas-lettering-detail.jpg <- CHARLESDAYS_INBOX/924118C7-ECB6-46C4-8036-AE8B38579DD2.jpg
  //   images/manifiesto/process-cutting.jpg         <- CHARLESDAYS_INBOX/IMG_6950.jpeg
  //   images/manifiesto/canvas-wide.jpg              <- CHARLESDAYS_INBOX/Imagen.png
  //     (source was a 4032x3024 15MB PNG of a photographed canvas — resized
  //     to 1600px wide and re-encoded as JPEG for web performance; same
  //     visual content, no crop)
  // ==========================================================================
  {
    id: "manifiesto-wall-bust",
    slug: null,
    title: null,
    year: null,
    discipline: [],
    disciplineLabel: "MANIFIESTO",
    project: "Manifiesto",
    destinationType: "manifiesto",
    destinationUrl: "/manifiesto/",
    cover: { src: "/images/manifiesto/bust-detail.jpg", alt: null },
    supportingImages: [],
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 3.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },
  {
    id: "manifiesto-wall-canvas-lettering",
    slug: null,
    title: null,
    year: null,
    discipline: [],
    disciplineLabel: "MANIFIESTO",
    project: "Manifiesto",
    destinationType: "manifiesto",
    destinationUrl: "/manifiesto/",
    cover: { src: "/images/manifiesto/canvas-lettering-detail.jpg", alt: null },
    supportingImages: [],
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 7.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },
  {
    id: "manifiesto-wall-process-cutting",
    slug: null,
    title: null,
    year: null,
    discipline: [],
    disciplineLabel: "MANIFIESTO",
    project: "Manifiesto",
    destinationType: "manifiesto",
    destinationUrl: "/manifiesto/",
    cover: { src: "/images/manifiesto/process-cutting.jpg", alt: null },
    supportingImages: [],
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 9.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },
  {
    id: "manifiesto-wall-canvas-wide",
    slug: null,
    title: null,
    year: null,
    discipline: [],
    disciplineLabel: "MANIFIESTO",
    project: "Manifiesto",
    destinationType: "manifiesto",
    destinationUrl: "/manifiesto/",
    cover: { src: "/images/manifiesto/canvas-wide.jpg", alt: null },
    supportingImages: [],
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 12, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // EYE TAG — Easter egg (approved). NOT a normal project/discipline Wall
  // entry: destinationUrl is intentionally null so the Wall viewer's CTA
  // never renders (see index.html's isDestinationBuilt/ctaLabelFor — both
  // require a truthy dest, so this tile opens the viewer with no link at
  // all, no redirect). `disciplineLabel` is intentionally blank too, so
  // nothing about the tile hints at the reward before it's clicked. The
  // reward copy itself is repurposed into `title`/`role` — the exact two
  // fields the existing viewer already renders — so no viewer markup/CSS
  // had to change to support this.
  // Asset: wall-images/Ilustración_sin_título-2.png (the brand "Eye" asset).
  // ==========================================================================
  {
    id: "eye-tag-easter-egg",
    slug: null,
    title: "ENCONTRASTE EL EYE TAG DE CHARLES.",
    year: null,
    discipline: [],
    disciplineLabel: "",
    project: null,
    destinationType: "easter-egg", // not in the schema's normal project|discipline|manifiesto enum, deliberately — see comment above
    destinationUrl: null,
    cover: {
      src: "/images/wall/eye-tag.jpg",
      alt: "Ilustración del ojo, marca de Charles Days"
    },
    supportingImages: [],
    role: ["Tienes 20% de descuento en tu próximo tatuaje. Hazle screenshot a esta pantalla y muéstralo al momento de cotizar para reclamarlo."],
    credits: [],
    context: null,
    wall: { include: true, order: 5.5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: []
  },

  // ==========================================================================
  // FILM — LOST FRAMES (first confirmed batch, 10 entries)
  // Discipline-routed (no standalone story), series: "lost-frames". Each
  // still is a user-selected canonical Film still — never an Instagram Reel
  // cover/thumbnail. Editorial order preserved intentionally (insertion
  // order in this array = display order on /film); do not alphabetize or
  // sort by year. Asset provenance (copies, originals left in place in
  // CHARLESDAYS_INBOX/):
  //   images/wall/avirex.png                  <- CHARLESDAYS_INBOX/5ae107b4-cf01-45d9-b9bf-10082a3d3cf0.png
  //   images/wall/raiz-specialty-coffee.png    <- CHARLESDAYS_INBOX/View recent photos.png
  //   images/wall/vdba-x-fuck-up-x-kamaq.jpg    <- CHARLESDAYS_INBOX/IMG_3379.jpg
  //   images/wall/bryan.png                    <- CHARLESDAYS_INBOX/View recent photos 3.png
  //   images/wall/ekors-fr.jpg                 <- CHARLESDAYS_INBOX/IMG_4264.jpg
  //   images/wall/nekroz-fr.jpg                <- CHARLESDAYS_INBOX/IMG_4346.jpg
  //   images/wall/kef-pe.png                   <- CHARLESDAYS_INBOX/e2b1565e-e555-42cf-b1ef-307714b4c180.png
  //   images/wall/comuna-13-co.png              <- CHARLESDAYS_INBOX/248e837d-8b8e-4adc-9081-01f97d23807d.png
  //   images/wall/david-oliva-pe.png            <- CHARLESDAYS_INBOX/5fa6f188-bd48-4f09-9a3c-c6de8bba76f9.png
  //   images/wall/morena-pe.jpg                 <- CHARLESDAYS_INBOX/IMG_8918.jpeg
  // ==========================================================================
  {
    id: "avirex",
    slug: null,
    title: "AVIREX - ROC ONE (VE)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/avirex.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 2, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DcKTeQDuedL/", platform: "instagram" }
    ]
  },
  {
    id: "raiz-specialty-coffee",
    slug: null,
    title: "RAÍZ SPECIALTY COFFEE",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/raiz-specialty-coffee.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DdKR10chjBl/", platform: "instagram" }
    ]
  },
  {
    id: "vdba-x-fuck-up-x-kamaq",
    slug: null,
    title: "VDBA × FUCK UP × KAMAQ",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames", // stays lost-frames, not vidabandida, despite "VDBA" in the title
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/vdba-x-fuck-up-x-kamaq.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 5, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DWJXYMejjs5/", platform: "instagram" }
    ]
  },
  {
    id: "bryan",
    slug: null,
    title: "BRYAN (PE)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/bryan.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DdAnz92sCLJ/", platform: "instagram" }
    ]
  },
  {
    id: "ekors-fr",
    slug: null,
    title: "EKORS (FR)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/ekors-fr.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 8, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DXP56OCjnQs/", platform: "instagram" }
    ]
  },
  {
    id: "nekroz-fr",
    slug: null,
    title: "NEKROZ (FR)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/nekroz-fr.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DXm8-hdD7Xp/", platform: "instagram" }
    ]
  },
  {
    id: "kef-pe",
    slug: null,
    title: "KEF (PE)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/kef-pe.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DXarx5IjugS/", platform: "instagram" }
    ]
  },
  {
    id: "comuna-13-co",
    slug: null,
    title: "COMUNA 13 (CO)",
    year: 2025,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/comuna-13-co.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 10, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DZA4r5nBpLs/", platform: "instagram" }
    ]
  },
  {
    id: "david-oliva-pe",
    slug: null,
    title: "DAVID OLIVA (PE)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/david-oliva-pe.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DWpdY7JDgsJ/", platform: "instagram" }
    ]
  },
  {
    id: "morena-pe",
    slug: null,
    title: "MORENA (PE)",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "lost-frames",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/morena-pe.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DW7hbzqjs0x/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // FILM — VIDABANDIDA (first confirmed batch, 3 entries)
  // Discipline-routed (no standalone story), series: "vidabandida". Same
  // Film shape as Lost Frames. Editorial order preserved intentionally
  // (insertion order in this array = display order on /film): DJ SHEILER,
  // ALYH, KAREM RO. Distinct from the existing "vida-bandida-tracks"
  // Art Direction story above — that entry documents the photography
  // session; these are separate Film/moving-image entries. Asset provenance
  // (copies, originals left in place in CHARLESDAYS_INBOX/):
  //   images/wall/vidabandida-tracks-dj-sheiler.png <- CHARLESDAYS_INBOX/e5bf9962-3916-4b81-9e0a-65628e63a910.png
  //     (NEW confirmed still — replaces an earlier candidate of DJ Sheiler
  //     sitting on a stool, CHARLESDAYS_INBOX/eaed8d5e-8c23-4d57-a86e-a6234ebc0d89.png,
  //     which was explicitly rejected and is not used anywhere)
  //   images/wall/vidabandida-tracks-alyh.png <- CHARLESDAYS_INBOX/95b68169-b592-40ad-83d3-5eeed5e4fd8d.png
  //     (final cleaned frame, no on-screen subtitle — the only Alyh still supplied)
  //   images/wall/vidabandida-tracks-karem-ro.png <- CHARLESDAYS_INBOX/IMG_5404.png
  //     (corrected/reduced-exposure version — confirmed by measured mean
  //     luminance against the alternate candidate,
  //     CHARLESDAYS_INBOX/ca3b4925-0172-42c6-b4d4-916a7d197853.png, which
  //     measured visibly brighter/more blown-out and was not used)
  // ==========================================================================
  {
    id: "vidabandida-tracks-dj-sheiler",
    slug: null,
    title: "VIDABANDIDA TRACKS: DJ SHEILER",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/vidabandida-tracks-dj-sheiler.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 1, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DYXh44gxjWg/", platform: "instagram" }
    ]
  },
  {
    id: "vidabandida-tracks-alyh",
    slug: null,
    title: "VIDABANDIDA TRACKS: ALYH",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    // Cover corrected: this entry uses the file originally copied as
    // vidabandida-tracks-karem-ro.png (bucket hat / pink shirt) — filenames
    // on disk were left as-is; only this reference was corrected.
    cover: { src: "/images/wall/vidabandida-tracks-karem-ro.png", alt: null },
    role: [],
    credits: [],
    context: null,
    // Wall-specific override: the Wall shows a different ALYH still than
    // Film does. `wall.image` <- CHARLESDAYS_INBOX/ca3b4925-0172-42c6-b4d4-916a7d197853.png
    // (bucket hat / pink "bandida" shirt / triple-exposure ghost effect —
    // visually confirmed as ALYH, not a Karem Ro candidate, despite this
    // filename's earlier mention elsewhere in this file as a rejected
    // Karem Ro luminance comparison). `cover` above (used by film.html)
    // is untouched.
    wall: {
      include: true,
      order: 4,
      tileSize: null,
      fit: "cover",
      position: "center",
      image: { src: "/images/wall/alyh-wall.png", alt: null }
    },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DYP1adVxgRz/", platform: "instagram" }
    ]
  },
  {
    id: "vidabandida-tracks-karem-ro",
    slug: null,
    title: "VIDABANDIDA TRACKS: KAREM RO",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    // Cover corrected: this entry uses the file originally copied as
    // vidabandida-tracks-alyh.png (curly hair / black-red scarf, greenish
    // bg) — filenames on disk were left as-is; only this reference was
    // corrected.
    cover: { src: "/images/wall/vidabandida-tracks-alyh.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 6, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DYpzRf0xvY_/", platform: "instagram" }
    ]
  },
  {
    id: "vozchler-charles-ft-dj-sheiler",
    slug: null,
    title: "VÖZCHLER: CHARLES ft DJ SHEILER",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    // Asset provenance (copy, original left in place):
    //   images/wall/vozchler-charles-ft-dj-sheiler.png <- CHARLESDAYS_INBOX/def5797c-fde0-4305-918d-4b5c03f3100d.png
    cover: { src: "/images/wall/vozchler-charles-ft-dj-sheiler.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 11, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DZSNBQzRYN4/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // FILM — VIDABANDIDA (archive batch, 4 entries)
  // Same series ("vidabandida") and shape as the 4 primary Vidabandida
  // entries above — "DROP" is editorial naming inside the title, not a new
  // Film category/series. These are additional/archive pieces: /film's own
  // SHOW ALL logic (based on entry count per series) is what keeps them out
  // of the default 4-item preview — no new field or filtering concept was
  // introduced for this. Asset provenance (copies, originals left in place
  // in CHARLESDAYS_INBOX/):
  //   images/wall/vidabandida-drop-rococo-kitsune-i.jpg  <- CHARLESDAYS_INBOX/IMG_7398.jpg
  //   images/wall/vidabandida-drop-rococo-kitsune-ii.png <- CHARLESDAYS_INBOX/37417f39-7200-41aa-9a9f-cb0fbc242e6e.png
  //     (final enhanced still, not the original low-quality screenshot)
  //   images/wall/vidabandida-drop-caballo-ganador.jpg   <- CHARLESDAYS_INBOX/IMG_8295_jpg.jpg
  //   images/wall/vidabandida-x-ekors-mob.png            <- CHARLESDAYS_INBOX/45df7f5e-6d33-4e6d-bfe7-7efaacb734a9.png
  //     (final enhanced still, not the original low-quality screenshot)
  // ==========================================================================
  {
    id: "vidabandida-drop-rococo-kitsune-i",
    slug: null,
    title: "VIDABANDIDA DROP: ROCOCO KITSUNE I",
    year: 2024,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/vidabandida-drop-rococo-kitsune-i.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 9, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DDAx_-LxNo_/", platform: "instagram" }
    ]
  },
  {
    id: "vidabandida-drop-rococo-kitsune-ii",
    slug: null,
    title: "VIDABANDIDA DROP: ROCOCÓ KITSUNE II",
    year: 2024,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/vidabandida-drop-rococo-kitsune-ii.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DDdPAnlRv8j/", platform: "instagram" }
    ]
  },
  {
    id: "vidabandida-drop-caballo-ganador",
    slug: null,
    title: "VIDABANDIDA DROP: CABALLO GANADOR",
    year: 2024,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/vidabandida-drop-caballo-ganador.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DDDSm-5RFGW/", platform: "instagram" }
    ]
  },
  {
    id: "vidabandida-x-ekors-mob",
    slug: null,
    title: "VIDABANDIDA x EKORS: M.O.B",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "vidabandida",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/vidabandida-x-ekors-mob.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DZYSac1P4Uu/", platform: "instagram" }
    ]
  },

  // ==========================================================================
  // FILM — DAYS OFF (new permanent series, first confirmed batch, 4 entries)
  // Third permanent Film series alongside "lost-frames" and "vidabandida" —
  // same shape/architecture, no parallel data structure. Polished
  // independent edits/personal visual pieces by Charles Days that don't
  // belong to Lost Frames or Vidabandida. Editorial order preserved
  // intentionally (insertion order in this array = display order on
  // /film). Asset provenance (copies, originals left in place in
  // CHARLESDAYS_INBOX/):
  //   images/wall/kaido-house-collection.png   <- CHARLESDAYS_INBOX/81f32bb6-33b5-42bb-a3d8-b608c9bca03f.png
  //     (final enhanced still, not the original low-quality screenshot)
  //   images/wall/chinatown.png                <- CHARLESDAYS_INBOX/6ff14fa1-18ba-4f53-a024-9a1a5e939081.png
  //     (final enhanced still, not the original low-quality screenshot)
  //   images/wall/internazionale-statement.png <- CHARLESDAYS_INBOX/Ilustración_sin_título.png
  //     (cover replaced: new still supersedes the earlier a40ed6f2-329b-4b0d-b11e-736fcd98855b.png
  //     candidate, which is no longer used anywhere)
  //   images/wall/caribes-del-pacifico.jpg      <- CHARLESDAYS_INBOX/7602DB10-6637-4A1E-A16D-748138A1BA77.jpg
  // ==========================================================================
  {
    id: "kaido-house-collection",
    slug: null,
    title: "KAIDO HOUSE COLLECTION",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "days-off",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/kaido-house-collection.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 3, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/charlesdayss/reel/DXk5ebLDvaQ/", platform: "instagram" }
    ]
  },
  {
    id: "chinatown",
    slug: null,
    title: "CHINATOWN",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "days-off",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/chinatown.png", alt: null },
    role: [],
    credits: [],
    context: null,
    wall: { include: true, order: 7, tileSize: null, fit: "cover", position: "center" },
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DctQYTeOrZf/", platform: "instagram" }
    ]
  },
  {
    id: "internazionale-statement",
    slug: null,
    title: "INTERNAZIONALE STATEMENT",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "days-off",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/internazionale-statement.png", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DbhNND9uLZn/", platform: "instagram" }
    ]
  },
  {
    id: "caribes-del-pacifico",
    slug: null,
    title: "CARIBES DEL PACIFICO",
    year: 2026,
    discipline: ["film"],
    disciplineLabel: "FILM",
    series: "days-off",
    destinationType: "discipline",
    destinationUrl: "/film/",
    cover: { src: "/images/wall/caribes-del-pacifico.jpg", alt: null },
    role: [],
    credits: [],
    context: null,
    externalLinks: [
      { label: "Watch Reel", url: "https://www.instagram.com/p/DWw4MTUFE7q/", platform: "instagram" }
    ]
  }

];

/**
 * VIDA_BANDIDA_GENERAL_ASSETS — reference/inventory ONLY.
 * These are Vida Bandida brand/campaign assets confirmed to exist locally,
 * distinct from the VIDABANDIDA TRACKS story above. None of them are
 * approved Wall entries — per instruction, general Vida Bandida imagery is
 * not added to the Wall automatically just because it exists. Do not
 * render, import, or treat any of these as stories until explicitly
 * approved one at a time.
 */
export const VIDA_BANDIDA_GENERAL_ASSETS = [
  "website charles days/IMG_5946_Original.jpg",   // VIDABANDIDA football + "BANDIDAJE FINO" merch
  "Ilustración_sin_título 1.png",                  // sunburst calligraphy logo, "VIDABANDIDA" wordmark
  "Ilustración_sin_título 3.png",                  // "VIDABANDIDA / BANDIDAJE FINO 2024" woven-pattern piece
  "Ilustración_sin_título 4.png",                  // sunburst logo, monochrome variant
  "Ilustración_sin_título.png",                    // VB monogram in sunburst pattern
  "Monograma.png",                                  // brand style-guide slide
  "Concepto.png",                                   // brand concept/mood-board slide
  "Ilustración_sin_título_Original.jpg",           // merch product shot
  "MARÉExVDBA.pdf"                                  // brand/campaign deck (text-confirmed, not page-rendered)
];

/**
 * PENDING_CONTENT — explicitly NOT approved stories. Planning/reference
 * only. Do not render, do not treat as Wall entries, do not import into
 * the Wall in any form.
 */
export const PENDING_CONTENT = {
  carIntervention: {
    note: "Real material — not hypothetical. Standalone-story status still undecided.",
    sourceFolder: "wetransfer_img_3836-jpeg_2026-06-08_1711/",
    candidateImages: [
      "IMG_3872.jpeg", // portrait candidate — in front of the car
      "IMG_3836.jpeg", // portrait candidate
      "IMG_3858.jpeg", // portrait candidate
      "IMG_3831.jpeg", // process — yellow marker on hood
      "IMG_3843.jpeg", // process — wide shot, yellow marker on roof
      "IMG_3850.jpeg", // process — detail, yellow marker on rear glass edge
      "IMG_3865.jpeg"  // finished detail — yellow calligraphy linework
    ],
    pending: [
      "standalone-story status (project vs. discipline routing)",
      "final cover selection",
      "role",
      "context",
      "year",
      "credits"
    ]
  },
  film: {
    note: "First Lost Frames batch (10 entries) is now confirmed and populated " +
      "directly in `stories` above (series: \"lost-frames\"). " +
      "\"Javier Coffee Roaster\" from the original brief is resolved as the " +
      "populated \"RAÍZ SPECIALTY COFFEE\" entry — do not list it separately " +
      "as still-missing. \"Mr. Enz\" and \"El Milagro — Roc One\" were NOT part " +
      "of this batch and remain reference-only below — no assets/data for " +
      "them were found locally. Do not create entries for them, or for any " +
      "further Film subject, until real film stills (not Instagram Reel " +
      "covers) and confirmed metadata exist.",
    series: ["lost-frames", "vidabandida", "days-off"],
    referencedLostFramesSubjects: [
      "Mr. Enz",
      "El Milagro — Roc One"
    ],
    pending: [
      "stills/year/URL for \"Mr. Enz\" and \"El Milagro — Roc One\"",
      "role/credits/context for the 10 populated Lost Frames entries",
      "Vidabandida Film-series stills and metadata (distinct from the VIDABANDIDA TRACKS art-direction story)"
    ]
  }
};
