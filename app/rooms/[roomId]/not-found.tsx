import Link from "next/link";
import styles from "../route-states.module.css";

export default function RoomNotFound() {
  return <main className={styles.state}><h1>Room unavailable.</h1><p>This invitation may be invalid, or this room is not available to your current identity.</p><Link href="/rooms">Return to your rooms</Link></main>;
}
