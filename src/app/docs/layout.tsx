import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/app/layout.config";
import { getPageTreeCached } from "@/lib/utils";

export default async function Layout({ children }: { children: ReactNode }) {
  const pageTree = await getPageTreeCached();
  return (
    <DocsLayout tree={pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
