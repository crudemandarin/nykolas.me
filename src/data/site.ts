// All site copy lives here. Edit words in this file; components only lay them out.

export const person = {
  name: 'Nykolas Farhangi',
  headline: 'I build the systems that have to work.',
  role: 'Software engineer · Stripe · Seattle',
  bio: 'Software engineer at Stripe. I build the systems that have to work.',
  email: 'me@nyko.run',
  github: 'https://github.com/crudemandarin',
  linkedin: 'https://www.linkedin.com/in/nykolasfarhangi/',
  base: { label: 'Seattle, WA', coords: '47.61°N 122.33°W' },
  portrait: { src: '/crew/nykolas.jpg', alt: 'Nykolas Farhangi, smiling, in a navy patterned shirt' } as null | { src: string; alt: string },
};

// Set `hidden: true` to take a section off the live site without deleting it.
// Visible sections are renumbered in order (00, 01, 02, ...).
export const allSections: { id: string; title: string; hidden?: boolean }[] = [
  { id: 'overview', title: 'Overview' },
  { id: 'profile', title: 'Mission Profile' },
  { id: 'missions', title: 'Missions', hidden: true },
  { id: 'payloads', title: 'Payloads', hidden: true },
  { id: 'field-ops', title: 'Field Ops', hidden: true },
  { id: 'travel', title: 'Travel Log' },
  { id: 'crew', title: 'Crew' },
  { id: 'comms', title: 'Comms' },
];

export const sections = allSections
  .filter((s) => !s.hidden)
  .map((s, i) => ({ ...s, n: String(i).padStart(2, '0') }));

export const profile = {
  lead: "I'm Nykolas. I've spent my career on the systems that have to hold up: auth, migrations, and the guardrails that let everyone else move fast.",
  body: 'Before Stripe, I spent three and a half years at Google Cloud. Outside work, you\'ll find me in the mountains with my dog.',
  record: [
    ['Base', 'Seattle, WA'],
    ['Current', 'Stripe · Software Engineer II'],
    ['Previous', 'Google Cloud · 2022–2026'],
    ['Earlier', 'IBM · Tokio Marine HCC'],
    ['Training', 'BS Computer Science · University of Houston'],
    ['Co-pilot', 'Powder (CR-01)'],
  ],
};

export type Mission = {
  n: number; title: string; org: string; body: string; outcomeLabel: string; outcome: string; arc: number; featured?: boolean;
};

export const missions: Mission[] = [
  {
    n: 1, org: 'Google Cloud', title: 'The harder auth model',
    body: 'Letting people connect their GitHub repos had an easy path (act as the user) and a harder one (a GitHub App with its own identity, scoped permissions and short-lived tokens). I argued for the harder one because later features would need to act when no one was there. Within months, one did.',
    outcomeLabel: 'Cleared', outcome: '2 independent security reviews', arc: 0.72,
  },
  {
    n: 2, org: 'Google Cloud', title: 'Spend guardrails', featured: true,
    body: 'Spotting runaway spend across AWS, Azure and GCP was the easy part; suspending environments without killing legitimate work was not. It shipped conservative, with a human override and a grace window, and tightened as it earned trust.',
    outcomeLabel: 'Outcome · est.', outcome: '$1–5M not spent · 20+ triggers', arc: 0.86,
  },
  {
    n: 3, org: 'Google Cloud', title: 'Fail closed',
    body: 'Replaced manual access reviews with a pipeline that checks every cloud environment, notifies owners and revokes access automatically. Every step is idempotent, and an unknown answer never counts as a no. Three provider-specific removal paths became one library.',
    outcomeLabel: 'Consolidated', outcome: '3 removal paths → 1 library', arc: 0.8,
  },
  {
    n: 4, org: 'Google Cloud', title: 'The 15-minute window',
    body: "Moved the platform's core data model inside a single write-lock window. The data went into a brand-new table, never edited in place, with a frozen build on standby, so a failure meant reverting a deploy rather than restoring a database.",
    outcomeLabel: 'Window', outcome: '15 min · zero data lost', arc: 0.64,
  },
  {
    n: 5, org: 'CougarCS · UH', title: 'Tutor to president',
    body: "Started as a tutor in the University of Houston's largest computer science organization and finished as its president, leading a team of 17 officers. We rebranded the org, built a sponsorship program that raised more than $30,000, and set attendance records along the way.",
    outcomeLabel: 'Paid members', outcome: 'Doubled · all-time high of 250+', arc: 0.92,
  },
  {
    n: 6, org: 'CougarCS · UH', title: 'Tutoring, on Discord',
    body: "Founded an online tutoring program on Discord and recruited more than 30 volunteer tutors to run it. Behind the scenes, I moved the club's member ledger into a database, with an API the rest of its tools could share.",
    outcomeLabel: 'Students served', outcome: '800+ · 30+ tutors', arc: 0.78,
  },
];

