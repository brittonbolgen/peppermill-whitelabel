/**
 * Fixture vocabulary.
 *
 * Product and customer names are drawn from PepperMill's actual catalogue
 * language so the demo reads like a furniture retailer's dispute queue rather
 * than a lorem-ipsum grid.
 */

export const PRODUCTS = [
  'Layla Oval Extending Dining Table',
  'Set of 2 Layla Dining Chairs',
  'Milan Star Base Table with 4 Milano Chairs',
  'Adelaide Sideboard Range',
  'Hampton PU Leather Bar Stool — Olive',
  'Hampton PU Leather Dining Chair — Cream',
  'Large Tibetan-Style Coffee Table',
  'Reclaimed Teak Console Table',
  'Industrial Stacking Chair — Tan Leather',
  'Milano Outdoor Rope Dining Set',
  'Vintage School Chair — Oak',
  'Cast Iron Base Refectory Table',
  'Burnished Brass Floor Lamp',
  'Adelaide 3-Door Wardrobe',
  'Layla Bar Stool — Walnut',
  'Commercial Banquette Seating — 2m',
] as const;

export const FIRST_NAMES = [
  'Jo-anne', 'Jenna', 'Barry', 'Ben', 'Priya', 'Marcus', 'Elena', 'Tom',
  'Rachel', 'Daniel', 'Sofia', 'Aiden', 'Grace', 'Oliver', 'Nadia', 'Callum',
  'Imogen', 'Freya', 'Isaac', 'Leah', 'Hugo', 'Martina', 'Owen', 'Zara',
] as const;

export const LAST_NAMES = [
  'Dowson', 'Poon', 'Bradbury', 'Hatcher', 'Nair', 'Whitfield', 'Kovacs', 'Ashby',
  'Mercer', 'Okafor', 'Lindqvist', 'Rahman', 'Ferreira', 'Doyle', 'Sinclair', 'Brennan',
  'Vasquez', 'Ellison', 'Hargreaves', 'Moreau',
] as const;

export const EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'btinternet.com', 'yahoo.co.uk', 'icloud.com', 'proton.me',
] as const;

/** Billing descriptors — a mismatch here is itself a common dispute cause. */
export const DESCRIPTORS = [
  'PEPPERMILL INTERIORS',
  'PEPPERMILL*ONLINE',
  'PPRMILL ANTIQUES LTD',
  'PEPPERMILL SHOWROOM',
] as const;

export const COUNTRIES = ['GB', 'GB', 'GB', 'IE', 'US', 'FR', 'DE', 'NL'] as const;

export const STAFF = [
  { name: 'Britton Bolgen', role: 'owner', jobTitle: 'Head of Payments', department: 'Finance' },
  { name: 'Amelia Cross', role: 'admin', jobTitle: 'Disputes Manager', department: 'Operations' },
  { name: 'Ravi Menon', role: 'analyst', jobTitle: 'Payments Analyst', department: 'Finance' },
  { name: 'Sian Whitlock', role: 'agent', jobTitle: 'Dispute Agent', department: 'Operations' },
  { name: 'Daniel Osei', role: 'agent', jobTitle: 'Dispute Agent', department: 'Operations' },
  { name: 'Hannah Reeve', role: 'agent', jobTitle: 'Customer Care Lead', department: 'Support' },
  { name: 'Marco Bianchi', role: 'analyst', jobTitle: 'Risk Analyst', department: 'Risk' },
  { name: 'Nadia Kaur', role: 'viewer', jobTitle: 'Finance Controller', department: 'Finance' },
] as const;

/** Avatar tints drawn from the design system's plum ramp plus the accent. */
export const AVATAR_COLORS = [
  '#515190', '#4B445E', '#8586AF', '#FAA31F', '#2E7D5B', '#C0392B', '#666666',
] as const;

export const EVIDENCE_FILES: Record<string, { fileName: string; mimeType: string }[]> = {
  proof_of_delivery: [
    { fileName: 'dpd-proof-of-delivery.pdf', mimeType: 'application/pdf' },
    { fileName: 'signed-delivery-note.jpg', mimeType: 'image/jpeg' },
  ],
  invoice: [
    { fileName: 'itemised-invoice.pdf', mimeType: 'application/pdf' },
    { fileName: 'order-confirmation.pdf', mimeType: 'application/pdf' },
  ],
  terms_accepted: [
    { fileName: 'checkout-terms-acceptance.png', mimeType: 'image/png' },
    { fileName: 'returns-policy-v4.pdf', mimeType: 'application/pdf' },
  ],
  customer_correspondence: [
    { fileName: 'email-thread-customer.pdf', mimeType: 'application/pdf' },
    { fileName: 'support-chat-transcript.txt', mimeType: 'text/plain' },
  ],
  avs_cvv_result: [{ fileName: 'avs-cvv-match-result.pdf', mimeType: 'application/pdf' }],
  device_fingerprint: [{ fileName: 'device-fingerprint-report.json', mimeType: 'application/json' }],
  refund_proof: [{ fileName: 'refund-settlement-record.pdf', mimeType: 'application/pdf' }],
  authorization_log: [{ fileName: 'gateway-authorisation-log.csv', mimeType: 'text/csv' }],
  other: [{ fileName: 'supporting-notes.pdf', mimeType: 'application/pdf' }],
};

