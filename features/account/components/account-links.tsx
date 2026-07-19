import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import styles from "./account-page.module.css";

const links = [
  { href: "/legal/terms", label: "Terms", detail: "Draft" },
  { href: "/legal/privacy", label: "Privacy", detail: "Draft" },
  { href: "/legal/guidelines", label: "Community rules", detail: "" },
  { href: "/legal/cookies", label: "Cookie notice", detail: "" },
] as const;

export function AccountLinks() {
  return (
    <nav className={`${styles.links} ${styles.reveal}`} aria-label="Legal and product information">
      <div className={styles.sectionHeading}><div><span>About</span><h2>Clear, quiet details.</h2></div></div>
      {links.map((item) => <Link href={item.href} key={item.href}><span>{item.label}{item.detail ? <small>{item.detail}</small> : null}</span><Icon name="chevron" size={16} /></Link>)}
    </nav>
  );
}
