import { onRequestGet as __a__slug__js_onRequestGet } from "/home/claude/votonikem/functions/a/[slug].js"
import { onRequestGet as __sitemap_xml_js_onRequestGet } from "/home/claude/votonikem/functions/sitemap.xml.js"

export const routes = [
    {
      routePath: "/a/:slug",
      mountPath: "/a",
      method: "GET",
      middlewares: [],
      modules: [__a__slug__js_onRequestGet],
    },
  {
      routePath: "/sitemap.xml",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__sitemap_xml_js_onRequestGet],
    },
  ]