export const HELP_ARTICLES = [
  {
    slug: 'responding-to-a-chargeback',
    title: 'How to respond to a chargeback',
    summary: 'Build a representment packet that stands up to network review.',
    category: 'Disputes',
    readMinutes: 6,
    body: `Every representment is judged on whether the evidence answers the specific reason code — not on how much you attach.

**1. Read the reason code first.** A 13.1 "services not received" is won with delivery proof; a 10.4 "card absent fraud" is won with AVS/CVV results and device data. Attaching the wrong artefacts reads as a weak case.

**2. Attach the compelling evidence.** Aim for three to five documents that each answer a distinct question: who bought it, that they agreed to your terms, and that they received it.

**3. Write a short rebuttal letter.** State the transaction, name the reason code, and walk the reviewer through each attachment in order. Two hundred words beats two thousand.

**4. Submit before the deadline.** The countdown on each case is the network window, not ours. A late packet is an automatic loss regardless of merit.`,
  },
  {
    slug: 'understanding-prevention-alerts',
    title: 'Understanding prevention alerts',
    summary: 'What Ethoca, RDR and CDRN alerts are, and when to refund.',
    category: 'Prevention',
    readMinutes: 4,
    body: `Prevention alerts arrive *before* a dispute becomes a chargeback. Resolving one inside its window stops the chargeback being raised at all — it never touches your ratio.

**Refund** when the claim is likely valid or the order can still be stopped in the warehouse. You lose the sale but avoid the fee and the ratio hit.

**Accept** when the goods have shipped and you intend to fight a resulting chargeback with strong evidence.

**Decline** only when you are confident the alert is mistaken.

Alerts expire. An untouched alert lapses into a full chargeback, which is why the queue sorts by time remaining rather than by value.`,
  },
  {
    slug: 'chargeback-ratio-thresholds',
    title: 'Chargeback ratio thresholds explained',
    summary: 'Where the network limits sit and what happens when you cross them.',
    category: 'Compliance',
    readMinutes: 5,
    body: `Your chargeback ratio is disputes divided by transactions in a calendar month. Each network enforces its own ceiling.

**Visa (VAMP)** — 0.9%. **Mastercard (ECP)** — 1.5%. **Amex and Discover** — 1.0%.

Crossing a threshold moves you into a monitoring programme: monthly fines, mandatory remediation plans, and in prolonged cases the loss of your acquiring relationship.

The gauge on the Analytics screen plots your current ratio against each ceiling. Prevention alerts are the fastest lever — a deflected alert never enters the numerator.`,
  },
  {
    slug: 'inviting-your-team',
    title: 'Inviting your team and choosing roles',
    summary: 'Match access to responsibility with the five built-in roles.',
    category: 'Account',
    readMinutes: 3,
    body: `Roles are additive — each one includes everything the role below it can do.

**Viewer** reads cases, alerts and reports. **Dispute Agent** adds responding to chargebacks and resolving alerts. **Analyst** adds exports and platform monitoring. **Administrator** adds user and settings management. **Owner** adds branding control.

Invite people at the lowest role that covers their job. You can raise it in one click from User Management, and every change is written to the audit trail.`,
  },
  {
    slug: 'white-label-branding',
    title: 'Applying your brand to the portal',
    summary: 'Colours, wordmarks and geometry, applied live without a rebuild.',
    category: 'Account',
    readMinutes: 4,
    body: `Settings → Branding writes to your tenant record. The portal reads that record at load and maps it onto CSS custom properties, so a colour change reaches every screen at once — no rebuild, no deployment.

**Palette** drives buttons, the sidebar, chart series and status accents. **Geometry** sets the corner radius across all surfaces. **Feature toggles** decide which sections appear in the navigation.

Changes preview instantly and apply to every user on your tenant when saved.`,
  },
] as const;
