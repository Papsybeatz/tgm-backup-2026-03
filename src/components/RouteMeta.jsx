// src/components/RouteMeta.jsx
//
// Applies per-route <head> metadata on every navigation.
//
// Mounted once, inside the Router, and driven by useLocation — so a new page
// gets correct metadata by being added to PAGE_META, with no per-component
// wiring and nothing to forget.
//
// This runs client-side. Google executes the JS and will read the updated
// title, description and canonical. Social scrapers generally do not, which is
// why index.html still carries sensible static defaults.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveMeta } from '../lib/pageMeta';

/** Update an existing tag in place, or create it. */
function upsert(selector, tagName, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(tagName);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
}

export default function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = resolveMeta(pathname);

    document.title = meta.title;

    upsert('meta[name="description"]', 'meta', { name: 'description', content: meta.description });
    upsert('meta[name="robots"]', 'meta', { name: 'robots', content: meta.robots });
    upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: meta.canonical });

    upsert('meta[property="og:title"]', 'meta', { property: 'og:title', content: meta.title });
    upsert('meta[property="og:description"]', 'meta', { property: 'og:description', content: meta.description });
    upsert('meta[property="og:url"]', 'meta', { property: 'og:url', content: meta.canonical });

    upsert('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: meta.title });
    upsert('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: meta.description });
  }, [pathname]);

  return null;
}
