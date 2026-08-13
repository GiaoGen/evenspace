import { Icon } from "@/components/ui/icon";
import { getActiveRecipeDefinition } from "../../model/recipe-catalog";
import type { ZineReaderPage } from "../../model/zine-pages";
import { RecipeRenderer } from "../recipe-renderer";
import styles from "./zine-reader.module.css";

export function ZineReaderPageView({
  page,
  pageIndex,
  mode,
}: {
  readonly page: ZineReaderPage;
  readonly pageIndex: number;
  readonly mode: "editor" | "reader";
}) {
  const sideClass = page.kind === "content" || page.kind === "colophon" || page.kind === "blank" || page.kind === "add"
    ? page.side === "left" ? styles.leftPage : styles.rightPage
    : "";
  const className = [
    styles.bookPage,
    sideClass,
    page.kind === "content" ? styles.content : styles[page.kind],
  ].filter(Boolean).join(" ");

  return (
    <article
      className={className}
      data-density={page.density}
      data-zine-page-index={pageIndex}
      data-zine-locale={page.locale}
      lang={page.locale}
      data-zine-manual-page-id={page.kind === "content" ? page.id : undefined}
      aria-label={getPageLabel(page)}
    >
      {page.kind === "cover" ? (
        <Cover title={page.title} />
      ) : page.kind === "back" ? (
        <BackCover title={page.title} />
      ) : page.kind === "colophon" ? (
        <Colophon title={page.title} pageNumber={page.pageNumber} />
      ) : page.kind === "add" ? (
        <AddPage spreadId={page.spreadId} side={page.side} />
      ) : page.kind === "blank" ? null : (
        <ContentPage page={page} mode={mode} />
      )}
    </article>
  );
}

function AddPage({ spreadId, side }: { readonly spreadId: string; readonly side: "left" | "right" }) {
  return (
    <button
      type="button"
      className={styles.addPageButton}
      data-zine-add-page="true"
      data-zine-spread-id={spreadId}
      data-zine-page-side={side}
      aria-label={`Add ${side} page`}
    >
      <Icon name="plus" size={34} />
      <span>Add page</span>
    </button>
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

function ContentPage({
  page,
  mode,
}: {
  readonly page: Extract<ZineReaderPage, { kind: "content" }>;
  readonly mode: "editor" | "reader";
}) {
  const application = page.recipeApplication;
  const recipe = application
    ? getActiveRecipeDefinition({ id: application.recipeId, version: application.recipeVersion })
    : null;
  if (!recipe || !application) {
    return <span className={styles.missingRecipe}>Recipe unavailable</span>;
  }
  return (
    <RecipeRenderer
      recipe={recipe}
      application={application}
      photos={page.photos}
      environment={{
        pageId: page.id,
        pageSide: page.side,
        mode,
        pageNumber: page.pageNumber,
        title: page.title,
        locale: page.locale,
        authoredTextItems: page.authoredTextItems,
      }}
    />
  );
}

function getPageLabel(page: ZineReaderPage) {
  if (page.kind === "cover") return `Cover: ${page.title}`;
  if (page.kind === "back") return `Back cover: ${page.title}`;
  if (page.kind === "add") return `Add ${page.side} page`;
  if (page.kind === "blank") return `Blank page ${page.pageNumber}`;
  return `Page ${page.pageNumber}: ${page.title}`;
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}
