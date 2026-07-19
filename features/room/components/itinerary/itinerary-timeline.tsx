import type { ActorId } from "@/core/domain/ids";
import type { ItineraryItem } from "@/core/domain/room";
import { getItineraryScrollTarget, groupItinerary } from "../../model/itinerary";
import { ItineraryCard } from "./itinerary-card";
import styles from "./itinerary.module.css";

export function ItineraryTimeline({ items, now, timeZone, viewerActorId, canModerate, onEdit }: { readonly items: readonly ItineraryItem[]; readonly now: number; readonly timeZone: string; readonly viewerActorId: ActorId; readonly canModerate: boolean; readonly onEdit: (item: ItineraryItem) => void }) {
  const scrollTarget = getItineraryScrollTarget(items, now);
  return <div className={styles.timeline}>{groupItinerary(items, timeZone, now).map((group) => <section className={styles.day} key={group.key}><header><span>{group.label}</span><i /></header><div>{group.items.map((item) => <ItineraryCard key={item.id} item={item} now={now} timeZone={timeZone} canEdit={canModerate || item.responsible.actorId === viewerActorId} isScrollTarget={item.id === scrollTarget?.id} onEdit={() => onEdit(item)} />)}</div></section>)}</div>;
}
