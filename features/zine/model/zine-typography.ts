import type {
  RecipeTypographyFontRole,
  RecipeTypographyPresetId,
  RecipeTypographyWeight,
} from "./recipe-contract";
import type { ZineLocale } from "./zine-draft";
import { ZINE_FONT_COVERAGE_RANGES } from "./zine-font-coverage.generated";

export const ZINE_TYPOGRAPHY_SYSTEM_ID = "duplex-photo-essay-v1" as const;
export const ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID = "plex-unified-archive-v1" as const;
export type ZineTypographySystemId =
  | typeof ZINE_TYPOGRAPHY_SYSTEM_ID
  | typeof ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID;

export type ZineFontAsset = {
  readonly system: ZineTypographySystemId;
  readonly filename: keyof typeof ZINE_FONT_COVERAGE_RANGES;
  readonly family: string;
  readonly role: "latin-display" | "latin-sans" | "latin-mono" | "cjk-display" | "cjk-sans";
  readonly locale: "latin" | "zh-Hans" | "zh-Hant";
  readonly weight: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly sourceBytes?: number;
  readonly sourceSha256?: string;
  readonly sourceUrl: string;
  readonly sourceRevision: string;
  readonly license: "OFL-1.1";
};

const GOOGLE_FONTS_REVISION = "73fc2ff52147e34a74804b500cf89ca219eac55d";
const GOOGLE_FONTS_RAW = `https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_REVISION}/ofl`;

