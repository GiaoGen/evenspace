import Image from "next/image";
import type { ZinePhoto } from "../../model/zine-draft";
import type { ZineReaderPage } from "../../model/zine-pages";
import styles from "./zine-reader.module.css";

const styleClasses = {
  editorial: styles.editorial,
  contact: styles.contact,
  margin: styles.margin,
  split: styles.split,
  night: styles.night,
} as const;

export function ZineReaderPageView({
  page,
  pageIndex,
}: {
  readonly page: ZineReaderPage;
  readonly pageIndex: number;
}) {
  const sideClass = page.kind === "content" || page.kind === "colophon"
    ? page.side === "left" ? styles.leftPage : styles.rightPage
    : "";
  const className = [
    styles.bookPage,
    sideClass,
    page.kind === "content" ? styleClasses[page.styleId] : styles[page.kind],
  ].filter(Boolean).join(" ");

  return (
    <article
      className={className}
      data-density={page.density}
      data-zine-page-index={pageIndex}
      aria-label={getPageLabel(page)}
    >
      {page.kind === "cover" ? (
        <Cover title={page.title} />
      ) : page.kind === "back" ? (
        <BackCover title={page.title} />
      ) : page.kind === "colophon" ? (
        <Colophon title={page.title} pageNumber={page.pageNumber} />
      ) : (
        <ContentPage page={page} />
      )}
    </article>
  );
}

function Cover({ title }: { readonly title: string }) {
  return (
    <>
      <div className={styles.coverMeta}><span>EVENTSPACE ZINE</span><span>01</span></div>
      <h1>{title}</h1>
      <div className={styles.coverRule} />
      <p>Click to open</p>
    </>
  );
}

function BackCover({ title }: { readonly title: string }) {
  return (
    <>
      <span className={styles.backMark}>ES</span>
      <p>{title}</p>
      <small>Made in EventSpace</small>
    </>
  );
}

function Colophon({ title, pageNumber }: { readonly title: string; readonly pageNumber: number }) {
  return (
    <>
      <small>END NOTE / {twoDigits(pageNumber)}</small>
      <div>
        <strong>{title}</strong>
        <p>A collection of images and notes, held together for this moment.</p>
      </div>
      <span>EVENTSPACE</span>
    </>
  );
}

function ContentPage({ page }: { readonly page: Extract<ZineReaderPage, { kind: "content" }> }) {
  if (page.styleId === "contact") {
    return (
      <>
        <PageHeader title={page.title} pageNumber={page.pageNumber} label="INDEX" />
        <div className={styles.contactGrid}>
          {page.photos.map((photo, index) => (
            <ReaderPhoto key={photo.id} photo={photo} side={page.side} index={index + 1} />
          ))}
        </div>
        <PageFooter pageNumber={page.pageNumber} />
      </>
    );
  }

  if (page.styleId === "split") {
    return (
      <>
        <PageHeader title={page.title} pageNumber={page.pageNumber} label="TWO VIEWS" />
        <div className={styles.splitGrid}>
          {page.photos.map((photo, index) => (
            <ReaderPhoto key={photo.id} photo={photo} side={page.side} index={index + 1} />
          ))}
        </div>
        <PageFooter pageNumber={page.pageNumber} />
      </>
    );
  }

  const photo = page.photos[0];
  return (
    <>
      <PageHeader
        title={page.title}
        pageNumber={page.pageNumber}
        label={page.styleId === "night" ? "NIGHT INDEX" : "EVENTSPACE"}
      />
      {page.styleId === "editorial" ? <h2>{page.title}</h2> : null}
      {photo ? <ReaderPhoto photo={photo} side={page.side} index={1} /> : null}
      {page.styleId === "night" ? <strong className={styles.nightTitle}>{page.title}</strong> : null}
      <PageFooter pageNumber={page.pageNumber} />
    </>
  );
}

function ReaderPhoto({
  photo,
  side,
  index,
}: {
  readonly photo: ZinePhoto;
  readonly side: "left" | "right";
  readonly index: number;
}) {
  return (
    <figure className={styles.readerPhoto}>
      <div>
        <Image
          unoptimized
          loading="eager"
          src={photo.previewUrl}
          alt={photo.fileName}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 640px) 45vw, 420px"
        />
      </div>
      <figcaption className={side === "left" ? styles.captionLeft : styles.captionRight}>
        <b>{twoDigits(index)}</b>
        <span>{photo.caption.trim() || photo.fileName}</span>
      </figcaption>
    </figure>
  );
}

function PageHeader({
  title,
  pageNumber,
  label,
}: {
  readonly title: string;
  readonly pageNumber: number;
  readonly label: string;
}) {
  return (
    <header className={styles.pageHeader}>
      <span>{label}</span>
      <b>{title}</b>
      <small>{twoDigits(pageNumber)}</small>
    </header>
  );
}

function PageFooter({ pageNumber }: { readonly pageNumber: number }) {
  return <footer className={styles.pageFooter}><span>EVENTSPACE</span><b>{twoDigits(pageNumber)}</b></footer>;
}

function getPageLabel(page: ZineReaderPage) {
  if (page.kind === "cover") return `Cover: ${page.title}`;
  if (page.kind === "back") return `Back cover: ${page.title}`;
  return `Page ${page.pageNumber}: ${page.title}`;
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}
