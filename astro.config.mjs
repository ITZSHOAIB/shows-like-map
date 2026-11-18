// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://showslikemap.sohab.dev",
  output: "static",
  trailingSlash: "ignore",
  devToolbar: { enabled: false },
});
