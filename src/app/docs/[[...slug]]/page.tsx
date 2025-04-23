import type { Metadata } from "next";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import defaultComponents from "fumadocs-ui/mdx";
import { compileMDX, parseFrontmatter } from "@fumadocs/mdx-remote";
import { type Frontmatter, getPage, getPages } from "@/lib/utils";
import { structure } from "fumadocs-core/mdx-plugins";

interface PageProps {
  params: Promise<{
    slug?: string | string[];
  }>;
}

export default async function Page({ params }: PageProps) {
  const slugs = (await params).slug ?? [];
  const page = await getPage(slugs as string[]);
  if (!page) notFound();

  const {
    frontmatter,
    body: MdxContent,
    toc,
  } = await compileMDX<Frontmatter>({
    source: page.content,
  });

  const structured = structure(page.content);
  console.log(structured);

  return (
    <DocsPage toc={toc}>
      <DocsTitle>{frontmatter.title}</DocsTitle>
      <DocsDescription>{frontmatter.description}</DocsDescription>
      <DocsBody>
        <MdxContent components={{ ...defaultComponents }} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return (await getPages()).map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const slugs = (await params).slug ?? [];
  const page = await getPage(slugs as string[]);
  if (!page) notFound();

  const { frontmatter } = parseFrontmatter(page.content);

  return {
    title: frontmatter.title,
    description: frontmatter.description,
  };
}
