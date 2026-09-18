import assert from "node:assert/strict";
import test from "node:test";
import { CredentialKeyError, decryptCredential, encryptCredential } from "../lib/credential-crypto.ts";
import { parseResourceInput } from "../lib/resource-input.ts";

const secret = Buffer.alloc(32, 7).toString("base64");

test("AES-GCM credential round-trip is opaque and bound to tenant and resource", async () => {
  const token = "agent-token-super-secret";
  const encrypted = await encryptCredential(token, secret, "user-a", "server-a");

  assert.notEqual(encrypted.ciphertext, token);
  assert.equal(encrypted.ciphertext.includes(token), false);
  assert.equal(await decryptCredential(encrypted, secret, "user-a", "server-a"), token);
  await assert.rejects(() => decryptCredential(encrypted, secret, "user-b", "server-a"));
  await assert.rejects(() => decryptCredential(encrypted, secret, "user-a", "server-b"));
});

test("credential key must be exactly 32 bytes of base64 data", async () => {
  await assert.rejects(
    () => encryptCredential("token", Buffer.alloc(16).toString("base64"), "user", "server"),
    CredentialKeyError,
  );
  await assert.rejects(() => encryptCredential("token", "not-base64", "user", "server"), CredentialKeyError);
});

test("resource input separates write-only credentials from browser-visible resource data", () => {
  const parsed = parseResourceInput({
    kind: "server",
    name: "Node 1",
    url: "https://node.example.com",
    agentUrl: "https://agent.example.com/",
    agentToken: "secret-token",
  });

  assert.equal(parsed.resource.agentUrl, "https://agent.example.com");
  assert.equal(parsed.credential.token, "secret-token");
  assert.equal("agentToken" in parsed.resource, false);
  assert.equal("token" in parsed.resource, false);
});

test("credential clear is explicit and conflicts with replacement token", () => {
  const cleared = parseResourceInput({ kind: "server", name: "Node", url: "https://node.example.com", clearAgentToken: true });
  assert.equal(cleared.credential.clear, true);
  assert.throws(() => parseResourceInput({
    kind: "server",
    name: "Node",
    url: "https://node.example.com",
    agentToken: "new-token",
    clearAgentToken: true,
  }), /INVALID_CREDENTIAL/);
});
