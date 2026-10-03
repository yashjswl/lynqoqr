# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A single person (the owner) running promotions: event registrations, Google Forms, booking pages. Uses it equally on a phone (quick create + share to WhatsApp, often between other tasks) and on a laptop (setup, cleanup, resharing from the library). Personal project, not a team tool.

## Product Purpose
Turn a long promo link into a short link (written to a Cloudflare KV, served from the owner's own domain) plus a QR code with a customizable center logo, keep every entry in a library, and share QR + caption to WhatsApp in one step (caption: Title, newline, "Short Link: <url>"). Success: link to shared QR in under a minute, and any past entry findable and reshareable quickly.

## Positioning
One tool that owns the whole loop: shorten on your own domain, brand the QR, store it, push it to WhatsApp as image + caption.

## Operating Context
Cloudflare Worker serving a Vite + React app and a Hono API; D1 for entries; KV `link-short` for slugs. Behind Cloudflare Access. WhatsApp sharing uses the Web Share API on mobile and a download/copy fallback on desktop.

## Capabilities and Constraints
Create (title, link, slug with availability check, logo upload, QR colors, logo size, live preview), library (search, edit, delete, QR download, caption copy, WhatsApp share). Library holds a few dozen entries, found by title/slug. Light and dark themes. All existing functions must be kept. The short-link domain is runtime config only, never hardcoded in the product.

## Brand Commitments
Name: LynqoQR. No fixed logo or palette. Standing preference (chosen in the 2026-10 redesign): the category standard played straight, at the craft level of Bitly / Dub.co. Clean, neutral, conventional controls; no thematic world.

## Evidence on Hand
None beyond the codebase. No testimonials, customers or metrics exist.

## Product Principles
- Speed from paste to share beats feature breadth.
- The QR is the hero object; everything else supports it.
- Works one-handed on a phone as well as on a laptop.
- Never lose or break a live short link by accident (destructive actions are deliberate).

## Accessibility & Inclusion
Good contrast and visible focus in both themes; touch targets suitable for phones; respect reduced motion.
