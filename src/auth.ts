import type { OAuthCredentials } from "./types.ts";

type PrimitiveParam = string | number | boolean;
type OAuthParamValue = PrimitiveParam | null | undefined;
type ParameterEntries = Array<[string, string]>;

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function normalizeEntries(entries: ParameterEntries): string {
  return entries
    .map(([key, value]) => [percentEncode(key), percentEncode(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function parseUrlParameters(url: URL): ParameterEntries {
  const entries: ParameterEntries = [];

  url.searchParams.forEach((value, key) => {
    entries.push([key, value]);
  });

  return entries;
}

function serializeExtraParameters(parameters?: Record<string, OAuthParamValue>): ParameterEntries {
  if (!parameters) {
    return [];
  }

  return Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)]);
}

function getBaseUrl(url: URL): string {
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function getOAuthCredentials(): OAuthCredentials {
  const consumerKey = process.env.X_CONSUMER_KEY;
  const consumerSecret = process.env.X_CONSUMER_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "Missing X OAuth credentials. Copy .env.example to .env and set X_CONSUMER_KEY, X_CONSUMER_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET.",
    );
  }

  return {
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  };
}

export function buildSignatureBaseString(
  method: string,
  url: string,
  parameters: Record<string, OAuthParamValue>,
): string {
  const parsedUrl = new URL(url);
  const entries = [...parseUrlParameters(parsedUrl), ...serializeExtraParameters(parameters)];
  const normalizedUrl = getBaseUrl(parsedUrl);
  const normalizedParameters = normalizeEntries(entries);

  return [method.toUpperCase(), percentEncode(normalizedUrl), percentEncode(normalizedParameters)].join(
    "&",
  );
}

export async function signBaseString(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string,
): Promise<string> {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    {
      name: "HMAC",
      hash: "SHA-1",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
  return Buffer.from(signature).toString("base64");
}

export async function buildOAuthHeader(
  method: string,
  url: string,
  extraParameters?: Record<string, OAuthParamValue>,
  credentials: OAuthCredentials = getOAuthCredentials(),
): Promise<string> {
  const oauthParameters: Record<string, string> = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_nonce: createNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };

  const signatureBaseString = buildSignatureBaseString(method, url, {
    ...extraParameters,
    ...oauthParameters,
  });

  oauthParameters.oauth_signature = await signBaseString(
    signatureBaseString,
    credentials.consumerSecret,
    credentials.accessTokenSecret,
  );

  const header = Object.entries(oauthParameters)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ");

  return `OAuth ${header}`;
}
