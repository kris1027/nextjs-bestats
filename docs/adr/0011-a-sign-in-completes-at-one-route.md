# A sign-in completes at one route

Neon Auth returns a Visitor from their provider with a verifier in the
address, and something has to trade that verifier for the session cookie
that makes them a Viewer. In this SDK only the middleware can: the exchange
lives in `processAuthMiddleware`, and `auth.middleware()` is the one door to
it. So BeStats has a `proxy.ts`, and the sign-in action sends the provider
back to `/signed-in` rather than to wherever the Visitor was reading.

The app went to production without one, which is worth saying plainly: every
part of being a Viewer was written, reviewed and merged against a sign-in
that could not finish. Nothing was wrong with any of it. `answeredViewer()`
was answering the question it was asked, correctly, every time.

## Why the proxy sees one route and not the app

Neon's middleware protects everything it sees. What it does not protect is a
skip list — `/api/auth`, `/auth/callback`, `/auth/sign-in` and a few more —
and that list is a constant in the package. There is no configuration that
adds to it. Pointed at the app the way Neon's own README shows, it would
send a Visitor from Trending, from search and from every detail page to
`/sign-in`, which is the opposite of what BeStats is: everything the app
shows is shown to a Visitor, signed in or not.

The matcher is therefore the whole of the configuration. `/signed-in` is a
route that exists to be the one place a sign-in lands, and the proxy watches
it alone. Widening the matcher is not a tidy-up; it makes the app private.

The lists and the settings page are deliberately left off it even though
they do need a Viewer. They already redirect, and they redirect better: the
middleware composes its own login address by copying the request's query
parameters onto it, which turns `/watchlist?page=3` into `/sign-in?page=3`
and loses the destination. `viewerOrSignIn` produces
`/sign-in?next=/watchlist?page=3`, which is the spelling `nextPath` reads
back.

## Consequences

**A failed exchange is a second trip to sign in, not a silent one.** Because
`/signed-in` is a name of ours rather than one on Neon's skip list, the
route is protected, so an exchange that comes back with nothing leaves no
session and the middleware redirects to `/sign-in` — carrying `next=` from
the request, by the same parameter copying that made the list routes a bad
fit. Naming the route `/auth/callback`, as Neon's own convention would, puts
it on the skip list and lets a failed sign-in through to the destination,
where the Visitor arrives to a "Sign in" button and no idea why.

**The route handler reads no Viewer.** By the time it runs the proxy has
decided. It honours `?next=` and nothing else, through the same `nextPath`
the sign-in page uses, since the address is reached from off-site and can be
typed by anyone.

**One extra redirect per sign-in, and one extra upstream call.** The
exchange redirects to `/signed-in` with the verifier stripped, and that
second pass asks Neon for the session before allowing the route through.
The price of the exchange having nowhere else to live.
