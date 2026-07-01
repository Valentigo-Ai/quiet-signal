// Section 4.6 / 11.5 - accurate contact info only, no confidentiality claims.
export type CrisisResource = {
  name: string;
  description: string;
  phone?: string;
  callHref?: string; // tel: link
  url?: string;
};

export const CRISIS_DISCLAIMER =
  "Quiet Signal is not a crisis or emergency service. If you're in immediate danger, call 999. " +
  "For urgent support, you can reach out to any of the services below.";

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: "Samaritans",
    description: "Free, 24/7, for anyone struggling to cope.",
    phone: "116 123",
    callHref: "tel:116123",
    url: "https://www.samaritans.org",
  },
  {
    name: "Combat Stress",
    description: "24-hour mental health helpline for veterans.",
    phone: "0800 138 1619",
    callHref: "tel:08001381619",
    url: "https://combatstress.org.uk",
  },
  {
    name: "SSAFA",
    description: "Support for serving personnel, veterans, and their families.",
    phone: "0800 731 4880",
    callHref: "tel:08007314880",
    url: "https://www.ssafa.org.uk",
  },
  {
    name: "Veterans' Gateway",
    description: "First point of contact for veterans, day or night.",
    phone: "0808 802 1212",
    callHref: "tel:08088021212",
    url: "https://www.veteransgateway.org.uk",
  },
];
