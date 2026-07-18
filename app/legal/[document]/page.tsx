import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import styles from "./legal.module.css";

const documents = {
  terms: { title: "Terms of Service", intro: "The rules for creating and participating in private EventSpace rooms.", sections: ["16+ eligibility and account responsibility", "Room-level payments, capacity and refund boundaries", "Rights to shared messages, photos and notes", "Host governance, acceptable use and service limits"] },
  privacy: { title: "Privacy Policy", intro: "How EventSpace intends to handle identity, room content and operational data.", sections: ["Managed encryption, not end-to-end encryption", "Private room membership and signed media access", "Thirty-day free archives and deletion windows", "No advertising, data sale or third-party behavioral tracking"] },
  guidelines: { title: "Community Rules", intro: "Simple expectations for private moments shared with other people.", sections: ["Share only content you own or may share", "Respect room decisions and personal boundaries", "Use reports for clear, specific concerns", "Hosts may mute, remove or ban members within a room"] },
  cookies: { title: "Cookie Notice", intro: "EventSpace is designed to use only necessary session, security and preference storage.", sections: ["Authentication and anti-abuse session data", "Theme and product preferences", "No advertising cookies", "No cross-site behavioral profiles"] },
} as const;

export async function generateMetadata({ params }: { readonly params: Promise<{ document: string }> }): Promise<Metadata> { const doc = documents[(await params).document as keyof typeof documents]; return { title: doc?.title ?? "Legal", robots: { index: false, follow: false } }; }
export default async function LegalPage({ params }: { readonly params: Promise<{ document: string }> }) { const key = (await params).document as keyof typeof documents; const doc = documents[key]; if (!doc) notFound(); return <div className={styles.page}><header><Wordmark /><Link href="/account">Close</Link></header><main><p>Draft · Legal review required</p><h1>{doc.title}</h1><span>{doc.intro}</span><div className={styles.notice}>This is a local-first product draft, not final legal text or legal advice. Production launch remains blocked on jurisdiction-specific professional review.</div>{doc.sections.map((section,index) => <section key={section}><small>0{index+1}</small><h2>{section}</h2><p>The final document will explain this topic in plain language, including applicable choices, retention periods, limitations and contact paths. No broader promise is implied by this local static build.</p></section>)}</main></div>; }
