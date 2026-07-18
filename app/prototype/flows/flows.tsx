"use client";

import { useState, useSyncExternalStore } from "react";
import { Icon, PinnedPhoto, Wordmark, type IconName } from "../prototype";
import styles from "./flows.module.css";

type Flow = "create" | "join" | "archive" | "states" | "photos";

const flows: { id: Flow; label: string }[] = [
  { id: "create", label: "Create" },
  { id: "join", label: "Join" },
  { id: "archive", label: "Archive" },
  { id: "states", label: "States" },
  { id: "photos", label: "Photos" },
];

function subscribeToTheme(onChange: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerTheme() {
  return false;
}

function ReviewBar({ flow, setFlow, dark, setDark }: { flow: Flow; setFlow: (flow: Flow) => void; dark: boolean; setDark: (dark: boolean) => void }) {
  return (
    <div className={styles.reviewBar}>
      <div className={styles.reviewLabel}><span />Flow prototype</div>
      <nav>{flows.map((item) => <button key={item.id} className={flow === item.id ? styles.selected : ""} onClick={() => setFlow(item.id)}>{item.label}</button>)}</nav>
      <button className={styles.themeButton} onClick={() => setDark(!dark)} aria-label="Toggle theme"><Icon name={dark ? "sun" : "moon"} size={17} /></button>
    </div>
  );
}

function ProductHeader({ action }: { action?: React.ReactNode }) {
  return <header className={styles.productHeader}><Wordmark /><div>{action}</div></header>;
}

function CreateFlow() {
  const [mode, setMode] = useState<"host" | "community">("host");
  return (
    <div className={styles.productPage}>
      <ProductHeader action={<button className={styles.iconButton} aria-label="Close"><Icon name="close" /></button>} />
      <main className={styles.wizard}>
        <div className={styles.wizardProgress}><span>2 / 5</span><div><i /><i /><i /><i /><i /></div><small>Room setup</small></div>
        <section className={styles.wizardCard}>
          <p className={styles.eyebrow}>How decisions get made</p>
          <h1>Who should lead<br />this <em>moment?</em></h1>
          <p className={styles.intro}>This choice stays with the room. It can&apos;t be changed after you create it.</p>
          <div className={styles.modeChoices}>
            <button className={mode === "host" ? styles.activeChoice : ""} onClick={() => setMode("host")}>
              <span className={styles.choiceIcon}><Icon name="members" size={22} /></span>
              <span><strong>Host-led</strong><small>A host and admins guide the room.</small></span>
              <i />
            </button>
            <button className={mode === "community" ? styles.activeChoice : ""} onClick={() => setMode("community")}>
              <span className={styles.choiceIcon}><Icon name="heart" size={22} /></span>
              <span><strong>Community-led</strong><small>Members make decisions together by vote.</small></span>
              <i />
            </button>
          </div>
          <div className={styles.wizardFooter}><button className={styles.backText}>Back</button><button className={styles.primaryButton}>Continue <Icon name="arrow" /></button></div>
        </section>
      </main>
    </div>
  );
}

function JoinFlow() {
  return (
    <div className={styles.productPage}>
      <ProductHeader action={<button className={styles.textButton}>Log in</button>} />
      <main className={styles.joinLayout}>
        <section className={styles.invitationCard}>
          <div className={styles.inviteMeta}><span>Private invitation</span><time>Ends in 2h 41m</time></div>
          <div className={styles.inviteArt}>
            <PinnedPhoto variant="one" className={styles.invitePhotoOne} />
            <PinnedPhoto variant="three" className={styles.invitePhotoTwo} />
            <span className={styles.inviteNote}>after the rain</span>
          </div>
          <div className={styles.inviteCopy}><p>YOU&apos;RE INVITED TO</p><h1>After the rain</h1><span>Rain stopped. Nobody wanted to go home yet.</span></div>
          <div className={styles.invitePeople}><small>Up to 10 people</small><span>Private room</span></div>
        </section>
        <section className={styles.joinForm}>
          <p className={styles.eyebrow}>Step inside</p>
          <h2>How should everyone<br /><em>know you?</em></h2>
          <label>Name</label><div className={styles.inputField}>Avery Morgan</div>
          <label>Choose an avatar</label>
          <div className={styles.avatarChoices}><button className={styles.avatarSelected}>AM</button><button>A</button><button>○</button><button><Icon name="plus" size={16} /></button></div>
          <button className={styles.joinButton}>Join this room <Icon name="arrow" /></button>
          <p className={styles.privacyNote}>Your name and avatar are visible only inside this room.</p>
        </section>
      </main>
    </div>
  );
}

function ArchiveFlow() {
  return (
    <div className={styles.productPage}>
      <ProductHeader action={<div className={styles.headerCluster}><button className={styles.iconButton}><Icon name="share" /></button><button className={styles.avatarButton}>AM</button></div>} />
      <main className={styles.archiveLayout}>
        <section className={styles.archiveIntro}>
          <p className={styles.eyebrow}>Archived · July 14, 2026</p>
          <h1>A moment,<br /><em>kept close.</em></h1>
          <p>After the rain</p>
          <div className={styles.archiveFacts}><span>7 people</span><span>18 photos</span><span>4h 16m together</span></div>
          <button className={styles.primaryButton}>Open the room <Icon name="arrow" /></button>
        </section>
        <section className={styles.archiveBoard}>
          <div className={styles.archiveFrame}>
            <PinnedPhoto variant="one" className={styles.archivePhotoOne} />
            <PinnedPhoto variant="two" className={styles.archivePhotoTwo} />
            <PinnedPhoto variant="three" className={styles.archivePhotoThree} />
            <PinnedPhoto variant="four" className={styles.archivePhotoFour} />
            <span className={styles.archiveNote}>don&apos;t rush<br />this part.</span>
            <span className={styles.archiveLine}>After the rain</span>
          </div>
          <div className={styles.archiveTabs}><span><Icon name="chat" />Chat</span><span><Icon name="board" />Board</span><span><Icon name="calendar" />Itinerary</span></div>
        </section>
      </main>
    </div>
  );
}

function StateCard({ icon, eyebrow, title, text, action, kind }: { icon: IconName; eyebrow: string; title: string; text: string; action?: string; kind: string }) {
  return (
    <article className={`${styles.stateCard} ${styles[kind]}`}>
      <span className={styles.stateIcon}><Icon name={icon} size={23} /></span>
      <p className={styles.eyebrow}>{eyebrow}</p><h2>{title}</h2><p>{text}</p>
      {action ? <button>{action}<Icon name="arrow" /></button> : <span className={styles.stateProgress}><i /></span>}
    </article>
  );
}

function StatesFlow() {
  return (
    <div className={styles.productPage}>
      <ProductHeader />
      <main className={styles.statesLayout}>
        <header><p className={styles.eyebrow}>Room states</p><h1>Clear, even when<br /><em>the moment changes.</em></h1></header>
        <div className={styles.stateGrid}>
          <StateCard icon="board" eyebrow="Preserving your room" title="The moment is being kept." text="Photos and messages are becoming a read-only archive. This usually takes a few seconds." kind="preserving" />
          <StateCard icon="close" eyebrow="Access ended" title="This room is no longer available." text="You were removed from the room. Its content and future archive are no longer accessible." action="Return to rooms" kind="ended" />
          <StateCard icon="plus" eyebrow="25 of 25 photos" title="The board is full for now." text="Keep the room as it is, or add more space for everyone in this room." action="See room options" kind="quota" />
        </div>
      </main>
    </div>
  );
}

const photoItems: { variant: "one" | "two" | "three" | "four"; time: string; note: string }[] = [
  { variant: "one", time: "6:48 PM", note: "the air after the rain" },
  { variant: "two", time: "7:02 PM", note: "nobody left" },
  { variant: "three", time: "7:16 PM", note: "that light" },
  { variant: "four", time: "7:31 PM", note: "one long table" },
  { variant: "two", time: "7:44 PM", note: "stay a little longer" },
  { variant: "one", time: "8:03 PM", note: "the last dry chair" },
];

function PhotosFlow() {
  const [selected, setSelected] = useState(2);
  const [detailOpen, setDetailOpen] = useState(false);
  const item = photoItems[selected];
  return (
    <div className={styles.photosPage}>
      <header className={styles.photosHeader}><div><Wordmark /><span>/ After the rain</span></div><button><Icon name="board" />Back to board</button></header>
      <main className={styles.photosLayout}>
        <section className={styles.sequenceSection}>
          <div className={styles.sequenceTitle}><div><p className={styles.eyebrow}>18 moments · Upload order</p><h1>In the order<br /><em>it happened.</em></h1></div><span>July 14</span></div>
          <div className={styles.photoGrid}>{photoItems.map((photo, index) => <button key={`${photo.time}-${index}`} className={selected === index ? styles.photoSelected : ""} onClick={() => { setSelected(index); setDetailOpen(true); }}><PinnedPhoto variant={photo.variant} className={styles.sequencePhoto} /><span><time>{photo.time}</time><small>{photo.note}</small></span></button>)}</div>
        </section>
        <aside className={`${styles.photoDetail} ${detailOpen ? styles.detailOpen : ""}`}>
          <button className={styles.detailClose} onClick={() => setDetailOpen(false)} aria-label="Close photo details"><Icon name="close" /></button>
          <div className={styles.detailImage}><PinnedPhoto variant={item.variant} className={styles.detailPhoto} /></div>
          <div className={styles.detailContent}>
            <div className={styles.detailAuthor}><span>M</span><div><strong>Maya</strong><small>{item.time}</small></div><button><Icon name="more" /></button></div>
            <p className={styles.detailNote}>{item.note}</p>
            <div className={styles.reactions}><button>♡ 4</button><button>☺ 2</button><button>+</button></div>
            <div className={styles.comments}><p><strong>Jon</strong>This one feels like the whole night.</p><p><strong>Avery</strong>Keep it exactly here.</p></div>
            <div className={styles.commentField}><span>Add a comment...</span><button><Icon name="send" size={16} /></button></div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export function FlowPrototype() {
  const systemDark = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);
  const [themeOverride, setThemeOverride] = useState<boolean | null>(null);
  const [flow, setFlow] = useState<Flow>("create");
  const dark = themeOverride ?? systemDark;

  return (
    <div className={`${styles.prototype} ${dark ? styles.dark : ""}`}>
      <ReviewBar flow={flow} setFlow={setFlow} dark={dark} setDark={setThemeOverride} />
      <div className={styles.viewport}>{flow === "create" ? <CreateFlow /> : flow === "join" ? <JoinFlow /> : flow === "archive" ? <ArchiveFlow /> : flow === "states" ? <StatesFlow /> : <PhotosFlow />}</div>
    </div>
  );
}