export type Payload = {
  code: string; title: string; desc: string; status: 'live' | 'offline' | 'nominal' | 'archived'; links?: { label: string; href?: string }[];
};

export const payloads: Payload[] = [
  {
    code: 'P-01', title: 'Lemonade', status: 'offline',
    desc: 'A turn-based business simulation, built as a proof of concept for multi-agent orchestration with Claude Code: one session plans, several build in parallel, and an independent reviewer checks the work against the spec.',
    // Back online? Set status: 'live' and restore href: 'https://lemonade.nyko.run' on Launch.
    links: [{ label: 'Launch ↗' }, { label: 'Source ↗', href: 'https://github.com/crudemandarin/lemonade-app' }],
  },
  {
    code: 'P-02', title: 'nykolas.me', status: 'nominal',
    desc: 'This site. Static HTML, almost no JavaScript, drawn entirely from its own design system, with a real survey sheet of the Crestones.',
    links: [{ label: 'Flight Manual →', href: '/flight-manual' }],
  },
  {
    code: 'P-03', title: 'HoneyComb', status: 'archived',
    desc: 'A 2D platformer physics sandbox, written from scratch in Java.',
  },
  {
    code: 'P-04', title: 'CougarCS Cloud', status: 'archived',
    desc: "Member management, automation and integrations for the University of Houston's largest CS organization.",
  },
];

export const fieldOps = {
  lead: {
    code: 'FO-01', title: 'Sangre de Cristo', patch: '/patches/nyko-patch-fo01.svg', patchAlt: 'FO-01 mission patch: the Crestones over Great Sand Dunes', place: 'Crestone · San Luis Valley · Great Sand Dunes, CO', cadence: 'Recurring',
    body: 'The Crestones climb more than 6,000 feet straight out of the San Luis Valley above the town of Crestone, and Great Sand Dunes, the tallest dunes in North America, sit at the foot of the same range. I keep coming back.',
    record: [
      ['Summit', 'Crestone Peak · 14,294 ft'],
      ['Position', '37.97°N 105.59°W'],
      ['Valley floor', 'Crestone · 7,930 ft'],
      ['Range', 'Sangre de Cristo'],
    ],
  },
  others: [
    {
      code: 'FO-02', title: 'Monarch', patch: '/patches/nyko-patch-fo02.svg', patchAlt: 'FO-02 mission patch: a ski line down Monarch ridge to the Continental Divide marker', discipline: 'Ski', coords: '38.51°N 106.33°W', statLabel: 'Summit', stat: '11,952 FT',
      body: 'On Monarch Pass, at the Continental Divide.',
    },
    {
      code: 'FO-03', title: 'Ravenna', patch: '/patches/nyko-patch-fo03.svg', patchAlt: 'FO-03 mission patch: a footbridge over the wooded Ravenna ravine', discipline: 'Home base', coords: '47.67°N 122.31°W', statLabel: 'Ravine depth', stat: '115 FT',
      body: 'A half-mile wooded ravine in northeast Seattle. The daily walk, with crew.',
    },
    {
      code: 'FO-04', title: 'Mulberry Mountain', patch: '/patches/nyko-patch-fo04.svg', patchAlt: 'FO-04 mission patch: a signal trace rising from Ozark ridges under an amber moon', discipline: 'Wakaan', coords: '35.71°N 93.80°W', statLabel: 'Range', stat: 'OZARKS',
      body: 'A weekend of music in the Ozark National Forest, sixteen miles up the Pig Trail from Ozark, Arkansas.',
    },
  ],
};

export const crew = {
  file: 'CR-01', name: 'Powder', patch: '/patches/nyko-patch-cr01.svg', patchAlt: 'CR-01 crew patch: Powder in profile with a blue collar and bone tag',
  record: [
    ['Role', 'Co-pilot'], ['Class', 'Maltipoo'], ['Mass', '13 lb / 5.9 kg'], ['Livery', 'White'], ['Station', 'Front seat'],
  ],
  note: 'Co-pilot on every mission that allows dogs. Usual training ground: Ravenna Park.',
};

export const flightLog = [
  { date: '2026-11', version: 'v3.0', note: 'Third flight. New identity (NYKO), the Flight Manual design system, and this site, rebuilt from scratch as static HTML. Both earlier versions are kept in the repository archive.' },
  { date: '2021–2023', version: 'v2', href: '/v2/', note: 'Club Nyko: a React portfolio with a small Express API serving experience, skills and projects. Retired with honours.' },
  { date: '2020', version: 'v1', href: '/v1/', note: 'Maiden flight: a hand-written HTML, Bootstrap and jQuery page with a résumé and project gallery.' },
];
