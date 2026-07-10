import { Firecrawl } from "firecrawl";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import axios from "axios";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! });

const BLOCKED_DOMAINS: string[] = [
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "youporn.com",
  "redtube.com",
  "spankbang.com",
  "chaturbate.com",
  "onlyfans.com",
  "brazzers.com",
  "bangbros.com",
  "realitykings.com",
  "mofos.com",
  "naughtyamerica.com",
  "babes.com",
  "twistys.com",
  "digitalplayground.com",
  "nhentai.net",
  "rule34.xxx",
  "hentaihaven.xxx",
  "clips4sale.com",
  "cam4.com",
  "bongacams.com",
  "stripchat.com",
  "myfreecams.com",
  "livejasmin.com",
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "twitch.tv",
  "dailymotion.com",
  "tiktok.com",
  "kick.com",
  "netflix.com",
  "hulu.com",
  "disneyplus.com",
  "primevideo.com",
  "hbomax.com",
  "max.com",
  "peacocktv.com",
  "paramountplus.com",
  "crunchyroll.com",
  "funimation.com",
  "plex.tv",
  "starz.com",
  "appletv.apple.com",
];

function extractHostname(url: string): string | null {
  try {
    const { hostname } = new URL(url);
    return hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
function isDomainBlocked(url: string): boolean {
  const hostname = extractHostname(url);
  if (!hostname) return true;

  return BLOCKED_DOMAINS.some(
    (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`),
  );
}

const SAFE_BROWSING_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
const SAFE_BROWSING_ENDPOINT =
  "https://safebrowsing.googleapis.com/v4/threatMatches:find";

interface SafetyResult {
  safe: boolean;
  reason?: string;
}

async function checkUrlSafety(url: string): Promise<SafetyResult> {
  if (isDomainBlocked(url)) {
    return {
      safe: false,
      reason: "Domain is on the blocked list.",
    };
  }

  if (!SAFE_BROWSING_KEY) {
    console.warn(
      "[safety] GOOGLE_SAFE_BROWSING_API_KEY not set — Safe Browsing check skipped.",
    );
    return {
      safe: true,
    };
  }

  try {
    const response = await axios.post(
      `${SAFE_BROWSING_ENDPOINT}?key=${SAFE_BROWSING_KEY}`,
      {
        client: { clientId: "custom-agent", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      },
      { timeout: 5_000 },
    );

    const matches = response.data?.matches;
    if (matches && matches.length > 0) {
      return {
        safe: false,
        reason: `Flagged by Google Safe Browsing: ${matches[0].threatType}.`,
      };
    }

    return { safe: true };
  } catch (error) {
    console.error("[safety] Safe Browsing API error:", error);
    return {
      safe: false,
      reason:
        "Unable to verify URL safety (Safe Browsing API error) — blocked as a precaution.",
    };
  }
}

export const firecrawlSearch = createTool({
  id: "firecrawl-search",
  description: `Search the live web for up-to-date information and return the top matching results.
Use this tool when:
- The user asks about current events, recent news, or topics unlikely to be in uploaded documents.
- The user explicitly asks to "search the web" or "look something up online".
- Vector store searches return no relevant results and the question is general-knowledge or time-sensitive.
- Fetching a URL always pauses for human approval before the page is retrieved.
Returns a list of result titles and URLs. For deeper content, follow up with firecrawlCrawl on a relevant URL.`,
  requireApproval: true,
  inputSchema: z.object({ query: z.string().min(1) }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string().nullable(),
        url: z.string(),
      }),
    ),
  }),
  execute: async ({ query }) => {
    const results = await firecrawl.search(query, {
      limit: 3,
      ignoreInvalidURLs: true,
      excludeDomains: BLOCKED_DOMAINS,
    });

    const safeResults = (results.web ?? []).filter(
      (item) => !isDomainBlocked(item.url),
    );

    return {
      results: safeResults.map((item) => ({
        title: item.title ?? null,
        url: item.url,
      })),
    };
  },
});

export const firecrawlCrawl = createTool({
  id: "firecrawl-crawl",
  description: `Fetch and extract the main readable content from a specific URL, returned as clean markdown.
Use this tool when:
- The user provides a URL and wants it read, summarised, or queried.
- A firecrawlSearch result returns a promising URL that needs deeper inspection.
- You need the full text of a web page to answer a question accurately.
Ads and navigation clutter are stripped automatically. Blocked domains, malware URLs,
and sites restricted by robots.txt are never fetched — they return an error instead.`,
  inputSchema: z.object({ url: z.string().url() }),
  outputSchema: z.object({
    markdown: z.string().optional(),
    error: z.boolean().optional(),
    message: z.string().optional(),
  }),
  execute: async ({ url }) => {
    const safety = await checkUrlSafety(url);
    if (!safety.safe) {
      return {
        error: true,
        message: `URL blocked: ${safety.reason}`,
      };
    }

    const result = await firecrawl.crawl(url, {
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
        blockAds: true,
      },
      limit: 3,
      allowExternalLinks: false,
      ignoreRobotsTxt: false,
      ignoreQueryParameters: true,
      deduplicateSimilarURLs: true,
    });

    return { markdown: result.data?.[0]?.markdown ?? "" };
  },
});
