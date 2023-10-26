// We use this to make sure we can extract the env vars both in the browser and in Node.js.
const ENV = globalThis.process ? globalThis.process.env : import.meta.env;

const conf =
  ENV.STAGE === "prod" || ENV.PUBLIC_STAGE === "prod"
    ? await import("./config_prod.js")
    : await import("./config_nonprod.js");

export default conf.default;
