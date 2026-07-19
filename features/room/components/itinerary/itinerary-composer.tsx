import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ActorId } from "@/core/domain/ids";
import type { ItineraryItem, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { overlapsItinerary } from "../../model/itinerary";
import styles from "./itinerary.module.css";

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getDefaultStart() {
  const date = new Date(Date.now() + 15 * 60_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  return toLocalInput(date.toISOString());
}

export function ItineraryComposer({ item, items, members, viewerActorId, roomEndsAt, communityProposal, onClose, onSave, onDelete }: { readonly item: ItineraryItem | null; readonly items: readonly ItineraryItem[]; readonly members: readonly PersonSummary[]; readonly viewerActorId: ActorId; readonly roomEndsAt: string | null; readonly communityProposal: boolean; readonly onClose: () => void; readonly onSave: (item: ItineraryItem) => void; readonly onDelete: (itemId: string) => void }) {
  const initialDuration = item ? Math.max(5, Math.round((Date.parse(item.endsAt) - Date.parse(item.startsAt)) / 60_000 / 5) * 5) : 60;
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [location, setLocation] = useState(item?.locationLabel ?? "");
  const [startsAt, setStartsAt] = useState(item ? toLocalInput(item.startsAt) : getDefaultStart());
  const [durationMinutes, setDurationMinutes] = useState(initialDuration);
  const [responsibleId, setResponsibleId] = useState<ActorId>(item?.responsible.actorId ?? viewerActorId);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const responsible = members.find((member) => member.actorId === responsibleId) ?? members[0];
  const startMs = Date.parse(startsAt);
  const endMs = startMs + durationMinutes * 60_000;
  const draft = useMemo(() => ({ id: item?.id ?? "new", startsAt: new Date(startMs || 0).toISOString(), endsAt: new Date(endMs || 0).toISOString() }), [endMs, item?.id, startMs]);
  const conflict = Number.isFinite(startMs) && overlapsItinerary(draft, items);
  const invalid = !title.trim() || !responsible || !Number.isFinite(startMs) || endMs <= startMs || Boolean(roomEndsAt && endMs > Date.parse(roomEndsAt));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid || !responsible) return;
    const nowIso = new Date().toISOString();
    onSave({
      id: item?.id ?? `itinerary_${createUuid()}`,
      title: title.trim().slice(0, 80),
      description: description.trim().slice(0, 500),
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      locationLabel: location.trim().slice(0, 120) || null,
      mapsUrl: location.trim() ? `https://maps.google.com/?q=${encodeURIComponent(location.trim().slice(0, 120))}` : null,
      responsible,
      createdByActorId: item?.createdByActorId ?? viewerActorId,
      createdAt: item?.createdAt ?? nowIso,
      updatedAt: nowIso,
    });
  }

  return (
    <div className={styles.composerBackdrop} role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className={styles.composer} onSubmit={submit} role="dialog" aria-modal="true" aria-label={item ? "Edit itinerary plan" : "Add itinerary plan"}>
        <header><span>{item ? "Edit plan" : communityProposal ? "Plan proposal" : "New plan"}</span><button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className={styles.composerPreview}>
          <label className={styles.titleField}><span>Plan</span><input value={title} onChange={(event) => setTitle(event.target.value.slice(0, 80))} placeholder="Dinner by the river" /></label>
          <div className={styles.timingRow}>
            <label><span>Starts</span><input type="datetime-local" value={startsAt} max={roomEndsAt ? toLocalInput(roomEndsAt) : undefined} onChange={(event) => setStartsAt(event.target.value)} /></label>
            <div className={styles.durationControl}><span>Duration</span><div><button type="button" onClick={() => setDurationMinutes((value) => Math.max(5, value - 5))} aria-label="Reduce duration"><Icon name="minus" size={15} /></button><strong>{durationMinutes < 60 ? `${durationMinutes} min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60 ? `${durationMinutes % 60}m` : ""}`}</strong><button type="button" onClick={() => setDurationMinutes((value) => Math.min(720, value + 5))} aria-label="Increase duration"><Icon name="plus" size={15} /></button></div></div>
          </div>
          <label><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value.slice(0, 120))} placeholder="Optional" /></label>
          <label><span>Notes</span><textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 500))} placeholder="Meeting point, what to bring, or anything useful." rows={3} /></label>
          <label><span>Led by</span><select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value as ActorId)}>{members.map((member) => <option value={member.actorId} key={member.actorId}>{member.displayName}</option>)}</select></label>
          {conflict ? <p className={styles.conflict}><Icon name="calendar" size={14} />This overlaps another plan. You can still keep it.</p> : null}
        </div>
        <footer>
          {item ? deleteArmed ? <div className={styles.deleteConfirm}><button type="button" onClick={() => setDeleteArmed(false)}>Keep it</button><button type="button" onClick={() => onDelete(item.id)}>Delete plan</button></div> : <button type="button" className={styles.deleteButton} onClick={() => setDeleteArmed(true)} aria-label="Delete plan"><Icon name="trash" /></button> : <span />}
          <button type="submit" className={styles.saveButton} disabled={invalid}>{communityProposal && !item ? "Open vote" : item ? "Save changes" : "Add to itinerary"}<Icon name="arrow" size={16} /></button>
        </footer>
      </form>
    </div>
  );
}
