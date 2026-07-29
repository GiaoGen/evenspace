export const avatarVariants = ["initials", "single", "ring"] as const;

export type AvatarVariant = (typeof avatarVariants)[number];

export function avatarTextFor(
  displayName: string,
  variant: AvatarVariant = "initials",
) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("") || "?";

  if (variant === "single") return initials.slice(0, 1);
  if (variant === "ring") return `○${initials.slice(0, 1)}`;
  return initials;
}
