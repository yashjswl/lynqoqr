// The Worker that serves the short links. It is separate from LynqoQR: LynqoQR only writes
// keys into the KV namespace, and this Worker (routed on your short domain) reads them.
// Bind the same KV namespace to it with the binding name `redirects`.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const shortname = url.pathname.slice(1).toLowerCase();

    // Root of the domain with no key: serve the normal website.
    if (!shortname) {
      return fetch(request);
    }

    try {
      const value = await env.redirects.get(shortname);

      if (value === null) {
        // Unknown key: fall through to the normal website pages (e.g. /about).
        return fetch(request);
      }

      // Known key: redirect.
      return Response.redirect(value, 302);
    } catch (err) {
      // On any KV error, fall back to the normal website.
      return fetch(request);
    }
  }
};
