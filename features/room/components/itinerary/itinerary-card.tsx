import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { ItineraryItem } from "@/core/domain/room";
import { formatItineraryDistance, formatItineraryTimeRange, getItineraryStatus, getSafeItineraryMapsUrl } from "../../model/itinerary";
import styles from "./itinerary.module.css";

const statusLabels = { ended: "Ended", current: "Now", upcoming: "Up next" } as const;

export function ItineraryCard({ item, now, timeZone, canEdit, isScrollTarget, onEdit, onEnd }: { readonly item: ItineraryItem; readonly now: number; readonly timeZone: string; readonly canEdit: boolean; readonly isScrollTarget: boolean; readonly onEdit: () => void; readonly onEnd: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [endArmed, setEndArmed] = useState(false);
  const status = getItineraryStatus(item, now);
  const mapsUrl = getSafeItineraryMapsUrl(item.mapsUrl);
  const canEnd = canEdit && item.endMode === "manual" && status === "current";

  return (
    <article className={`${styles.card} ${styles[status]}`} data-itinerary-target={isScrollTarget ? "true" : undefined}>
      <button type="button" className={styles.cardMain} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className={styles.cardTopline}><time>{formatItineraryTimeRange(item, timeZone)}</time><em>{status === "current" ? <i /> : null}{statusLabels[status]}</em></span>
        <span className={styles.cardTitle}>{item.title}</span>
        <span className={styles.cardPlace}>{item.locationLabel ? <><Icon name="location" size={14} />{item.locationLabel}</> : "Location to be decided"}</span>
        <span className={styles.cardFooter}><span><b>{item.responsible.initials}</b><strong>{item.responsible.displayName}</strong><small>is leading</small></span><span>{formatItineraryDistance(item, now)}<Icon name="chevron" size={14} /></span></span>
      </button>
      <div className={`${styles.cardDetails} ${expanded ? styles.cardDetailsOpen : ""}`}>
        <div className={styles.cardDetailsInner}>
          {item.description ? <p>{item.description}</p> : <p>No extra notes for this part of the plan.</p>}
          <div className={styles.cardActions}>{mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="location" size={15} />Open in Maps</a> : <span />}{canEdit ? <button type="button" onClick={onEdit}><Icon name="more" size={16} />Edit plan</button> : null}</div>
          {canEnd ? <div className={styles.manualEndAction}>{endArmed ? <><button type="button" onClick={() => setEndArmed(false)}>Keep going</button><button type="button" onClick={onEnd}>End now</button></> : <button type="button" onClick={() => setEndArmed(true)}><Icon name="check" size={15} />End this plan</button>}</div> : null}
        </div>
      </div>
    </article>
  );
}
