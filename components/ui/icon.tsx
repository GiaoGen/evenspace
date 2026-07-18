export type IconName =
  | "arrow"
  | "board"
  | "camera"
  | "calendar"
  | "chat"
  | "check"
  | "chevron"
  | "close"
  | "draw"
  | "grid"
  | "heart"
  | "home"
  | "image"
  | "list"
  | "members"
  | "minus"
  | "more"
  | "plus"
  | "search"
  | "send"
  | "share"
  | "text"
  | "voice";

export function Icon({ name, size = 18 }: { readonly name: IconName; readonly size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    board: <><rect x="3.5" y="4" width="17" height="16" rx="3" /><path d="m8 15 2.8-3 2.1 2 2.9-3.3L19 15" /><circle cx="8.5" cy="8.5" r="1" /></>,
    camera: <><path d="M8.5 6.5 10 4h4l1.5 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3.5Z" /><circle cx="12" cy="13" r="3.5" /></>,
    calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="3" /><path d="M8 3.5v4M16 3.5v4M3.5 10h17" /></>,
    chat: <path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.6-.8L4 20l1.4-4a7.3 7.3 0 0 1-.9-3.5A7.5 7.5 0 0 1 12 5h.5A7.5 7.5 0 0 1 20 11.5Z" />,
    check: <path d="m5 12.5 4.2 4.2L19 7" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    draw: <><path d="M4 20c4.5-1.2 3.4-5.8 6.6-5.8 2.1 0 2.6 1.9 4.6 1.9 1.4 0 2.7-.8 4.8-3.1" /><path d="m14.2 5.3 4.5 4.5" /><path d="m13.2 13.1-3.8 1.2 1.2-3.8 6.9-6.9a1.8 1.8 0 0 1 2.5 0l.4.4a1.8 1.8 0 0 1 0 2.5l-7.2 6.6Z" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
    heart: <path d="M20.8 8.7c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" />,
    home: <><path d="m4 10 8-6 8 6" /><path d="M6.5 9v10h11V9M10 19v-5h4v5" /></>,
    image: <><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="m7 16 3-3.2 2.4 2.2 3.2-3.9L20 16" /><circle cx="8.5" cy="9.5" r="1" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r=".7" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r=".7" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r=".7" fill="currentColor" stroke="none" /></>,
    members: <><circle cx="9" cy="8" r="3" /><path d="M3.8 19c.5-3.2 2.2-5 5.2-5s4.8 1.8 5.2 5" /><path d="M15 6.5a2.5 2.5 0 0 1 0 4.9M16 14c2.2.5 3.5 2.2 3.8 4.5" /></>,
    minus: <path d="M5 12h14" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    send: <><path d="m5 12 14-7-4 14-3-6-7-1Z" /><path d="m12 13 7-8" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></>,
    text: <><path d="M5 5h14M12 5v14M9 19h6" /></>,
    voice: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}
