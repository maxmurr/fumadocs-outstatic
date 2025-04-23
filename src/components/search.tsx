"use client";

import algoliasearch from "algoliasearch/lite";
import type { SharedProps } from "fumadocs-ui/components/dialog/search";
import SearchDialog from "fumadocs-ui/components/dialog/search-algolia";

const client = algoliasearch("TVO8CQ0RNZ", "c63df30f19e8b02d03760fe4b34fc2cc");
const index = client.initIndex("document");

export default function CustomSearchDialog(props: SharedProps) {
  return <SearchDialog index={index} {...props} />;
}
