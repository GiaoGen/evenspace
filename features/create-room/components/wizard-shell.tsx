import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { createRoomSteps, type CreateRoomStep } from "../model/create-room-machine";
import styles from "./create-room-wizard.module.css";

const labels: Record<CreateRoomStep, string> = { details: "Name", leadership: "Decisions", timing: "Time", access: "Access", review: "Review" };

export function WizardHeader({ title = "New room", returnLabel = "Cancel room creation" }: { readonly title?: string; readonly returnLabel?: string }) {
  return <header className={styles.header}><Link href="/rooms" aria-label={returnLabel}><Icon name="close" /></Link><strong>{title}</strong><span aria-hidden="true" /></header>;
}

export function WizardShell({ step, submitting, onBack, onSubmit, children }: { readonly step: CreateRoomStep; readonly submitting: boolean; readonly onBack: () => void; readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void; readonly children: ReactNode }) {
  const index = createRoomSteps.indexOf(step);
  return <div className={styles.page}>
    <WizardHeader />
    <div className={styles.progress} aria-label={`Step ${index + 1} of ${createRoomSteps.length}: ${labels[step]}`}><i style={{ transform: `scaleX(${(index + 1) / createRoomSteps.length})` }} /><span>{labels[step]}</span><b>{index + 1} / {createRoomSteps.length}</b></div>
    <form className={styles.wizard} onSubmit={onSubmit} noValidate>
      <main key={step} className={styles.step}>{children}</main>
      <footer className={styles.wizardFooter}>
        <button type="button" className={styles.back} onClick={onBack} disabled={index === 0 || submitting}><Icon name="arrow" /><span>Back</span></button>
        <button type="submit" className={styles.continue} disabled={submitting}><span>{submitting ? "Opening..." : step === "review" ? "Create room" : "Continue"}</span><Icon name={step === "review" ? "check" : "arrow"} /></button>
      </footer>
    </form>
  </div>;
}
