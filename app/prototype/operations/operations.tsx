"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon, Wordmark, type IconName } from "../prototype";
import styles from "./operations.module.css";

type Screen =
  | "auth"
  | "approval"
  | "share"
  | "members"
  | "vote"
  | "plan"
  | "settings"
  | "upgrade"
  | "account"
  | "legal";

const screens: { id: Screen; label: string }[] = [
  { id: "auth", label: "Auth" },
  { id: "approval", label: "Approval" },
  { id: "share", label: "Share" },
  { id: "members", label: "Members" },
  { id: "vote", label: "Vote" },
  { id: "plan", label: "Plan" },
  { id: "settings", label: "Settings" },
  { id: "upgrade", label: "Room options" },
  { id: "account", label: "Account" },
  { id: "legal", label: "Legal" },
];

function subscribeToTheme(onChange: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function ReviewBar({ screen, setScreen, dark, setDark }: { screen: Screen; setScreen: (screen: Screen) => void; dark: boolean; setDark: (dark: boolean) => void }) {
  return (
    <div className={styles.reviewBar}>
      <div className={styles.reviewLabel}><span />Operations prototype</div>
      <nav aria-label="Prototype screens">
        {screens.map((item) => <button key={item.id} className={screen === item.id ? styles.selected : ""} onClick={() => setScreen(item.id)}>{item.label}</button>)}
      </nav>
      <button className={styles.themeButton} onClick={() => setDark(!dark)} aria-label="Toggle theme"><Icon name={dark ? "sun" : "moon"} size={17} /></button>
    </div>
  );
}

function Header({ title, icon = "close", trailing }: { title?: string; icon?: IconName; trailing?: ReactNode }) {
  return (
    <header className={styles.header}>
      <button className={styles.headerIcon} aria-label="Close"><Icon name={icon} /></button>
      {title ? <strong>{title}</strong> : <Wordmark />}
      <div className={styles.headerTrailing}>{trailing}</div>
    </header>
  );
}

function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: ReactNode; copy: string }) {
  return <div className={styles.pageIntro}><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{copy}</p></div>;
}

