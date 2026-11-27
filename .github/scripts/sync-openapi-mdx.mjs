#!/usr/bin/env node
// Keeps openapi.json and the MDX endpoint pages that point at it in sync.
//
//   --normalize   Sort the scope arrays of every security requirement in
//                 openapi.json, so two fetches of the same spec are identical.
//   --reconcile   Repoint nav-linked MDX pages whose `openapi: <method> <path>`
//                 left the spec at the operation that replaced it, and delete
//                 the unlinked stub xdk-build created for that operation.
//   --validate    Exit 1 when a nav-linked MDX page points at an operation
//                 that is not in openapi.json.
//
// Modes run in that order whatever order the flags are given in.
// --root <dir> sets the docs root (default: the working directory).

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SPEC = 'openapi.json';
const DOCS_CONFIG = 'docs.json';
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const MIGRATION_SUFFIXES = ['remove', 'delete', 'disable'];
const SKIPPED_DIRS = new Set(['node_modules']);

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const operationKey = (method, apiPath) => `${method.toLowerCase()} ${apiPath}`;

function forEachOperation(spec, visit) {
  for (const section of ['paths', 'webhooks']) {
    for (const [apiPath, pathItem] of Object.entries(spec?.[section] ?? {})) {
      if (!pathItem || typeof pathItem !== 'object') continue;
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method.toLowerCase())) continue;
        if (!operation || typeof operation !== 'object') continue;
        visit({ section, method: method.toLowerCase(), path: apiPath, operation });
      }
    }
  }
}

function compareStrings(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sortScopes(requirements) {
  if (!Array.isArray(requirements)) return 0;
  let changed = 0;
  for (const requirement of requirements) {
    if (!requirement || typeof requirement !== 'object') continue;
    for (const [scheme, scopes] of Object.entries(requirement)) {
      if (!Array.isArray(scopes) || !scopes.every((scope) => typeof scope === 'string')) continue;
      const sorted = [...scopes].sort(compareStrings);
      if (sorted.some((scope, index) => scope !== scopes[index])) {
        requirement[scheme] = sorted;
        changed += 1;
      }
    }
  }
  return changed;
}

/**
 * Sorts the scope arrays of every security requirement, in place. The order of
 * the requirements themselves is kept. Returns how many arrays changed.
 */
export function normalizeSpec(spec) {
  let changed = sortScopes(spec?.security);
  forEachOperation(spec, ({ operation }) => {
    changed += sortScopes(operation.security);
  });
  return changed;
}

export function normalizeSpecFile(specFile) {
  const original = fs.readFileSync(specFile, 'utf8');
  const spec = JSON.parse(original);
  const changed = normalizeSpec(spec);
  if (changed > 0) {
    const trailingNewline = original.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(specFile, JSON.stringify(spec, null, 2) + trailingNewline);
  }
  return changed;
}

/** Maps `<method> <path>` to `{ method, path, summary, operationId }` for every operation under `paths`. */
export function listOperations(spec) {
  const operations = new Map();
  forEachOperation(spec, ({ section, method, path: apiPath, operation }) => {
    if (section !== 'paths') return;
    operations.set(operationKey(method, apiPath), {
      method,
      path: apiPath,
      summary: typeof operation.summary === 'string' ? operation.summary : '',
      operationId: typeof operation.operationId === 'string' ? operation.operationId : '',
    });
  });
  return operations;
}

/** Every page path that `navigation` in docs.json links to, without a leading slash. */
export function collectNavPages(docsConfig) {
  const pages = new Set();
  const add = (page) => pages.add(page.replace(/^\/+/, ''));
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'pages' && Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === 'string') add(entry);
          else walk(entry);
        }
      } else if (key === 'root' && typeof value === 'string') {
        add(value);
      } else {
        walk(value);
      }
    }
  };
  walk(docsConfig?.navigation);
  return pages;
}

