import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PRODUCT = 'docs/PRODUCT_SPEC.md';
const DESIGN = 'docs/TECHNICAL_DESIGN.md';
const changePatterns = [
  /^fishing-game\//,
  /^src\//,
  /^public\//,
  /^vite\.config\./,
  /^package(?:-lock)?\.json$/,
  /^index\.html$/,
  /^\.github\/workflows\//,
];

export function checkDocumentationSync(files, body) {
  const changed = new Set(files.map((file) => file.replaceAll('\\', '/')));
  if (![...changed].some((file) => changePatterns.some((pattern) => pattern.test(file)))) return [];

  const errors = [];
  const impactMatch = body.match(/^Docs impact:\s*(\S+)\s*$/im);
  const rationaleMatch = body.match(/^Docs rationale:\s*(.+)\s*$/im);
  const impact = impactMatch?.[1]?.toLowerCase();
  const rationale = rationaleMatch?.[1]?.trim();
  if (!['product', 'design', 'both', 'none'].includes(impact)) {
    errors.push('PR本文に Docs impact: product|design|both|none を指定してください。');
  }
  if (!rationale || rationale.length < 12 || /^(?:n\/a|none|不要|なし|特になし)$/i.test(rationale)) {
    errors.push('Docs rationale: に変更と文書への影響を具体的に記入してください（12文字以上）。');
  }
  if (['product', 'both'].includes(impact) && !changed.has(PRODUCT)) {
    errors.push(`Docs impact: ${impact} には ${PRODUCT} の更新が必要です。`);
  }
  if (['design', 'both'].includes(impact) && !changed.has(DESIGN)) {
    errors.push(`Docs impact: ${impact} には ${DESIGN} の更新が必要です。`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.BASE_SHA;
  if (!/^[0-9a-f]{40}$/i.test(base ?? '')) {
    console.error('BASE_SHA にPRベースの40桁SHAが必要です。');
    process.exit(2);
  }
  const files = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRT', `${base}...HEAD`], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  const errors = checkDocumentationSync(files, process.env.PR_BODY ?? '');
  if (errors.length) {
    for (const error of errors) console.error(`::error::${error}`);
    process.exitCode = 1;
  } else {
    console.log(`Documentation sync OK (${files.length} changed files).`);
  }
}