export const ZINE_FONT_ASSETS: readonly ZineFontAsset[] = [
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "geist.woff2",
    family: "Geist",
    role: "latin-sans",
    locale: "latin",
    weight: "100 900",
    bytes: 29_288,
    sha256: "9b6f5ff45b278c744b5f379a2c4ecbaf858a842b8eaf82ac8d21b699ca16c608",
    sourceUrl: "https://github.com/vercel/geist-font",
    sourceRevision: "existing-local-asset-f3-t1",
    license: "OFL-1.1",
  },
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "geist-mono.woff2",
    family: "Geist Mono",
    role: "latin-mono",
    locale: "latin",
    weight: "100 900",
    bytes: 23_108,
    sha256: "5f3d6ad60f29d6cb708414ec6887163d63bf197377ef5417d2483ff31ace6c3b",
    sourceUrl: "https://github.com/vercel/geist-font",
    sourceRevision: "existing-local-asset-f3-t1",
    license: "OFL-1.1",
  },
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "bodoni-moda.woff2",
    family: "Bodoni Moda",
    role: "latin-display",
    locale: "latin",
    weight: "400 900",
    bytes: 25_804,
    sha256: "c1de3473cec36815a9cfb203f3b6202971e26ac642017d08f097df2368cfe195",
    sourceUrl: "https://github.com/google/fonts/tree/main/ofl/bodonimoda",
    sourceRevision: "existing-local-asset-f3-t1",
    license: "OFL-1.1",
  },
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "noto-sans-sc.woff2",
    family: "Noto Sans SC",
    role: "cjk-sans",
    locale: "zh-Hans",
    weight: "100 900",
    bytes: 7_782_256,
    sha256: "f424e65f86ec2ac2cc67f6cdfa2d8b62800b08ccb90f049f49421b7c28ab45cc",
    sourceBytes: 17_772_300,
    sourceSha256: "a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da",
    sourceUrl: `${GOOGLE_FONTS_RAW}/notosanssc/NotoSansSC%5Bwght%5D.ttf`,
    sourceRevision: GOOGLE_FONTS_REVISION,
    license: "OFL-1.1",
  },
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "noto-sans-tc.woff2",
    family: "Noto Sans TC",
    role: "cjk-sans",
    locale: "zh-Hant",
    weight: "100 900",
    bytes: 5_424_076,
    sha256: "0d792b3803c69753b429b37e96a9632c5c630a79505ee8274443ce9f68c57e49",
    sourceBytes: 11_941_968,
    sourceSha256: "864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f",
    sourceUrl: `${GOOGLE_FONTS_RAW}/notosanstc/NotoSansTC%5Bwght%5D.ttf`,
    sourceRevision: GOOGLE_FONTS_REVISION,
    license: "OFL-1.1",
  },
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "noto-serif-sc.woff2",
    family: "Noto Serif SC",
    role: "cjk-display",
    locale: "zh-Hans",
    weight: "200 900",
    bytes: 11_032_244,
    sha256: "627a465e05597a44eb8a036d26a75d9444ca5ef23c1a6853e8bacba58a9a9848",
    sourceBytes: 25_125_512,
    sourceSha256: "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9",
    sourceUrl: `${GOOGLE_FONTS_RAW}/notoserifsc/NotoSerifSC%5Bwght%5D.ttf`,
    sourceRevision: GOOGLE_FONTS_REVISION,
    license: "OFL-1.1",
  },
  {
    system: ZINE_TYPOGRAPHY_SYSTEM_ID,
    filename: "noto-serif-tc.woff2",
    family: "Noto Serif TC",
    role: "cjk-display",
    locale: "zh-Hant",
    weight: "200 900",
    bytes: 7_657_364,
    sha256: "21cd69674a4d9a5010d06f7829b2a8497719193629a73037e5527671417b1f88",
    sourceBytes: 16_851_596,
    sourceSha256: "0077e18f57c6908f4a000969880940bdb0dad057c0e8d98b49dc364c3d1b09c6",
    sourceUrl: `${GOOGLE_FONTS_RAW}/notoseriftc/NotoSerifTC%5Bwght%5D.ttf`,
    sourceRevision: GOOGLE_FONTS_REVISION,
    license: "OFL-1.1",
  },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-400.woff2", family: "IBM Plex Sans", role: "latin-sans", locale: "latin", weight: "400", bytes: 63_020, sha256: "ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans/fonts/complete/woff2/IBMPlexSans-Regular.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-500.woff2", family: "IBM Plex Sans", role: "latin-sans", locale: "latin", weight: "500", bytes: 66_740, sha256: "5660f8a658f8bb50dbc005232f885eadffd2bc1c235c4f6fbb63469d1f9cde6d", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans/fonts/complete/woff2/IBMPlexSans-Medium.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-600.woff2", family: "IBM Plex Sans", role: "latin-sans", locale: "latin", weight: "600", bytes: 67_060, sha256: "f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans/fonts/complete/woff2/IBMPlexSans-SemiBold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-700.woff2", family: "IBM Plex Sans", role: "latin-sans", locale: "latin", weight: "700", bytes: 63_012, sha256: "fa7130d854a660b39a7fc9e6e0f2dc23dba5f1346e2adea3e1fe37b6d884133d", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans/fonts/complete/woff2/IBMPlexSans-Bold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-mono-500.woff2", family: "IBM Plex Mono", role: "latin-mono", locale: "latin", weight: "500", bytes: 50_400, sha256: "33faf307fa6031fb4062276d7320a6d632de890cbb347576fd80cfa01077bc25", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-mono/fonts/complete/woff2/IBMPlexMono-Medium.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-mono-600.woff2", family: "IBM Plex Mono", role: "latin-mono", locale: "latin", weight: "600", bytes: 50_600, sha256: "6a825b4824c01cbb401e829e5a066a1818411bcb3538b5a5792c5ca9b82343c3", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-mono/fonts/complete/woff2/IBMPlexMono-SemiBold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-sc-400.woff2", family: "IBM Plex Sans SC", role: "cjk-sans", locale: "zh-Hans", weight: "400", bytes: 3_806_092, sha256: "39967c10c916cc9166b5b0c58e605eb722c8d271f263b42e93af9836dca3d352", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-sc/fonts/complete/woff2/unhinted/IBMPlexSansSC-Regular.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-sc-500.woff2", family: "IBM Plex Sans SC", role: "cjk-sans", locale: "zh-Hans", weight: "500", bytes: 3_975_508, sha256: "98921db796301c9ebcdff61dcb354234ae83d404f020827749f12db1e5e0f856", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-sc/fonts/complete/woff2/unhinted/IBMPlexSansSC-Medium.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-sc-600.woff2", family: "IBM Plex Sans SC", role: "cjk-sans", locale: "zh-Hans", weight: "600", bytes: 4_013_808, sha256: "f7df201a9426f4a6c338ba1634d655688ad32a310a6f0730e1c45eb367a8fe52", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-sc/fonts/complete/woff2/unhinted/IBMPlexSansSC-SemiBold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-sc-700.woff2", family: "IBM Plex Sans SC", role: "cjk-sans", locale: "zh-Hans", weight: "700", bytes: 3_870_152, sha256: "6d92a1928da5892207ae4a5f624494d2500bcb2fbd2e8bf97aed5682eb800261", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-sc/fonts/complete/woff2/unhinted/IBMPlexSansSC-Bold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-tc-400.woff2", family: "IBM Plex Sans TC", role: "cjk-sans", locale: "zh-Hant", weight: "400", bytes: 2_488_420, sha256: "0dd0f10837e064733534bfcbcbea9c6dac490f8365283679f39c73b466a53271", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-tc/fonts/complete/woff2/unhinted/IBMPlexSansTC-Regular.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-tc-500.woff2", family: "IBM Plex Sans TC", role: "cjk-sans", locale: "zh-Hant", weight: "500", bytes: 2_598_248, sha256: "fb683f63dc3f4e9f2e810264d356edd7856eab4a6dc4345eddc2dec5aed6b2ff", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-tc/fonts/complete/woff2/unhinted/IBMPlexSansTC-Medium.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-tc-600.woff2", family: "IBM Plex Sans TC", role: "cjk-sans", locale: "zh-Hant", weight: "600", bytes: 2_627_280, sha256: "2135b61e683db4d7981490dfd76a3eaf77abd37c32db6b16509b2cf1e4cba498", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-tc/fonts/complete/woff2/unhinted/IBMPlexSansTC-SemiBold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
  { system: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, filename: "plex-fallback/plex-sans-tc-700.woff2", family: "IBM Plex Sans TC", role: "cjk-sans", locale: "zh-Hant", weight: "700", bytes: 2_566_220, sha256: "88ea6aeb64b6e8c204a1b0926ffff3470cd7574dc761125c552a588598bd7e71", sourceUrl: "https://raw.githubusercontent.com/IBM/plex/bf260093582f04622aacc1e9f9ca604d7ccd0c42/packages/plex-sans-tc/fonts/complete/woff2/unhinted/IBMPlexSansTC-Bold.woff2", sourceRevision: "bf260093582f04622aacc1e9f9ca604d7ccd0c42", license: "OFL-1.1" },
] as const;

