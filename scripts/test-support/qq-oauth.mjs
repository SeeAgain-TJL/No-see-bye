import assert from "node:assert/strict";

// Test preload. Keep provider calls local and exercise the real callback and account creation.
const fetchOriginal = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (url.origin !== "https://graph.qq.com") return fetchOriginal(input, init);
  switch (url.pathname) {
    case "/oauth2.0/token":
      assert.equal(url.searchParams.get("grant_type"), "authorization_code");
      assert.equal(url.searchParams.get("code"), "qq-fixture-code");
      assert.equal(url.searchParams.get("client_id"), process.env.QQ_APP_ID);
      assert.equal(url.searchParams.get("client_secret"), process.env.QQ_APP_KEY);
      assert.equal(url.searchParams.get("redirect_uri"), process.env.APP_ORIGIN + "/api/auth/qq/callback");
      return Promise.resolve(new Response("access_token=qq-fixture-token&expires_in=3600"));
    case "/oauth2.0/me":
      assert.equal(url.searchParams.get("access_token"), "qq-fixture-token");
      return Promise.resolve(new Response(' callback(\n{"client_id":"qq-fixture-id","openid":"qq-fixture-user"}\n); '));
    case "/user/get_user_info":
      assert.equal(url.searchParams.get("access_token"), "qq-fixture-token");
      assert.equal(url.searchParams.get("oauth_consumer_key"), process.env.QQ_APP_ID);
      assert.equal(url.searchParams.get("openid"), "qq-fixture-user");
      return Promise.resolve(Response.json({ ret: 0, msg: "", nickname: "QQ fixture user" }));
    default:
      throw new Error("Unexpected QQ OAuth path: " + url.pathname);
  }
};
