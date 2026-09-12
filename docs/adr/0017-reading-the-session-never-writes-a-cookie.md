# Reading the session never writes a cookie

Neon Auth's Next adapter builds a request context whose `setCookie` is
`cookieStore.set`, and hands that one context to every server method it
exposes. Next allows a cookie write in a Server Action, a Route Handler and a
middleware, and refuses one while a page renders. So `auth.getSession()` is
ordinary in an action and a hazard in a Server Component, and nothing in its
type distinguishes the two.

The hazard fires on a session refresh and at no other time. Better Auth
extends a session once per `updateAge` — a day, against a seven-day
`expiresIn` — and that is the only `get-session` reply that carries a
`Set-Cookie` for the session token. Neon's wrapper calls `setCookie` for each
cookie on such a reply, outside its own `try`, and before it reads the reply's
body. So the refusal escapes `getSession` with no session in hand at all.
`askViewer` catches it and answers Unanswered, which is the right answer to
the question it asked: it asked, and it got nothing back. Once a day, on
whichever request happens to be a page render, a Viewer loses the header's
Viewer control, every marking control, and both list routes.

Which is how it was reported, before any of the above was read: sometimes, on
the first open of the app in a day. Worth writing down, because a daily
trigger is also what makes this hard to press on purpose — a fresh sign-in
mints a session seven days out and so guarantees no reproduction, and the
error's absence after one proves nothing at all.

`askViewer` therefore reads through an instance of its own, built with
`createAuthServer` from `@neondatabase/auth/server` and given a context whose
`setCookie` does nothing. The Viewer is read; the refresh is dropped. Dropping
it is safe because a refresh keeps the same token and only extends
`expiresAt` — the cookie the browser already holds stays valid, and what is
lost is the extension of that cookie's own expiry, which today is lost anyway
because the write throws.

## Why there are two instances and not one

`auth` stays exactly as it was, because three of its four callers must write.
`proxy.ts` and `app/api/auth/[...path]` take the raw request and never touch
the context at all, but `lib/auth-actions.ts` does: `signOut` has to clear the
session cookie, and `signIn.social` has to set the session challenge cookie
that `processAuthMiddleware` looks for before it will exchange a verifier. An
app whose only auth instance dropped cookie writes could not sign anyone in or
out, and would say so with no type error and no failing test — the sign-in
would simply stop completing, the way it once did before `/signed-in` existed
(`docs/adr/0011`).

Merging the two back into one is therefore the tempting simplification this
file exists to refuse.

## Why not the middleware

A middleware both reads a session and may write cookies, so refreshing there
rather than in a render is the obvious shape. Three things are wrong with it.

`auth.middleware()` cannot be pointed at the app: it protects every route it
sees that is not on a skip list which is a constant in the package, so a
Visitor reading Trending would be sent to sign in. That is ADR 0011's whole
subject and the reason `proxy.ts` matches `/signed-in` alone.

Calling `processAuthMiddleware` ourselves was already considered and turned
down in ADR 0011, because it makes `proxy.ts` a second reader of
`NEON_AUTH_BASE_URL` and the cookie secret while `lib/auth` owns the instance.
That objection does not touch what this decision does: a second
`createAuthServer` inside `lib/auth.ts` is a second construction, not a second
owner.

And it would not work. Neon's middleware appends refreshed cookies to the
response and never to the forwarded request, so the render on the very request
that refreshed would still see the stale cookie, still go upstream, and still
throw. A middleware could only ever have warmed the cache for the *next*
request — at the price of a blocking upstream call ahead of a shell that
ADR 0010 exists to send immediately.

Two other answers were weighed and are not fixes. Raising `sessionDataTtl`
makes the throw rarer and slows the honouring of a revoked session; past the
new number it is the identical blank header. Teaching the `catch` to tell a
refused write from an outage cannot work at all, because the refusal escapes
before the reply is parsed, so there is nothing to answer with.

## Consequences

**The session-data cache is written by the sign-in exchange and nothing else,
and that was already true.** Neon mints `session_data` only from a reply
carrying the session token, so a render never minted one. Past its three
hundred seconds every page load already goes upstream — about 800ms against
200ms warm, in development — and this decision neither adds that cost nor
removes it. It only makes the reply get parsed.

**A Viewer's cookie stops being slid forward by reading pages.** It is still
extended by signing in and by the actions, which write. A Viewer who only ever
read pages would be signed out at seven days from issue rather than kept alive
indefinitely, which is what already happens today, since the write that would
have extended it is the one that throws.

**Nothing automated can catch a regression here.** `lib/auth.ts` boots Neon
Auth and reads `next/headers` at import, so Vitest cannot load it — the same
reason `lib/viewer-key` is a module of its own — and pressing the real path
needs a session past its `updateAge`. It is a browser check, forced by aging a
session row, in the same standing as the layout widths: measured, not reasoned
about.
