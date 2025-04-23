import { NextResponse } from "next/server";
import { type DocumentRecord } from "fumadocs-core/search/algolia";
import { getPage, getPages } from "@/lib/utils";
import { notFound } from "next/navigation";
import { structure } from "fumadocs-core/mdx-plugins";

export const revalidate = 60;

export async function GET() {
  const results: DocumentRecord[] = [];
  const pages = await getPages();

  for (const page of pages) {
    const pageContent = await getPage(page.slug);
    if (!pageContent) notFound();

    const structured = structure(pageContent.content);

    results.push({
      _id: page.path,
      structured,
      url: `/docs/${page.slug.join("/")}`,
      title: page.frontmatter.title,
      description: page.frontmatter.description,
    });
  }

  return NextResponse.json(results);
}
