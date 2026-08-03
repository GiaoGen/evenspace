"use client";

export default function BookError({ reset }: { readonly reset: () => void }) {
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><section><h1>The book could not be opened.</h1><button type="button" onClick={reset}>Try again</button></section></main>;
}
