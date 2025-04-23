import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { getPageTree } from "@/lib/utils";

export default async function Layout({ children }: { children: ReactNode }) {
  const pageTree = await getPageTree();
  return (
    <DocsLayout tree={pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