export type ZineTypographyIssue = {
  readonly code: "unsupported-glyph";
  readonly message: string;
  readonly locale: ZineLocale;
  readonly presetId: RecipeTypographyPresetId;
  readonly fontRole: RecipeTypographyFontRole;
  readonly system: ZineTypographySystemId;
  readonly codePoints: readonly string[];
};

const LATIN_FONT_FILE: Readonly<Record<RecipeTypographyFontRole, keyof typeof ZINE_FONT_COVERAGE_RANGES>> = {
  "display-serif": "bodoni-moda.woff2",
  "support-sans": "geist.woff2",
  "metadata-mono": "geist-mono.woff2",
};

function getCjkFontFile(
  locale: ZineLocale,
  fontRole: RecipeTypographyFontRole,
): keyof typeof ZINE_FONT_COVERAGE_RANGES {
  const region = locale === "zh-Hans" ? "sc" : "tc";
  const style = fontRole === "display-serif" ? "serif" : "sans";
  return `noto-${style}-${region}.woff2` as keyof typeof ZINE_FONT_COVERAGE_RANGES;
}

export function getZineFontFiles(
  locale: ZineLocale,
  fontRole: RecipeTypographyFontRole,
  system: ZineTypographySystemId = ZINE_TYPOGRAPHY_SYSTEM_ID,
  weight: RecipeTypographyWeight = 400,
): readonly (keyof typeof ZINE_FONT_COVERAGE_RANGES)[] {
  if (system === ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID) {
    const region = locale === "zh-Hans" ? "sc" : "tc";
    const latin = fontRole === "metadata-mono"
      ? `plex-fallback/plex-mono-${weight}.woff2`
      : `plex-fallback/plex-sans-${weight}.woff2`;
    return [
      latin as keyof typeof ZINE_FONT_COVERAGE_RANGES,
      `plex-fallback/plex-sans-${region}-${weight}.woff2` as keyof typeof ZINE_FONT_COVERAGE_RANGES,
    ];
  }
  return [LATIN_FONT_FILE[fontRole], getCjkFontFile(locale, fontRole)];
}

export function findUnsupportedZineCodePoints(
  text: string,
  locale: ZineLocale,
  fontRole: RecipeTypographyFontRole,
  system: ZineTypographySystemId = ZINE_TYPOGRAPHY_SYSTEM_ID,
  weight: RecipeTypographyWeight = 400,
) {
  const files = getZineFontFiles(locale, fontRole, system, weight);
  const unsupported = new Set<number>();
  for (const character of text) {
    const point = character.codePointAt(0);
    if (point === undefined || /\s/u.test(character)) continue;
    if (!files.some((file) => containsCodePoint(ZINE_FONT_COVERAGE_RANGES[file], point))) {
      unsupported.add(point);
    }
  }
  return [...unsupported].toSorted((left, right) => left - right);
}

export function createZineTypographyIssue({
  text,
  locale,
  presetId,
  fontRole,
  system = ZINE_TYPOGRAPHY_SYSTEM_ID,
  weight = 400,
}: {
  readonly text: string;
  readonly locale: ZineLocale;
  readonly presetId: RecipeTypographyPresetId;
  readonly fontRole: RecipeTypographyFontRole;
  readonly system?: ZineTypographySystemId;
  readonly weight?: RecipeTypographyWeight;
}): ZineTypographyIssue | null {
  const unsupported = findUnsupportedZineCodePoints(text, locale, fontRole, system, weight);
  if (unsupported.length === 0) return null;
  const codePoints = unsupported.map(formatCodePoint);
  return {
    code: "unsupported-glyph",
    message: `Bundled ${locale} typography does not cover ${codePoints.join(", ")}; system-font fallback is forbidden.`,
    locale,
    presetId,
    fontRole,
    system,
    codePoints,
  };
}

function containsCodePoint(
  ranges: readonly (readonly [number, number])[],
  point: number,
) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const [start, end] = ranges[middle]!;
    if (point < start) high = middle - 1;
    else if (point > end) low = middle + 1;
    else return true;
  }
  return false;
}

function formatCodePoint(point: number) {
  return `U+${point.toString(16).toUpperCase().padStart(point > 0xffff ? 6 : 4, "0")}`;
}