function PrimaryButton({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <button className={`${styles.primaryButton} ${light ? styles.lightButton : ""}`}>{children}<Icon name="arrow" /></button>;
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return <button className={`${styles.toggle} ${active ? styles.toggleOn : ""}`} onClick={onClick} aria-label={active ? "Turn off" : "Turn on"}><i /></button>;
}

function AuthScreen() {
  const [sent, setSent] = useState(false);
  return (
    <div className={styles.productPage}>
      <Header />
      <main className={styles.authLayout}>
        <section className={styles.authEditorial}>
          <p className={styles.eyebrow}>Keep your place in the room</p>
          <h1>The moment knows<br /><em>it&apos;s you.</em></h1>
          <p>Log in to pin photos, vote, and keep this room after it ends. Your guest identity and everything you&apos;ve already done will come with you.</p>
          <div className={styles.identityPreview}><span>AM</span><div><strong>Avery Morgan</strong><small>Guest identity in “After the rain”</small></div><Icon name="check" /></div>
        </section>
        <section className={styles.authCard}>
          <div className={styles.authMark}>E</div>
          <h2>{sent ? "Check your email." : "Welcome to EventSpace."}</h2>
          <p>{sent ? "We sent a secure sign-in link to avery@example.com. It expires in 10 minutes." : "No password to remember. Continue with Google or use a secure email link."}</p>
          {sent ? <>
            <div className={styles.mailSent}><Icon name="mail" size={25} /><span>avery@example.com</span><small>Link sent just now</small></div>
            <button className={styles.secondaryFull} onClick={() => setSent(false)}>Use a different email</button>
          </> : <>
            <button className={styles.googleButton}><span>G</span>Continue with Google</button>
            <div className={styles.orLine}><span>or</span></div>
            <label>Email address</label><div className={styles.input}>avery@example.com</div>
            <button className={styles.darkFull} onClick={() => setSent(true)}>Email me a sign-in link <Icon name="arrow" /></button>
          </>}
          <label className={styles.consent}><span><Icon name="check" size={13} /></span><p>I&apos;m at least 16 and agree to the <u>Terms</u> and <u>Privacy Policy</u>.</p></label>
        </section>
      </main>
    </div>
  );
}

const applicants = [
  { initials: "LP", name: "Leah Park", note: "Maya sent me the link — I’m bringing the film camera.", time: "Now" },
  { initials: "NS", name: "Noah Stone", note: "Jon invited me from the dinner group.", time: "4m" },
  { initials: "EK", name: "Emi K.", note: "Here for the riverside walk.", time: "9m" },
];

function ApprovalScreen() {
  const [waiting, setWaiting] = useState(false);
  return (
    <div className={styles.productPage}>
      <Header title="Entry requests" icon="members" trailing={<button className={styles.avatar}>AM</button>} />
      {waiting ? <main className={styles.waitingLayout}>
        <div className={styles.waitingPulse}><span>LP</span><i /><i /></div>
        <p className={styles.eyebrow}>Request sent</p><h1>Someone inside<br /><em>will let you in.</em></h1>
        <p>The host or an admin can see your name, avatar, and note. Keep this page open and we&apos;ll bring you in automatically.</p>
        <div className={styles.waitingRoom}><strong>After the rain</strong><span>Private room · Ends in 2h 41m</span></div>
        <button className={styles.textAction} onClick={() => setWaiting(false)}>View host approval state</button>
      </main> : <main className={styles.approvalLayout}>
        <section>
          <PageIntro eyebrow="3 waiting" title={<>Who gets to<br /><em>step inside?</em></>} copy="Review each note before allowing access. Requests stay private to the host and admins." />
          <button className={styles.textAction} onClick={() => setWaiting(true)}>View applicant waiting state</button>
        </section>
        <section className={styles.requestList}>
          {applicants.map((person, index) => <article key={person.name} className={index === 0 ? styles.requestActive : ""}>
            <span className={styles.personAvatar}>{person.initials}</span><div><strong>{person.name}</strong><p>{person.note}</p><small>{person.time}</small></div>
            <div className={styles.requestActions}><button aria-label={`Decline ${person.name}`}><Icon name="close" /></button><button aria-label={`Approve ${person.name}`}><Icon name="check" /></button></div>
          </article>)}
        </section>
      </main>}
    </div>
  );
}

function QrMark() {
  const cells = [0,1,2,3,4,5,6,8,10,12,14,16,18,20,22,24,25,26,28,30,31,32,34,36,38,40,42,44,46,48,49,50,51,52,53,54,56,58,60,62,64,66,68,70,72,74,76,78,80];
  return <svg className={styles.qr} viewBox="0 0 9 9" aria-label="Room QR code">{cells.map((cell) => <rect key={cell} x={cell % 9} y={Math.floor(cell / 9)} width="1" height="1" />)}</svg>;
}

function ShareScreen() {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  return (
    <div className={styles.productPage}>
      <Header title="Invite people" icon="share" />
      <main className={styles.shareLayout}>
        <section className={styles.shareHero}>
          <p className={styles.eyebrow}>After the rain</p><h1>Bring the right<br /><em>people closer.</em></h1>
          <p>Anyone with an active invitation can request to join. Entry approval is on.</p>
          <div className={styles.shareFacts}><span><Icon name="lock" />Private</span><span><Icon name="shield" />Approval required</span></div>
        </section>
        <section className={styles.qrCard}><div className={styles.qrWrap}><QrMark /><span className={styles.qrLogo}>E</span></div><strong>Scan to request entry</strong><small>QR codes always open the current room link.</small><button><Icon name="share" />Share QR</button></section>
        <section className={styles.shareMethods}>
          <article><div><span className={styles.methodIcon}><Icon name="copy" /></span><p><strong>Room link</strong><small>eventspace.app/join/after-rain-7k2</small></p></div><button onClick={() => setCopied("link")}>{copied === "link" ? <Icon name="check" /> : "Copy"}</button></article>
          <article><div><span className={styles.methodIcon}><strong>7K2P</strong></span><p><strong>Invite code</strong><small>Doesn&apos;t expire unless you replace it.</small></p></div><button onClick={() => setCopied("code")}>{copied === "code" ? <Icon name="check" /> : "Copy"}</button></article>
          <article><div><span className={styles.methodIcon}><Icon name="share" /></span><p><strong>Refresh link and QR</strong><small>Creates a new room link. The invite code stays active.</small></p></div><button>Refresh</button></article>
          <article className={styles.dangerMethod}><div><span className={styles.methodIcon}><Icon name="trash" /></span><p><strong>Revoke invite code</strong><small>7K2P stops working. The room link stays active.</small></p></div><button>Revoke</button></article>
        </section>
      </main>
    </div>
  );
}

const members = [
  { initials: "AM", name: "Avery Morgan", role: "Host", status: "You" },
  { initials: "M", name: "Maya Lin", role: "Admin", status: "Signed-in member" },
  { initials: "J", name: "Jon Bell", role: "Member", status: "Signed-in member" },
  { initials: "R", name: "Rae Kim", role: "Member", status: "Signed-in member" },
  { initials: "LP", name: "Leah Park", role: "Member", status: "Guest identity" },
];

function MembersScreen() {
  const [selected, setSelected] = useState(2);
  const [panel, setPanel] = useState<"actions" | "report">("actions");
  const person = members[selected];
  return (
    <div className={styles.productPage}>
      <Header title="People · 7" icon="members" trailing={<button className={styles.headerTextButton}>Invite</button>} />
      <main className={styles.membersLayout}>
        <section className={styles.memberColumn}>
          <div className={styles.searchField}><Icon name="search" /><span>Search people</span></div>
          <p className={styles.sectionLabel}>In this room</p>
          <div className={styles.memberList}>{members.map((member, index) => <button key={member.name} className={selected === index ? styles.memberSelected : ""} onClick={() => { setSelected(index); setPanel("actions"); }}><span className={styles.personAvatar}>{member.initials}</span><span><strong>{member.name}</strong><small>{member.status}</small></span><em>{member.role}</em><Icon name="chevron" /></button>)}</div>
          <div className={styles.blockedRow}><Icon name="lock" /><span><strong>Blocked people</strong><small>2 devices prevented from rejoining</small></span><Icon name="chevron" /></div>
        </section>
        <aside className={styles.memberDetail}>
          <div className={styles.memberHero}><span>{person.initials}</span><h2>{person.name}</h2><p>{person.role} · This room only</p></div>
          {panel === "report" ? <div className={styles.reportPanel}>
            <button className={styles.backInline} onClick={() => setPanel("actions")}><Icon name="arrow" />Back</button><p className={styles.eyebrow}>Private moderation reply</p><h3>Reply to Maya&apos;s report</h3><div className={styles.reportQuote}><strong>Description from Maya</strong><p>Jon&apos;s message in Chat felt targeted. Please review the conversation around this time.</p><small>Location supplied by reporter · Chat · around 6:42 PM</small></div><label>Reply</label><div className={styles.textArea}>Thanks — I’ve reviewed your report and handled this inside the room.</div><button className={styles.darkFull}>Send private reply</button>
          </div> : <div className={styles.memberActions}>
            <button><span><Icon name="shield" /><strong>Make administrator</strong></span><Icon name="chevron" /></button>
            <button><span><Icon name="voice" /><strong>Mute in this room</strong></span><Icon name="chevron" /></button>
            <button onClick={() => setPanel("report")}><span><Icon name="flag" /><strong>Review report involving Jon</strong></span><b>1</b></button>
            <button className={styles.dangerAction}><span><Icon name="close" /><strong>Remove from room</strong></span><Icon name="chevron" /></button>
            <button className={styles.dangerAction}><span><Icon name="lock" /><strong>Block device and re-entry</strong></span><Icon name="chevron" /></button>
          </div>}
        </aside>
      </main>
    </div>
  );
}

function VoteScreen() {
  const [anonymous, setAnonymous] = useState(false);
  const [selected, setSelected] = useState(0);
  return (
    <div className={styles.productPage}>
      <Header title="New vote" icon="close" trailing={<button className={styles.headerTextButton}>Save draft</button>} />
      <main className={styles.voteLayout}>
        <section className={styles.voteComposer}>
          <PageIntro eyebrow="Community decision" title={<>Ask the room.<br /><em>Make it clear.</em></>} copy="A simple majority decides. The final count remains visible in the room." />
          <label>Question</label><div className={styles.inputStrong}>Move dinner to 8:30?</div>
          <label>Choices</label>
          <div className={styles.choiceInputs}><div><span>1</span>Yes, take it slow<Icon name="more" /></div><div><span>2</span>Keep it at 8:00<Icon name="more" /></div><button><Icon name="plus" />Add a choice</button></div>
          <div className={styles.voteSettings}><div><span><strong>Anonymous vote</strong><small>{anonymous ? "Names stay hidden" : "Everyone can see who voted"}</small></span><Toggle active={anonymous} onClick={() => setAnonymous(!anonymous)} /></div><div><span><strong>Voting closes</strong><small>In 30 minutes</small></span><button className={styles.valueButton}>30 min <Icon name="chevron" /></button></div></div>
          <PrimaryButton>Start vote</PrimaryButton>
        </section>
        <aside className={styles.votePreview}>
          <p className={styles.eyebrow}>Room preview</p><article><div><span>Community vote</span><time>29m left</time></div><h2>Move dinner to 8:30?</h2>{["Yes, take it slow", "Keep it at 8:00"].map((choice, index) => <button key={choice} className={selected === index ? styles.voteSelected : ""} onClick={() => setSelected(index)}><span><i style={{ width: index === 0 ? "67%" : "33%" }} /></span><strong>{choice}</strong><b>{index === 0 ? 4 : 2}</b></button>)}<p>6 of 7 votes · 4 needed to pass</p><small>{anonymous ? "Votes are anonymous" : "Voters are visible to room members"}</small></article>
        </aside>
      </main>
    </div>
  );
}

function PlanScreen() {
  const [status, setStatus] = useState<"Not started" | "In progress" | "Completed">("In progress");
  const [attendance, setAttendance] = useState("Going");
  return (
    <div className={styles.productPage}>
      <Header title="Itinerary" icon="calendar" trailing={<button className={styles.headerTextButton}>Edit</button>} />
      <main className={styles.planLayout}>
        <section className={styles.planLead}>
          <div className={styles.planTime}><time>7:00</time><span>PM</span><small>Today · July 14</small></div>
          <p className={styles.eyebrow}>First stop</p><h1>Meet by the<br /><em>lower entrance.</em></h1><p className={styles.planDescription}>Come down the riverside steps. Maya will wait by the stone wall until everyone arrives.</p>
          <div className={styles.planLocation}><span className={styles.locationMark}>R</span><div><strong>Riverside Walk</strong><small>Lower entrance · 8 min away</small></div><button>Open in Maps <Icon name="arrow" /></button></div>
        </section>
        <aside className={styles.planSide}>
          <section><p className={styles.sectionLabel}>Status · Responsible person, Host or Admin</p><div className={styles.statusOptions}>{(["Not started", "In progress", "Completed"] as const).map((item) => <button key={item} className={status === item ? styles.statusSelected : ""} onClick={() => setStatus(item)}><i />{item}</button>)}</div></section>
          <section><p className={styles.sectionLabel}>Led by</p><div className={styles.leaderRow}><span className={styles.personAvatar}>M</span><div><strong>Maya Lin</strong><small>Administrator · Current device</small></div><Icon name="chevron" /></div></section>
          <section><p className={styles.sectionLabel}>Your response · 6 of 7 going</p><div className={styles.attendance}>{["Going", "Not going", "Checked in"].map((item) => <button key={item} className={attendance === item ? styles.attendanceSelected : ""} onClick={() => setAttendance(item)}>{item === "Checked in" && <Icon name="check" />}{item}</button>)}</div><div className={styles.capacityLine}><span><i /></span><small>6 places filled · 1 remaining</small></div></section>
          <section><p className={styles.sectionLabel}>Reminder</p><div className={styles.settingRow}><span><strong>15 minutes before</strong><small>Browser notification</small></span><Toggle active={true} onClick={() => undefined} /></div></section>
        </aside>
      </main>
    </div>
  );
}

function SettingsScreen() {
  const [approval, setApproval] = useState(true);
  const [push, setPush] = useState(true);
  return (
    <div className={styles.productPage}>
      <Header title="Room settings" icon="more" trailing={<button className={styles.headerTextButton}>Done</button>} />
      <main className={styles.settingsLayout}>
        <PageIntro eyebrow="After the rain" title={<>Shape the room,<br /><em>while it&apos;s live.</em></>} copy="Only the host can change duration or end the room. Admins can help with invitations and people." />
        <div className={styles.settingsColumns}>
          <section className={styles.settingsCard}><p className={styles.sectionLabel}>Access</p><div className={styles.settingRow}><span><strong>Private invitation</strong><small>Only people with a link or code</small></span><Icon name="lock" /></div><div className={styles.settingRow}><span><strong>Approve entry requests</strong><small>Host and admins review each request</small></span><Toggle active={approval} onClick={() => setApproval(!approval)} /></div><div className={styles.settingRow}><span><strong>Invite code</strong><small>7K2P · Active</small></span><button className={styles.valueButton}>Manage <Icon name="chevron" /></button></div></section>
          <section className={styles.settingsCard}><p className={styles.sectionLabel}>Room limits</p><div className={styles.settingRow}><span><strong>Ends at</strong><small>Today</small></span><button className={styles.valueButton}>10:30 PM <Icon name="chevron" /></button></div><div className={styles.settingRow}><span><strong>Member limit</strong><small>7 of 10 places used</small></span><button className={styles.valueButton}>10 <Icon name="chevron" /></button></div><div className={styles.settingRow}><span><strong>Photo space</strong><small>18 of 25 used</small></span><button className={styles.valueButton}>View options <Icon name="chevron" /></button></div></section>
          <section className={styles.settingsCard}><p className={styles.sectionLabel}>Notifications</p><div className={styles.settingRow}><span><strong>Room activity</strong><small>New votes and itinerary reminders</small></span><Toggle active={push} onClick={() => setPush(!push)} /></div><div className={styles.settingRow}><span><strong>Time zone</strong><small>Used for every room time</small></span><button className={styles.valueButton}>Taipei · GMT+8 <Icon name="chevron" /></button></div></section>
          <section className={`${styles.settingsCard} ${styles.dangerCard}`}><p className={styles.sectionLabel}>Host controls</p><button><span><strong>Transfer host role</strong><small>The new host controls time and ending.</small></span><Icon name="chevron" /></button><button><span><strong>End and archive room</strong><small>Freezes the room immediately for everyone.</small></span><Icon name="arrow" /></button></section>
        </div>
      </main>
    </div>
  );
}

function UpgradeScreen() {
  const [option, setOption] = useState<"space" | "forever">("forever");
  return (
    <div className={styles.productPage}>
      <Header title="Room options" icon="plus" />
      <main className={styles.upgradeLayout}>
        <section className={styles.upgradeIntro}><p className={styles.eyebrow}>One room · One-time payment</p><h1>Give this moment<br /><em>what it needs.</em></h1><p>Options belong to this room, not one person. Everyone in the final archive receives the same room benefits.</p><div className={styles.noSubscription}><Icon name="check" /><span><strong>No personal subscription</strong><small>Pay only when a room needs more.</small></span></div></section>
        <section className={styles.optionGrid}>
          <button className={option === "space" ? styles.optionSelected : ""} onClick={() => setOption("space")}><span className={styles.optionNumber}>01</span><div><p>Live room expansion</p><h2>More room<br />for tonight.</h2><ul><li>Higher member limit</li><li>More board photos</li><li>Longer live duration</li></ul></div><i /></button>
          <button className={option === "forever" ? styles.optionSelected : ""} onClick={() => setOption("forever")}><span className={styles.optionNumber}>02</span><div><p>Permanent archive</p><h2>Keep this room,<br />without an end date.</h2><ul><li>One-time archive purchase</li><li>Available to every eligible member</li><li>Independent of live-room limits</li></ul></div><i /></button>
          <div className={styles.checkoutSummary}><div><span>Selected for</span><strong>After the rain</strong></div><p>Final pricing and exact limits remain configurable for launch.</p><PrimaryButton>Continue to secure checkout</PrimaryButton><small><Icon name="shield" size={14} />Payment handled by our checkout provider</small></div>
        </section>
      </main>
    </div>
  );
}

function AccountScreen() {
  const [theme, setTheme] = useState("System");
  return (
    <div className={styles.productPage}>
      <Header title="Account" icon="close" />
      <main className={styles.accountLayout}>
        <section className={styles.profileCard}><span className={styles.profileAvatar}>AM</span><div><p className={styles.eyebrow}>Your identity</p><h1>Avery Morgan</h1><span>avery@example.com</span></div><button>Edit profile</button></section>
        <section className={styles.accountSections}>
          <div className={styles.accountCard}><p className={styles.sectionLabel}>Appearance</p><div className={styles.themeChoices}>{["Light", "Dark", "System"].map((item) => <button key={item} className={theme === item ? styles.themeSelected : ""} onClick={() => setTheme(item)}><span className={`${styles.themeSwatch} ${styles[`theme${item}`]}`} /><strong>{item}</strong><i /></button>)}</div></div>
          <div className={styles.accountCard}><p className={styles.sectionLabel}>Your rooms</p><button className={styles.accountRow}><span><Icon name="board" /><span><strong>Archived rooms</strong><small>4 moments kept</small></span></span><Icon name="chevron" /></button><button className={styles.accountRow}><span><Icon name="clock" /><span><strong>Archive retention</strong><small>Free archives are kept for 30 days</small></span></span><Icon name="chevron" /></button></div>
          <div className={styles.accountCard}><p className={styles.sectionLabel}>Privacy and access</p><button className={styles.accountRow}><span><Icon name="shield" /><span><strong>Privacy settings</strong><small>Notifications, devices, and data</small></span></span><Icon name="chevron" /></button><button className={styles.accountRow}><span><Icon name="mail" /><span><strong>Sign-in email</strong><small>avery@example.com</small></span></span><Icon name="chevron" /></button></div>
          <div className={`${styles.accountCard} ${styles.accountDanger}`}><button className={styles.accountRow}><span><Icon name="close" /><span><strong>Sign out</strong><small>Guest identities on this device stay protected.</small></span></span><Icon name="arrow" /></button><button className={styles.accountRow}><span><Icon name="trash" /><span><strong>Delete account</strong><small>Review what will be removed first.</small></span></span><Icon name="arrow" /></button></div>
        </section>
      </main>
    </div>
  );
}

const legalItems = ["Terms of Service", "Privacy Policy", "Community Rules", "Cookie Notice", "Support"];

function LegalScreen() {
  const [selected, setSelected] = useState(0);
  return (
    <div className={styles.productPage}>
      <Header />
      <main className={styles.legalLayout}>
        <aside><p className={styles.eyebrow}>EventSpace legal</p><h1>Clear terms.<br /><em>Plain language.</em></h1><nav>{legalItems.map((item, index) => <button key={item} className={selected === index ? styles.legalSelected : ""} onClick={() => setSelected(index)}><span>0{index + 1}</span>{item}<Icon name="chevron" /></button>)}</nav><small>Last updated July 14, 2026 · English (US)</small></aside>
        <article className={styles.legalDocument}>
          <p className={styles.eyebrow}>0{selected + 1} · Effective July 14, 2026</p><h2>{legalItems[selected]}</h2><p className={styles.legalLead}>{selected === 1 ? "How EventSpace collects, protects, and uses the information needed to run private temporary rooms." : "The shared expectations that keep EventSpace private, temporary, and respectful."}</p>
          <section><h3>In short</h3><p>EventSpace is built for invited groups sharing a limited-time room. We use the minimum account and room information needed to operate the service, protect access, and preserve archives chosen by eligible members.</p></section>
          <section><h3>Your room, your choices</h3><p>Room creators choose access rules, duration, and limits before the room begins. Host-led and community-led rooms use different decision rules that cannot be switched later.</p></section>
          <section><h3>Privacy and encryption</h3><p>Data is encrypted while moving across the network and while stored by our infrastructure. This first release uses managed encryption and does not claim strict end-to-end encryption.</p></section>
          <section><h3>Questions</h3><p>Contact support before relying on EventSpace for content that requires specialized legal, medical, or regulated confidentiality.</p></section>
        </article>
      </main>
    </div>
  );
}

function ScreenContent({ screen }: { screen: Screen }) {
  if (screen === "auth") return <AuthScreen />;
  if (screen === "approval") return <ApprovalScreen />;
  if (screen === "share") return <ShareScreen />;
  if (screen === "members") return <MembersScreen />;
  if (screen === "vote") return <VoteScreen />;
  if (screen === "plan") return <PlanScreen />;
  if (screen === "settings") return <SettingsScreen />;
  if (screen === "upgrade") return <UpgradeScreen />;
  if (screen === "account") return <AccountScreen />;
  return <LegalScreen />;
}

export function OperationsPrototype() {
  const systemDark = useSyncExternalStore(subscribeToTheme, getTheme, () => false);
  const [themeOverride, setThemeOverride] = useState<boolean | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");
  const dark = themeOverride ?? systemDark;

  return (
    <div className={`${styles.prototype} ${dark ? styles.dark : ""}`}>
      <ReviewBar screen={screen} setScreen={setScreen} dark={dark} setDark={setThemeOverride} />
      <div className={styles.viewport}><ScreenContent screen={screen} /></div>
    </div>
  );
}
