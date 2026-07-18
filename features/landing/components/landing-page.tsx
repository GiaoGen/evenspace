import Link from "next/link";
import { AppHeader } from "@/components/app-header/app-header";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import styles from "./landing-page.module.css";

export function LandingPage() {
  return (
    <div className={styles.page}>
      <AppHeader wordmarkHref="/" actions={<><Link className={styles.login} href="/account">Log in</Link><Link className={styles.menu} href="/rooms" aria-label="Open your rooms"><Icon name="more" /></Link></>} />
      <main>
        <section className={styles.hero}>
          <div className={styles.art} aria-hidden="true">
            <PinnedPhoto variant="one" className={styles.photoOne} />
            <PinnedPhoto variant="two" className={styles.photoTwo} />
            <PinnedPhoto variant="three" className={styles.photoThree} />
            <div className={styles.planCard}><span>07:00 PM</span><strong>Meet by the river</strong><small>6 people are going</small></div>
            <div className={styles.chatCard}><b>M</b><p><strong>Maya</strong>Save me a seat?</p><time>6:42</time></div>
          </div>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Private rooms for shared moments</p>
            <h1>Make the moment<br />live <em>longer.</em></h1>
            <p className={styles.lead}>A temporary place to talk, pin photos, and keep the plan moving—then preserve it when the moment is over.</p>
            <div className={styles.actions}><Link className={styles.primary} href="/rooms/new">Create a room <Icon name="arrow" /></Link><Link className={styles.secondary} href="/join">Enter an invite code</Link></div>
          </div>
          <div className={styles.scrollCue}><i />Built for the moment</div>
        </section>
        <section className={styles.features}>
          <header><p className={styles.eyebrow}>One room, three spaces</p><h2>Everything the moment needs.<br /><em>Nothing it doesn&apos;t.</em></h2></header>
          <div className={styles.featureGrid}>
            <article><span>01</span><Icon name="chat" size={23} /><h3>Chat</h3><p>Keep every decision together, without letting photos disappear into the conversation.</p></article>
            <article><span>02</span><Icon name="board" size={23} /><h3>Board</h3><p>Pin the photos worth keeping. Arrange them freely, or revisit them in order.</p></article>
            <article><span>03</span><Icon name="calendar" size={23} /><h3>Itinerary</h3><p>Everyone knows what&apos;s next, who&apos;s leading, and where to go.</p></article>
          </div>
        </section>
      </main>
      <footer className={styles.footer}><strong>EventSpace</strong><span>Private by default. Temporary by design.</span><nav><Link href="/legal/privacy">Privacy</Link><Link href="/legal/terms">Terms</Link></nav></footer>
    </div>
  );
}
