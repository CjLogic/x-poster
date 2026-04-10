import { describe, expect, test } from "bun:test";

import { buildSignatureBaseString, signBaseString } from "./auth.ts";

describe("auth helpers", () => {
  test("builds a stable OAuth base string", () => {
    const baseString = buildSignatureBaseString(
      "POST",
      "https://api.x.com/2/tweets",
      {
        oauth_consumer_key: "consumer",
        oauth_nonce: "nonce-123",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1712700000",
        oauth_token: "token",
        oauth_version: "1.0",
      },
    );

    expect(baseString).toBe(
      "POST&https%3A%2F%2Fapi.x.com%2F2%2Ftweets&oauth_consumer_key%3Dconsumer%26oauth_nonce%3Dnonce-123%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1712700000%26oauth_token%3Dtoken%26oauth_version%3D1.0",
    );
  });

  test("signs the base string with HMAC-SHA1", async () => {
    const signature = await signBaseString(
      "POST&https%3A%2F%2Fapi.x.com%2F2%2Ftweets&oauth_consumer_key%3Dconsumer",
      "consumer-secret",
      "token-secret",
    );

    expect(signature).toBe("ofGsQCEdcJOl2bh1ZgUM/fjOcO8=");
  });
});
