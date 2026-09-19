/**
 * What `server-only` resolves to under Vitest. The package throws unless it
 * is loaded under React's `react-server` condition, which Next's server build
 * sets and Vitest does not, so the tests of a server-only module would fail
 * at import without this standing in for it. Empty on purpose: the guard is
 * for the build, and a test is never a browser bundle.
 */
export {};
