import { Octokit } from "@octokit/rest";
import * as path from "node:path";
import { Base64 } from "js-base64";

// Configure GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Set your GitHub token in environment variables
});

// Repository information
const REPO_OWNER = "maxmurr"; // GitHub username or organization
const REPO_NAME = "outstatic-contents"; // Repository name
const REPO_BRANCH = "main"; // Branch name
const CONTENT_PATH = "outstatic/content/posts/"; // Path in the repository

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

/**
 * Get all pages from GitHub repository
 */
export async function getPages(): Promise<
  {
    slug: string[];
    path: string;
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

    return mdxFiles.map((file: string) => {
      const relativePath = file.slice(CONTENT_PATH.length + 1); // +1 for the slash
      const parts = relativePath.split("/");
      const last = parts[parts.length - 1];

      // Create slug array
      const slugs = [...parts];
      slugs[slugs.length - 1] = last.slice(0, -path.extname(last).length);

      // Remove "index" from the end of the slug array
      if (slugs[slugs.length - 1] === "index") slugs.pop();

      return {
        path: file,
        slug: slugs,
      };
    });
  } catch (error) {
    console.error("Error fetching pages:", error);
    return [];
  }
}
