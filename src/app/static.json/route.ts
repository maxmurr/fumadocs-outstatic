import { NextResponse } from "next/server";
import { type DocumentRecord } from "fumadocs-core/search/algolia";
import { getPageCached, getPagesCached } from "@/lib/utils";
import { notFound } from "next/navigation";
import { structure } from "fumadocs-core/mdx-plugins";

export const revalidate = false;

export async function GET() {
  const results: DocumentRecord[] = [];
  const pages = await getPagesCached();

  for (const page of pages) {
    const pageContent = await getPageCached(page.slug);
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
