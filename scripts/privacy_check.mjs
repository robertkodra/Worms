import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const rules = [
  ["private filesystem path", /\/(?:Users|home)\/[^\s/]+\//],
  ["Windows user path", /[A-Z]:\\Users\\[^\\]+\\/i],
  ["local file link", /file:\/\//i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "GitHub credential",
    /gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/,
  ],
  ["AWS access key", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ["API credential", /sk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}/],
];
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) walk(path);
    else if (item.isFile()) files.push(path);
  }
}
walk("dist");
let failures = 0;
for (const file of new Set(files)) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file).toString("utf8");
  for (const [name, pattern] of rules)
    if (pattern.test(text)) {
      // Never print the matched text: it could itself be a credential.
      console.error(`${file}: ${name}`);
      failures++;
    }
}
if (failures) process.exitCode = 1;
else
  console.log(
    `Privacy pattern check passed (${new Set(files).size} files, including production output when present).`,
  );
