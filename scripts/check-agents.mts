// Verifies that every repository path cited in the agent guidance (AGENTS.md, CLAUDE.md, .claude/**, the PR
// template) exists, so renaming or deleting a file can't silently leave the guidance pointing at nothing.
// Checks `backticked` paths and relative markdown links. Run with `just check-agents` (Node 24, no install needed).
import { execSync } from "node:child_process";
import { existsSync, globSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

const guidanceFiles = [
  "AGENTS.md",
  "CLAUDE.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ...globSync(".claude/**/*.md", { cwd: repoRoot, exclude: [".claude/worktrees/**", ".claude/agent-memory/**"] }),
].filter((file) => existsSync(path.join(repoRoot, file)));

const repoPrefixes = ["server/", "web/", "docs/", "brand/", "scripts/", ".claude/", ".github/", "words/", "infra/"];

// Cited on purpose before they exist. Remove an entry once the path lands.
const plannedPaths = new Set(["words/", "words/NOTICE", "infra/", "infra/scaleway/"]);

// Naming patterns, anti-pattern examples and gitignored locations, not real files.
const ignoredTokens = new Set([
  "utils.rs",
  "Name.component.tsx",
  "name.stories.tsx",
  "name.utils.ts",
  "name.hook.ts",
  "componentName.stories.tsx",
  ".claude/worktrees/",
  ".claude/settings.local.json",
]);

// `src/…` in web or server guidance is relative to that package; `@/` is the web import alias.
const packageRelativePrefixes: Record<string, string[]> = {
  "src/": ["web/src/", "server/src/"],
  "@/": ["web/src/"],
  ".storybook/": ["web/.storybook/"],
};

const fileExtensionPattern = /\.(md|ts|tsx|mts|js|mjs|json|css|rs|toml|sh|yml|yaml|svg|html)$/;

function listRepoFiles(): string[] {
  try {
    return execSync("git ls-files --cached --others --exclude-standard", {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
      .split("\n")
      .filter((file) => file !== "" && existsSync(path.join(repoRoot, file)));
  } catch {
    return [];
  }
}

const repoFiles = listRepoFiles();

function isPlaceholder(token: string): boolean {
  return /[{}<>…|*]/.test(token);
}

function cleanToken(raw: string): string {
  return raw
    .trim()
    .replace(/#.*$/, "")
    .replace(/:\d+(-\d+)?$/, "")
    .replace(/\(\)$/, "")
    .replace(/[.,;:]+$/, "");
}

// Import specifiers (`@/components/x/X.component`) leave the extension off.
const importExtensions = ["", ".ts", ".tsx", ".mts", ".rs"];

function exists(repoPath: string): boolean {
  const absolute = path.resolve(repoRoot, repoPath);
  return importExtensions.some((extension) => existsSync(absolute + extension));
}

// Repo-relative candidates for a token, or [] when the token is not a path we check.
function candidatesFor(token: string, citingFile: string, isLink: boolean): string[] {
  if (/^@[^/]/.test(token)) {
    return candidatesFor(token.slice(1), citingFile, isLink);
  }
  if (isLink) {
    return [path.join(path.dirname(citingFile), token)];
  }
  if (repoPrefixes.some((prefix) => token.startsWith(prefix))) {
    return [token];
  }
  for (const [prefix, targets] of Object.entries(packageRelativePrefixes)) {
    if (token.startsWith(prefix)) {
      return targets.map((target) => target + token.slice(prefix.length));
    }
  }
  if (token.startsWith("../") || token.startsWith("./")) {
    return [path.join(path.dirname(citingFile), token)];
  }
  if (fileExtensionPattern.test(token) && !token.startsWith("/") && !token.startsWith("~") && !token.startsWith(".")) {
    return [token, path.join(path.dirname(citingFile), token)];
  }
  return [];
}

function isCitedPathOk(token: string, citingFile: string, isLink: boolean): boolean {
  if (ignoredTokens.has(token) || plannedPaths.has(token) || isPlaceholder(token)) {
    return true;
  }
  const candidates = candidatesFor(token, citingFile, isLink);
  if (candidates.length === 0 || candidates.some(exists)) {
    return true;
  }
  const isBareFileName = !token.includes("/") && !isLink;
  return isBareFileName && repoFiles.some((file) => file.endsWith(`/${token}`));
}

function tokensOnLine(lineText: string): { token: string; isLink: boolean }[] {
  const tokens: { token: string; isLink: boolean }[] = [];
  for (const match of lineText.matchAll(/`([^`\n]+)`/g)) {
    const words = match[1].trim().split(/\s+/);
    const isCommand = words.length > 1;
    for (const word of words) {
      const token = cleanToken(word);
      // In a command (`node scripts/x.mts --flag`) only words that clearly are repo paths are checked.
      if (token === "" || (isCommand && !repoPrefixes.some((prefix) => token.startsWith(prefix)))) {
        continue;
      }
      tokens.push({ token, isLink: false });
    }
  }
  for (const match of lineText.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) {
      continue;
    }
    tokens.push({ token: cleanToken(target), isLink: true });
  }
  return tokens;
}

type Miss = { file: string; line: number; token: string };

function collectMisses(file: string): Miss[] {
  const lines = readFileSync(path.join(repoRoot, file), "utf8").split("\n");
  return lines.flatMap((lineText, index) =>
    tokensOnLine(lineText)
      .filter(({ token, isLink }) => !isCitedPathOk(token, file, isLink))
      .map(({ token }) => ({ file, line: index + 1, token })),
  );
}

const misses = guidanceFiles.flatMap(collectMisses);

if (misses.length > 0) {
  for (const miss of misses) {
    console.error(`${miss.file}:${miss.line}  missing: ${miss.token}`);
  }
  console.error(`check-agents: ${misses.length} cited path(s) do not exist`);
  process.exit(1);
}

console.log(`check-agents: ${guidanceFiles.length} files, every cited path exists`);
