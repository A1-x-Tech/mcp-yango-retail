import { test } from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "./config.js";

/** Every env var the config reads — cleared by default in each test. */
const ALL_VARS: Record<string, string | undefined> = {
  YANGO_RETAIL_TOKEN: undefined,
  YANGO_AUTH_TOKEN: undefined,
  YANGO_RETAIL_API_BASE_URL: undefined,
  YANGO_API_BASE_URL: undefined,
  YANGO_DOMAIN: undefined,
  YANGO_RETAIL_TIMEOUT_MS: undefined,
  YANGO_RETAIL_MAX_RETRIES: undefined,
};

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const merged = { ...ALL_VARS, ...vars };
  const saved = new Map(Object.keys(merged).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    run();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/**
 * A missing token used to throw here, which killed the process before the MCP
 * handshake and left the user with a dead server and no reason. It is now a
 * survivable state: the server starts degraded and the client raises
 * CredentialsError at call time (pinned in client.test.ts). Pinned here because
 * reverting it would restore that dead end.
 */
test("a missing token does not throw — the server must start degraded", () => {
  withEnv({}, () => {
    const config = loadConfig();
    assert.equal(config.token, undefined);
    assert.equal(config.apiBase, "https://api.retailtech.yango.com");
    assert.equal(config.timeoutMs, 60_000);
    assert.equal(config.maxRetries, 3);
  });
});

test("an empty value is treated as absent, not as an empty credential", () => {
  withEnv({ YANGO_RETAIL_TOKEN: "", YANGO_AUTH_TOKEN: "" }, () => {
    assert.equal(loadConfig().token, undefined);
  });
});

test("the token loads and defaults apply", () => {
  withEnv({ YANGO_RETAIL_TOKEN: "secret" }, () => {
    const config = loadConfig();
    assert.equal(config.token, "secret");
    assert.equal(config.apiBase, "https://api.retailtech.yango.com");
    assert.equal(config.timeoutMs, 60_000);
    assert.equal(config.maxRetries, 3);
  });
});

test("YANGO_AUTH_TOKEN works as an alias, YANGO_RETAIL_TOKEN wins when both are set", () => {
  withEnv({ YANGO_AUTH_TOKEN: "alias" }, () => {
    assert.equal(loadConfig().token, "alias");
  });
  withEnv({ YANGO_RETAIL_TOKEN: "primary", YANGO_AUTH_TOKEN: "alias" }, () => {
    assert.equal(loadConfig().token, "primary");
  });
});

test("the base URL override and its alias are honored, primary first", () => {
  withEnv(
    { YANGO_RETAIL_TOKEN: "t", YANGO_RETAIL_API_BASE_URL: "https://api.tst.example" },
    () => {
      assert.equal(loadConfig().apiBase, "https://api.tst.example");
    },
  );
  withEnv({ YANGO_RETAIL_TOKEN: "t", YANGO_API_BASE_URL: "https://alias.example" }, () => {
    assert.equal(loadConfig().apiBase, "https://alias.example");
  });
  withEnv(
    {
      YANGO_RETAIL_TOKEN: "t",
      YANGO_RETAIL_API_BASE_URL: "https://primary.example",
      YANGO_API_BASE_URL: "https://alias.example",
    },
    () => {
      assert.equal(loadConfig().apiBase, "https://primary.example");
    },
  );
});

test("YANGO_DOMAIN (the official Python client's name) works as the last base-URL fallback", () => {
  withEnv({ YANGO_RETAIL_TOKEN: "t", YANGO_DOMAIN: "https://domain.example" }, () => {
    assert.equal(loadConfig().apiBase, "https://domain.example");
  });
  withEnv(
    {
      YANGO_RETAIL_TOKEN: "t",
      YANGO_API_BASE_URL: "https://alias.example",
      YANGO_DOMAIN: "https://domain.example",
    },
    () => {
      assert.equal(loadConfig().apiBase, "https://alias.example");
    },
  );
});

test("timeout and retries are read from the env when valid", () => {
  withEnv(
    { YANGO_RETAIL_TOKEN: "t", YANGO_RETAIL_TIMEOUT_MS: "1500", YANGO_RETAIL_MAX_RETRIES: "0" },
    () => {
      const config = loadConfig();
      assert.equal(config.timeoutMs, 1500);
      assert.equal(config.maxRetries, 0);
    },
  );
});

test("garbage numbers fall back to the defaults", () => {
  withEnv(
    { YANGO_RETAIL_TOKEN: "t", YANGO_RETAIL_TIMEOUT_MS: "soon", YANGO_RETAIL_MAX_RETRIES: "-5" },
    () => {
      const config = loadConfig();
      assert.equal(config.timeoutMs, 60_000);
      assert.equal(config.maxRetries, 3);
    },
  );
});
