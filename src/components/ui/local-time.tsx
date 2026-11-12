"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * A timestamp in the viewer's own locale and time zone.
 *
 * The server can't know either, so it renders the time in UTC with a fixed
 * locale. After hydration the browser switches to local time. Both renders
 * start from the same markup, so React reports no hydration mismatch.
 */
export function LocalTime({ iso, dateOnly }: { iso: string; dateOnly?: boolean }) {
  const inBrowser = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const options: Intl.DateTimeFormatOptions = dateOnly
    ? { dateStyle: "medium" }
    : { dateStyle: "medium", timeStyle: "medium" };
  const date = new Date(iso);
  const text = inBrowser
    ? date.toLocaleString(undefined, options)
    : `${date.toLocaleString("en-US", { ...options, timeZone: "UTC" })}${dateOnly ? "" : " UTC"}`;
  return <time dateTime={iso}>{text}</time>;
}
