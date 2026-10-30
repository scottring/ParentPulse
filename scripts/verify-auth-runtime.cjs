// Run with --no-experimental-require-module to reproduce the hosted loader.
const assert = require("node:assert/strict");
const path = require("node:path");
const { generateKeyPairSync, sign, verify } = require("node:crypto");
require("firebase-admin/auth");
require("firebase-admin/firestore");
const { retrieveSigningKeys } = require(path.join(path.dirname(require.resolve("jwks-rsa")), "utils.js"));
(async () => {
  const {publicKey, privateKey} = generateKeyPairSync("rsa", {modulusLength: 2048});
  const jwk = {...publicKey.export({format:"jwk"}), kid:"runtime-check", alg:"RS256", use:"sig"};
  const [key] = await retrieveSigningKeys([jwk]);
  assert(key, "The dependency must still import a real public signing key");
  const message=Buffer.from("Fictional runtime compatibility check"), signature=sign("sha256",message,privateKey);
  assert(verify("sha256",message,key.getPublicKey(),signature));
  signature[0] ^= 1;
  assert(!verify("sha256",message,key.getPublicKey(),signature));
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const data = encode({alg:"RS256",kid:jwk.kid}) + "." + encode({sub:"fictional-test"});
  const signed = data + "." + sign("sha256",Buffer.from(data),privateKey).toString("base64url");
  const secret = require("jwks-rsa").passportJwtSecret({jwksUri:"https://unused.example.invalid",getKeysInterceptor:async()=>[jwk]});
  const selected = await new Promise((resolve,reject) => secret({},signed,(error,key)=>error?reject(error):resolve(key)));
  assert.equal(selected,key.getPublicKey());
  const rejected = await new Promise((resolve,reject) => secret({},"invalid",(error,key)=>error?reject(error):resolve(key)));
  assert.equal(rejected,null);
  console.log("PASS hosted-compatible authentication loading and real RSA signature verification");
})().catch(error => {console.error(error);process.exitCode=1;});
