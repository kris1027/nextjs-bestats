/**
 * Reading a connection string without repeating it. `db:check` exists to be
 * pointed at databases whose strings are not in `.env.local` — production's
 * above all — so its failures are the one place in this repository where a
 * password is a plausible thing to print by accident. The driver does exactly
 * that: handed something unparseable, `neon()` throws with the whole string in
 * the message.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 */

/** The host a connection string names, or `null` when it is not a URL at all.
 * The one part of a connection string safe to put in a message. */
export const databaseHost = (url: string): string | null => {
  try {
    return new URL(url).host || null;
  } catch {
    return null;
  }
};

/**
 * `text` with the connection string and its password struck out, for reporting
 * a failure someone else's library described. Blunt on purpose: it replaces
 * what it was given rather than hunting for things shaped like a secret, since
 * a redactor that has to be clever is a redactor that will one day be wrong.
 *
 * The password is taken from the parsed URL, which leaves it percent-encoded
 * exactly as it appears in the string itself, so the replacement matches.
 */
export const withoutSecrets = (text: string, url: string): string => {
  let safe = text.replaceAll(url, '<connection string>');

  let password = '';

  try {
    password = new URL(url).password;
  } catch {
    // not a URL, so it has no password to find; the whole string is struck
    // out above either way
  }

  if (password) safe = safe.replaceAll(password, '<password>');

  return safe;
};