function unquote(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.length > 1 && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Reads the frontmatter of an MDX file. `openapi` is the unquoted value of the
 * `openapi:` key, and `isBareStub` is true when that key is the only content
 * of the file.
 */
export function parseFrontmatter(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (end === -1) return null;

  const result = { openapi: null, openapiLine: -1, title: null, isBareStub: false };
  for (let index = 1; index < end; index += 1) {
    const match = /^([A-Za-z0-9_-]+)\s*:(.*)$/.exec(lines[index]);
    if (!match) continue;
    if (match[1] === 'openapi') {
      result.openapi = unquote(match[2]);
      result.openapiLine = index;
    } else if (match[1] === 'title') {
      result.title = unquote(match[2]);
    }
  }
  const contentLines = lines.filter((line, index) => index !== end && index !== 0 && line.trim() !== '');
  result.isBareStub = result.openapiLine !== -1 && contentLines.length === 1;
  return result;
}

/**
 * Parses an `openapi:` frontmatter value: `<method> <path>` or
 * `<spec file> <method> <path>`. Returns null for anything else, such as
 * `webhook <name>`.
 */
export function parseOpenapiRef(value) {
  if (typeof value !== 'string') return null;
  const tokens = value.trim().split(/\s+/);
  if (tokens.length !== 2 && tokens.length !== 3) return null;
  const [apiPath, method, spec = null] = tokens.reverse();
  if (!HTTP_METHODS.has(method.toLowerCase())) return null;
  return { spec, method: method.toLowerCase(), path: apiPath };
}

function isDefaultSpecRef(ref) {
  return ref.spec === null || ref.spec.replace(/^(\.?\/)+/, '') === DEFAULT_SPEC;
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug of a camelCase identifier: `unmuteChatConversation` -> `unmute-chat-conversation`. */
export function slugifyIdentifier(value) {
  return slugify(String(value ?? '').replace(/([a-z0-9])([A-Z])/g, '$1-$2'));
}

/**
 * True when `candidate` is the POST form of the DELETE operation `stale`:
 * the same path plus `/remove`, `/delete` or `/disable`, or the same path with
 * its last segment prefixed by `un` (`/mute` -> `/unmute`).
 */
export function isDeleteToPostMigration(stale, candidate) {
  if (stale.method !== 'delete' || candidate.method !== 'post') return false;
  if (MIGRATION_SUFFIXES.some((suffix) => candidate.path === `${stale.path}/${suffix}`)) return true;

  const staleSegments = stale.path.split('/');
  const candidateSegments = candidate.path.split('/');
  if (staleSegments.length !== candidateSegments.length) return false;
  const staleLast = staleSegments.pop();
  const candidateLast = candidateSegments.pop();
  if (staleSegments.join('/') !== candidateSegments.join('/')) return false;
  return /^[a-z]/i.test(staleLast) && /^un[_-]?/i.test(candidateLast)
    && candidateLast.replace(/^un[_-]?/i, '').toLowerCase() === staleLast.toLowerCase();
}

function matchReasons(page, candidate) {
  const reasons = [];
  const fileSlug = slugify(path.basename(page.file, path.extname(page.file)));
  const titleSlug = slugify(page.title);
  const summarySlug = slugify(candidate.summary);
  const operationIdSlug = slugifyIdentifier(candidate.operationId);

  if (summarySlug && summarySlug === fileSlug) reasons.push('summary matches file name');
  if (summarySlug && summarySlug === titleSlug) reasons.push('summary matches title');
  if (operationIdSlug && (operationIdSlug === fileSlug || operationIdSlug === titleSlug)) {
    reasons.push('operationId matches page');
  }
  if (isDeleteToPostMigration(page.ref, candidate)) reasons.push('DELETE -> POST migration');
  return reasons;
}

function loadDocs(root) {
  const operations = listOperations(readJson(path.join(root, DEFAULT_SPEC)));
  const navPages = collectNavPages(readJson(path.join(root, DOCS_CONFIG)));

  const linkedFiles = new Set();
  const linkedPages = [];
  for (const page of navPages) {
    const file = ['.mdx', '.md'].map((ext) => page + ext).find((name) => fs.existsSync(path.join(root, name)));
    if (!file) continue;
    linkedFiles.add(file);
    const frontmatter = parseFrontmatter(fs.readFileSync(path.join(root, file), 'utf8'));
    const ref = parseOpenapiRef(frontmatter?.openapi);
    if (!ref || !isDefaultSpecRef(ref)) continue;
    linkedPages.push({ file, ref, title: frontmatter.title, key: operationKey(ref.method, ref.path) });
  }
  linkedPages.sort((a, b) => compareStrings(a.file, b.file));
  return { operations, linkedFiles, linkedPages };
}

/** Nav-linked pages whose default-spec operation is not in openapi.json. */
export function findStalePages(root) {
  const { operations, linkedPages } = loadDocs(root);
  return linkedPages
    .filter((page) => !operations.has(page.key))
    .map((page) => ({ file: page.file, operation: page.key }));
}

function listMdxFiles(root, dir = '') {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIPPED_DIRS.has(entry.name)) continue;
      files.push(...listMdxFiles(root, relative));
    } else if (entry.name.endsWith('.mdx')) {
      files.push(relative);
    }
  }
  return files;
}

