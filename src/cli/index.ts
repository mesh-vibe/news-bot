#!/usr/bin/env node

import { Command } from "commander";
import {
  cmdInit,
  cmdLearn,
  cmdDiscover,
  cmdDigest,
  cmdScan,
  cmdInterests,
  cmdSources,
  cmdAddSource,
  cmdHistory,
  cmdOpen,
} from "./commands.js";

const program = new Command();

program
  .name("newsbot")
  .description("Personal news aggregation CLI that learns from your browser history")
  .version("1.0.0");

program
  .command("init")
  .description("Set up ~/newsbot/ directory with default config files")
  .action(cmdInit);

program
  .command("learn")
  .description("Update interest profile from browser history")
  .action(cmdLearn);

program
  .command("discover")
  .description("Scan RSS feeds for new articles and score them")
  .action(cmdDiscover);

program
  .command("digest")
  .description("Generate HTML digest from already-discovered articles")
  .action(cmdDigest);

program
  .command("scan")
  .description("Full pipeline: learn → discover → generate digest")
  .action(cmdScan);

program
  .command("interests")
  .description("Show current interest profile")
  .action(cmdInterests);

program
  .command("sources")
  .description("List configured news sources")
  .action(cmdSources);

program
  .command("add-source <url>")
  .description("Add an RSS feed or site URL")
  .action(cmdAddSource);

program
  .command("history")
  .description("List past digests")
  .action(cmdHistory);

program
  .command("open")
  .description("Open current digest in default browser")
  .action(cmdOpen);

program.parse();
