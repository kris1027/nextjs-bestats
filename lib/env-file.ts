/**
 * Editing a `.env` file as text, for `pnpm bootstrap`. Text rather than a
 * parse-and-rewrite so every comment, blank line and variable the script does
 * not name is left exactly where the person put it.
 */

const assignment = (key: string): RegExp => new RegExp(`^${key}=(.*)$`, 'm');

/** The value `key` is assigned in `text`, or `null` when it is unassigned or
 * assigned nothing — `KEY=` is the blank `.env.example` hands over, not a
 * value. */
export const envValue = (text: string, key: string): string | null => {
  const value = assignment(key).exec(text)?.[1]?.trim();

  return value ? value : null;
};

/** `text` with `key` assigned `value`: its line replaced where it has one,
 * and a line added at the end where it has none. */
export const withEnvValue = (
  text: string,
  key: string,
  value: string,
): string => {
  const line = `${key}=${value}`;

  if (assignment(key).test(text)) {
    // a function, so a `$` in the value is never read as a replacement pattern
    return text.replace(assignment(key), () => line);
  }

  const separator = text === '' || text.endsWith('\n') ? '' : '\n';

  return `${text}${separator}${line}\n`;
};
