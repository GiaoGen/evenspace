import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import type { EditableZineStep } from "../model/zine-draft";
import styles from "./zine-creator.module.css";

export function ZineShell({
  step,
  canContinue,
  aiLayoutEnabled,
  onBack,
  canNavigate,
  onNavigate,
  onAiLayoutChange,
  onSubmit,
  children,
}: {
  readonly step: EditableZineStep;
  readonly canContinue: boolean;
  readonly aiLayoutEnabled: boolean;
  readonly onBack: () => void;
  readonly canNavigate: (step: EditableZineStep) => boolean;
  readonly onNavigate: (step: EditableZineStep) => void;
  readonly onAiLayoutChange: (enabled: boolean) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly children: ReactNode;
}) {
  const reviewStep: EditableZineStep = aiLayoutEnabled ? "overview" : "manual";
  const progressItems: readonly {
    readonly id: string;
    readonly label: string;
    readonly target: EditableZineStep | null;
  }[] = [
    { id: "name", label: "Name", target: "name" },
    { id: "photos", label: "Photos", target: "photos" },
    { id: "style", label: "Style", target: "style" },
    { id: "review", label: aiLayoutEnabled ? "Overview" : "Arrange", target: reviewStep },
    { id: "reader", label: "Reader", target: null },
  ];
  const stepIndex = step === "name" ? 0 : step === "photos" ? 1 : step === "style" ? 2 : 3;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/rooms" aria-label="Close zine creation">
          <Icon name="close" size={17} />
        </Link>
        <strong>Create zine</strong>
        <label className={styles.aiSwitch}>
          <span>AI layout</span>
          <input
            type="checkbox"
            checked={aiLayoutEnabled}
            onChange={(event) => onAiLayoutChange(event.currentTarget.checked)}
          />
          <i aria-hidden="true" />
        </label>
      </header>

      <nav className={styles.stepNavigation} aria-label="Zine creation progress">
        <ol>
          {progressItems.map((item, index) => {
            const available = item.target !== null && canNavigate(item.target);
            const selected = index === stepIndex;
            const completed = index < stepIndex;
            return (
              <li key={item.id} className={selected ? styles.currentStep : completed ? styles.completedStep : ""}>
                <button
                  type="button"
                  aria-current={selected ? "step" : undefined}
                  disabled={!available || (item.id === "photos" && !canContinue)}
                  onClick={() => item.target && available && onNavigate(item.target)}
                >
                  <i aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <b>{stepIndex + 1} / {progressItems.length}</b>
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
            <span>{step === "manual" || step === "overview" ? "Open reader" : "Continue"}</span>
            <Icon name="arrow" size={16} />
          </button>
        </footer>
      </form>
    </div>
  );
}
