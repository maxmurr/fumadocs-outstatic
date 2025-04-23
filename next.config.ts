import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";

const withMDX = createMDX();

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withMDX(config);