function rewriteOpenapiLine(text, lineIndex, method, apiPath) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const match = /^(openapi\s*:\s*)(["']?)(.*?)\2\s*$/.exec(lines[lineIndex]);
  const tokens = match[3].trim().split(/\s+/);
  const prefix = tokens.length === 3 ? `${tokens[0]} ` : '';
  lines[lineIndex] = `${match[1]}${match[2]}${prefix}${method} ${apiPath}${match[2]}`;
  return lines.join(eol);
}

/**
 * Repoints every stale nav-linked page that maps to exactly one operation no
 * nav-linked page documents yet, then deletes the unlinked stubs (files holding
 * only an `openapi:` frontmatter key) that point at the same operation.
 */
export function reconcile(root) {
  const { operations, linkedFiles, linkedPages } = loadDocs(root);
  const documented = new Set(linkedPages.map((page) => page.key));
  const candidates = [...operations.entries()].filter(([key]) => !documented.has(key));
  const stalePages = linkedPages.filter((page) => !operations.has(page.key));

  const proposals = [];
  const unresolved = [];
  for (const page of stalePages) {
    const matches = candidates
      .map(([key, candidate]) => ({ key, candidate, reasons: matchReasons(page, candidate) }))
      .filter((match) => match.reasons.length > 0);
    if (matches.length === 1) {
      proposals.push({ page, ...matches[0] });
    } else {
      const reason = matches.length === 0
        ? 'no replacement operation found'
        : `ambiguous: ${matches.map((match) => match.key).join(', ')}`;
      unresolved.push({ file: page.file, operation: page.key, reason });
    }
  }

  const claims = new Map();
  for (const proposal of proposals) claims.set(proposal.key, (claims.get(proposal.key) ?? 0) + 1);

  const updated = [];
  for (const { page, key, candidate, reasons } of proposals) {
    if (claims.get(key) > 1) {
      unresolved.push({ file: page.file, operation: page.key, reason: `several stale pages match ${key}` });
      continue;
    }
    const file = path.join(root, page.file);
    const text = fs.readFileSync(file, 'utf8');
    const { openapiLine } = parseFrontmatter(text);
    fs.writeFileSync(file, rewriteOpenapiLine(text, openapiLine, candidate.method, candidate.path));
    updated.push({ file: page.file, from: page.key, to: key, reasons });
  }

  const removed = [];
  const reconciledKeys = new Set(updated.map((update) => update.to));
  if (reconciledKeys.size > 0) {
    for (const file of listMdxFiles(root)) {
      if (linkedFiles.has(file)) continue;
      const frontmatter = parseFrontmatter(fs.readFileSync(path.join(root, file), 'utf8'));
      if (!frontmatter?.isBareStub) continue;
      const ref = parseOpenapiRef(frontmatter.openapi);
      if (!ref || !isDefaultSpecRef(ref)) continue;
      const key = operationKey(ref.method, ref.path);
      if (!reconciledKeys.has(key)) continue;
      fs.rmSync(path.join(root, file));
      removed.push({ file, operation: key });
    }
  }

  unresolved.sort((a, b) => compareStrings(a.file, b.file));
  return { updated, removed, unresolved };
}

function parseArgs(argv) {
  const options = { normalize: false, reconcile: false, validate: false, root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--normalize') options.normalize = true;
    else if (arg === '--reconcile') options.reconcile = true;
    else if (arg === '--validate') options.validate = true;
    else if (arg === '--root' && argv[index + 1]) options.root = path.resolve(argv[++index]);
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (!options.normalize && !options.reconcile && !options.validate) {
    throw new Error('Pass at least one of --normalize, --reconcile, --validate.');
  }
  return options;
}

export function main(argv, log = console) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    log.error(error.message);
    log.error('Usage: sync-openapi-mdx.mjs [--normalize] [--reconcile] [--validate] [--root <dir>]');
    return 2;
  }
  const { root } = options;

  if (options.normalize) {
    const changed = normalizeSpecFile(path.join(root, DEFAULT_SPEC));
    log.log(`normalize: sorted ${changed} scope array(s) in ${DEFAULT_SPEC}`);
  }

  if (options.reconcile) {
    const { updated, removed, unresolved } = reconcile(root);
    for (const update of updated) {
      log.log(`reconcile: ${update.file}: ${update.from} -> ${update.to} (${update.reasons.join('; ')})`);
    }
    for (const stub of removed) {
      log.log(`reconcile: removed duplicate stub ${stub.file} (${stub.operation})`);
    }
    for (const page of unresolved) {
      log.log(`reconcile: left ${page.file} unchanged (${page.operation}): ${page.reason}`);
    }
    log.log(`reconcile: updated ${updated.length} page(s), removed ${removed.length} stub(s), ${unresolved.length} unresolved`);
  }

  if (options.validate) {
    const stale = findStalePages(root);
    for (const page of stale) {
      const message = `openapi: ${page.operation} is not in ${DEFAULT_SPEC}`;
      log.error(`validate: ${page.file}: ${message}`);
      if (process.env.GITHUB_ACTIONS === 'true') log.log(`::error file=${page.file}::${message}`);
    }
    if (stale.length > 0) {
      log.error(`validate: ${stale.length} nav-linked page(s) point at an operation missing from ${DEFAULT_SPEC}`);
      return 1;
    }
    log.log(`validate: every nav-linked openapi: page points at an operation in ${DEFAULT_SPEC}`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
