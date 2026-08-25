// Server-Wrapper: erzeugt beim statischen Export (GitHub Pages)
// eine Seite pro Kapitel und reicht die ID an die Client-Komponente durch.
import { CHAPTERS } from "@/lib/content";
import LessonClient from "./LessonClient";

export function generateStaticParams() {
  return CHAPTERS.map((chapter) => ({ id: chapter.id }));
}

export const dynamicParams = false;

export default function LessonPage({ params }) {
  return <LessonClient id={params.id} />;
}
