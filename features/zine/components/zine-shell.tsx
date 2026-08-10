import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { zineSteps, type EditableZineStep, type ZineStep } from "../model/zine-draft";
import styles from "./zine-creator.module.css";

const stepLabels: Record<ZineStep, string> = {
  name: "Name",
  photos: "Photos",
  style: "Style",
  overview: "Overview",
  reader: "Reader",
};

export function ZineShell({
  step,
  canContinue,
  onBack,
  canNavigate,
  onNavigate,
  onSubmit,
  children,
}: {
  readonly step: EditableZineStep;
  readonly canContinue: boolean;
  readonly onBack: () => void;
  readonly canNavigate: (step: EditableZineStep) => boolean;
  readonly onNavigate: (step: EditableZineStep) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly children: ReactNode;
}) {
  const stepIndex = zineSteps.indexOf(step);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/rooms" aria-label="Close zine creation">
          <Icon name="close" size={17} />
        </Link>
        <strong>Create zine</strong>
        <span>Draft</span>
      </header>

      <nav className={styles.stepNavigation} aria-label="Zine creation progress">
        <ol>
          {zineSteps.map((item, index) => {
            const editable = item !== "reader";
            const available = editable && canNavigate(item);
            const selected = item === step;
            const completed = index < stepIndex;
            return (
              <li key={item} className={selected ? styles.currentStep : completed ? styles.completedStep : ""}>
                <button
                  type="button"
                  aria-current={selected ? "step" : undefined}
                  disabled={!available || (item === "photos" && !canContinue)}
                  onClick={() => available && onNavigate(item)}
                >
                  <i aria-hidden="true" />
                  <span>{stepLabels[item]}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <b>{stepIndex + 1} / {zineSteps.length}</b>
      </nav>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <main key={step} className={styles.stepContent}>{children}</main>
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            disabled={stepIndex === 0}
          >
            <Icon name="arrow" size={16} />
            <span>Back</span>
          </button>
          <button
            type="submit"
            className={styles.continueButton}
            disabled={!canContinue}
          >
            <span>{step === "overview" ? "Open reader" : "Continue"}</span>
            <Icon name="arrow" size={16} />
          </button>
        </footer>
      </form>
    </div>
  );
}
