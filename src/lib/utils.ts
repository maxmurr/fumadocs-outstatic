import { Octokit } from "@octokit/rest";
import * as path from "node:path";
import { Base64 } from "js-base64";
import { PageTree } from "fumadocs-core/server";
import { parseFrontmatter } from "@fumadocs/mdx-remote";

// Configure GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Set your GitHub token in environment variables
});

// Repository information
const REPO_OWNER = "maxmurr"; // GitHub username or organization
const REPO_NAME = "outstatic-contents"; // Repository name
const REPO_BRANCH = "main"; // Branch name
const CONTENT_PATH = "outstatic/content/docs/"; // Path in the repository

export interface Frontmatter {
  title: string;
  description?: string;
}

interface TreeItem {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
}

/**
 * Get Page content from GitHub repository
 */
export async function getPage(slugs: string[] = []): Promise<
  | {
      path: string;
      content: string;
    }
  | undefined
> {
  try {
    const filePath = path.join(CONTENT_PATH, ...slugs);
    let response;

    // Get the target directory we're looking for (docs)
    const docsDir = CONTENT_PATH.split("/")[2]; // This should be 'docs'

    // Check if we're at the docs root level
    const isDocsRoot =
      slugs.length === 0 || (slugs.length === 1 && slugs[0] === docsDir);

    // Only try index.mdx if we're at the docs root
    if (isDocsRoot) {
      response = await fetchFileContent(path.join(filePath, "index.mdx")).catch(
        () => null
      );
    }

    // If not found or not matching condition, try as an MDX file
    if (!response) {
      response = await fetchFileContent(`${filePath}.mdx`).catch(() => null);
    }

    if (!response) {
      return undefined;
    }

    return {
      path: response.path,
      content: response.content,
    };
  } catch (error) {
    console.error("Error fetching page:", error);
    return undefined;
  }
}

/**
 * Helper function to fetch file content from GitHub
 */
async function fetchFileContent(filePath: string) {
  try {
    // Remove any leading slashes and ensure correct path structure
    const cleanPath = filePath.replace(/^\/+/, "");

    // Get file content from GitHub
    const metadata = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: cleanPath,
      ref: REPO_BRANCH,
    });

    if (!Array.isArray(metadata.data) && "content" in metadata.data) {
      const content = Base64.decode(metadata.data.content);
      return {
        path: cleanPath,
        content,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getPageTree(): Promise<PageTree.Root> {
  const pages = await getPages();

  // Create the root node
  const root: PageTree.Root = {
    name: "Documentation",
    children: [],
  };

  // Helper function to create or get a folder node
  function getOrCreateFolder(
    path: string[],
    parent: { children: PageTree.Node[] }
  ): { children: PageTree.Node[] } {
    if (path.length === 0) return parent;

    const folderName = path[0];
    let folder = parent.children.find(
      (node): node is PageTree.Folder =>
        node.type === "folder" && node.name === folderName
    );

    if (!folder) {
      folder = {
        type: "folder",
        name: folderName,
        children: [],
      };
      parent.children.push(folder);
    }

    return getOrCreateFolder(path.slice(1), folder);
  }

  // Build the tree structure
  for (const page of pages) {
    const pathParts = page.slug;
    const dirPath = pathParts.slice(0, -1);

    // Get or create the parent folder
    const parent = getOrCreateFolder(dirPath, root);

    // Add the page node using the frontmatter title
    parent.children.push({
      type: "page",
      name: page.frontmatter.title,
      url: `/docs/${page.slug.join("/")}`,
    });
  }

  return root;
}

/**
 * Get all pages from GitHub repository
 */
export async function getPages(): Promise<
  {
    slug: string[];
    path: string;
    frontmatter: Frontmatter;
  }[]
> {
  try {
    // Get repository contents recursively
    const { data: tree } = await octokit.git.getTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree_sha: REPO_BRANCH,
      recursive: "1",
    });

    // Filter for MDX files in the content/docs path
    const mdxFiles = tree.tree
      .filter(
        (item: TreeItem) =>
          item.type === "blob" &&
          item.path?.startsWith(CONTENT_PATH) &&
          item.path.endsWith(".mdx")
      )
      .map((item: TreeItem) => item.path as string);

    const pages = await Promise.all(
      mdxFiles.map(async (file: string) => {
        const relativePath = file.slice(CONTENT_PATH.length); // Remove only the content path
        const parts = relativePath.split("/");
        const last = parts[parts.length - 1];

        // Create slug array
        const slugs = [...parts];
        slugs[slugs.length - 1] = last.slice(0, -path.extname(last).length);

        // Remove "index" from the end of the slug array
        if (slugs[slugs.length - 1] === "index") slugs.pop();

        // Get page content and parse frontmatter
        const pageContent = await fetchFileContent(file);
        const { frontmatter } = parseFrontmatter(pageContent?.content || "");

        // Ensure frontmatter has required title
        if (!frontmatter.title) {
          throw new Error(`Missing title in frontmatter for file: ${file}`);
        }

        return {
          path: file,
          slug: slugs,
          frontmatter: frontmatter as Frontmatter,
        };
      })
    );

    return pages;
  } catch (error) {
    console.error("Error fetching pages:", error);
    return [];
  }
}
