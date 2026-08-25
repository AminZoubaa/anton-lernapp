// Lässt Node die Extension-losen Imports aus lib/ ("./facts") auflösen
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith("./") || spec.startsWith("../")) && !/\\.[a-z]+$/.test(spec)) {
    try { return await next(spec + ".js", ctx); } catch {}
  }
  return next(spec, ctx);
}`),
  pathToFileURL("./")
);
