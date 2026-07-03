// Section 4.6 / 11.5 - accurate contact info only, no confidentiality claims.
//
// Support numbers are country-specific. Resources below were verified via
// web search on 2 July 2026 against official/primary sources (988lifeline.org,
// veteranscrisisline.net, 988.ca, veterans.gc.ca, openarms.gov.au,
// lifeline.org.au, 1737.org.nz, veteransaffairs.mil.nz, samaritans.org,
// pieta.ie, one-veterans.org, gov.ie). Re-verify periodically - helplines
// occasionally change numbers.

export type CrisisResource = {
  name: string;
  description: string;
  phone?: string;
  callHref?: string; // tel: link
  url?: string;
  // "general" = for anyone; "veteran" = specifically for veterans/serving
  // personnel/military families. Not everyone using Quiet Signal is
  // military-connected, so these are shown as two separate, clearly
  // labelled groups rather than one mixed list.
  audience: "general" | "veteran";
};

export type CountryCode = "GB" | "US" | "CA" | "AU" | "NZ" | "IE";

export type CountryCrisisInfo = {
  code: CountryCode;
  countryName: string;
  emergencyNumber: string;
  emergencyCallHref: string;
  resources: CrisisResource[];
};

export const CRISIS_RESOURCES_BY_COUNTRY: Record<CountryCode, CountryCrisisInfo> = {
  GB: {
    code: "GB",
    countryName: "United Kingdom",
    emergencyNumber: "999",
    emergencyCallHref: "tel:999",
    resources: [
      {
        name: "Samaritans",
        description: "Free, 24/7, for anyone struggling to cope.",
        phone: "116 123",
        callHref: "tel:116123",
        url: "https://www.samaritans.org",
        audience: "general",
      },
      {
        name: "Combat Stress",
        description: "24-hour mental health helpline for veterans.",
        phone: "0800 138 1619",
        callHref: "tel:08001381619",
        url: "https://combatstress.org.uk",
        audience: "veteran",
      },
      {
        name: "SSAFA",
        description: "Support for serving personnel, veterans, and their families.",
        phone: "0800 731 4880",
        callHref: "tel:08007314880",
        url: "https://www.ssafa.org.uk",
        audience: "veteran",
      },
      {
        name: "Veterans' Gateway",
        description: "First point of contact for veterans, day or night.",
        phone: "0808 802 1212",
        callHref: "tel:08088021212",
        url: "https://www.veteransgateway.org.uk",
        audience: "veteran",
      },
    ],
  },
  US: {
    code: "US",
    countryName: "United States",
    emergencyNumber: "911",
    emergencyCallHref: "tel:911",
    resources: [
      {
        name: "988 Suicide & Crisis Lifeline",
        description: "Free, 24/7, call or text for anyone in emotional distress.",
        phone: "988",
        callHref: "tel:988",
        url: "https://988lifeline.org",
        audience: "general",
      },
      {
        name: "Veterans Crisis Line",
        description: "For veterans, service members, and their families - dial 988 then press 1, or text 838255.",
        phone: "988",
        callHref: "tel:988",
        url: "https://www.veteranscrisisline.net",
        audience: "veteran",
      },
    ],
  },
  CA: {
    code: "CA",
    countryName: "Canada",
    emergencyNumber: "911",
    emergencyCallHref: "tel:911",
    resources: [
      {
        name: "9-8-8 Suicide Crisis Helpline",
        description: "Free, 24/7, call or text, bilingual support across Canada (outside Quebec).",
        phone: "988",
        callHref: "tel:988",
        url: "https://988.ca",
        audience: "general",
      },
      {
        name: "VAC Assistance Service",
        description: "24/7 free psychological support for veterans, former RCMP members, and their families.",
        phone: "1-800-268-7708",
        callHref: "tel:18002687708",
        url: "https://www.veterans.gc.ca/en/contact-us/talk-mental-health-professional",
        audience: "veteran",
      },
    ],
  },
  AU: {
    code: "AU",
    countryName: "Australia",
    emergencyNumber: "000",
    emergencyCallHref: "tel:000",
    resources: [
      {
        name: "Lifeline Australia",
        description: "Free, 24/7 crisis support for any Australian.",
        phone: "13 11 14",
        callHref: "tel:131114",
        url: "https://www.lifeline.org.au",
        audience: "general",
      },
      {
        name: "Open Arms - Veterans & Families Counselling",
        description: "Free, 24/7 support for veterans and their families.",
        phone: "1800 011 046",
        callHref: "tel:1800011046",
        url: "https://www.openarms.gov.au",
        audience: "veteran",
      },
    ],
  },
  NZ: {
    code: "NZ",
    countryName: "New Zealand",
    emergencyNumber: "111",
    emergencyCallHref: "tel:111",
    resources: [
      {
        name: "1737 - Need to talk?",
        description: "Free, 24/7, call or text to talk with a trained counsellor.",
        phone: "1737",
        callHref: "tel:1737",
        url: "https://1737.org.nz",
        audience: "general",
      },
      {
        name: "Veterans' Affairs New Zealand",
        description: "Support and advice line for veterans and their families.",
        phone: "0800 483 8372",
        callHref: "tel:08004838372",
        url: "https://www.veteransaffairs.mil.nz",
        audience: "veteran",
      },
    ],
  },
  IE: {
    code: "IE",
    countryName: "Ireland",
    emergencyNumber: "999 or 112",
    emergencyCallHref: "tel:999",
    resources: [
      {
        name: "Samaritans Ireland",
        description: "Free, 24/7, for anyone struggling to cope.",
        phone: "116 123",
        callHref: "tel:116123",
        url: "https://www.samaritans.org/samaritans-ireland",
        audience: "general",
      },
      {
        name: "Pieta",
        description: "Free, 24/7 helpline, or text HELP to 51444.",
        phone: "1800 247 247",
        callHref: "tel:1800247247",
        url: "https://www.pieta.ie",
        audience: "general",
      },
      {
        name: "ONE Veterans 24/7 Support Line",
        description: "Free mental wellbeing support for all Defence Forces veterans.",
        phone: "1800 911 909",
        callHref: "tel:1800911909",
        url: "https://one-veterans.org",
        audience: "veteran",
      },
    ],
  },
};

export const SUPPORTED_COUNTRIES: CountryCrisisInfo[] = [
  CRISIS_RESOURCES_BY_COUNTRY.US,
  CRISIS_RESOURCES_BY_COUNTRY.GB,
  CRISIS_RESOURCES_BY_COUNTRY.CA,
  CRISIS_RESOURCES_BY_COUNTRY.AU,
  CRISIS_RESOURCES_BY_COUNTRY.NZ,
  CRISIS_RESOURCES_BY_COUNTRY.IE,
];

// Used when the device's region can't be detected or isn't one of the
// countries above yet. US chosen as the largest anticipated market.
export const DEFAULT_COUNTRY: CountryCode = "US";

export function getGeneralResources(info: CountryCrisisInfo): CrisisResource[] {
  return info.resources.filter((r) => r.audience === "general");
}

export function getVeteranResources(info: CountryCrisisInfo): CrisisResource[] {
  return info.resources.filter((r) => r.audience === "veteran");
}

export function getCrisisDisclaimer(info: CountryCrisisInfo): string {
  return (
    `Quiet Signal is not a crisis or emergency service. If you're in immediate danger, call ${info.emergencyNumber}. ` +
    "For urgent support, you can reach out to any of the services below."
  );
}
