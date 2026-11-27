import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  collectNavPages,
  findStalePages,
  isDeleteToPostMigration,
  listOperations,
  normalizeSpec,
  normalizeSpecFile,
  parseFrontmatter,
  parseOpenapiRef,
  reconcile,
  slugify,
  slugifyIdentifier,
} from './sync-openapi-mdx.mjs';

const SCRIPT = fileURLToPath(new URL('./sync-openapi-mdx.mjs', import.meta.url));

const operation = (summary, operationId, scopes = ['b.read', 'a.read']) => ({
  summary,
  operationId,
  security: [{ OAuth2UserToken: scopes }, { UserToken: [] }],
});

/** Writes a docs root: `files` maps a relative path to its content, objects are written as JSON. */
function makeRoot(t, { paths = {}, pages = [], files = {} }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-openapi-mdx-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const all = {
    'openapi.json': { openapi: '3.0.0', paths },
    'docs.json': { navigation: { products: [{ product: 'API', tabs: [{ tab: 'Reference', groups: [{ group: 'Chat', pages }] }] }] } },
    ...files,
  };
  for (const [name, content] of Object.entries(all)) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  return root;
}

const read = (root, name) => fs.readFileSync(path.join(root, name), 'utf8');
const exists = (root, name) => fs.existsSync(path.join(root, name));
const stub = (ref) => `---\nopenapi: ${ref}\n---\n`;
const runCli = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

test('normalizeSpec sorts scope arrays and nothing else', () => {
  const spec = {
    security: [{ OAuth2UserToken: ['z', 'a'] }],
    paths: {
      '/2/a': {
        parameters: [{ name: 'zeta' }, { name: 'alpha' }],
        get: {
          tags: ['Zeta', 'Alpha'],
          security: [{ UserToken: [] }, { OAuth2UserToken: ['users.read', 'dm.write', 'tweet.read'] }],
        },
        post: { security: [{ OAuth2UserToken: ['dm.write', 'tweet.read'] }] },
      },
    },
    webhooks: { event: { post: { security: [{ OAuth2UserToken: ['b', 'a'] }] } } },
  };

  assert.equal(normalizeSpec(spec), 3);
  assert.deepEqual(spec.security, [{ OAuth2UserToken: ['a', 'z'] }]);
  assert.deepEqual(spec.paths['/2/a'].get.security, [
    { UserToken: [] },
    { OAuth2UserToken: ['dm.write', 'tweet.read', 'users.read'] },
  ]);
  assert.deepEqual(spec.paths['/2/a'].get.tags, ['Zeta', 'Alpha']);
  assert.deepEqual(spec.paths['/2/a'].parameters, [{ name: 'zeta' }, { name: 'alpha' }]);
  assert.deepEqual(spec.webhooks.event.post.security, [{ OAuth2UserToken: ['a', 'b'] }]);
  assert.equal(normalizeSpec(spec), 0);
});

test('normalizeSpec gives the same result for any scope order', () => {
  const first = { paths: { '/2/a': { get: operation('A', 'a', ['users.read', 'dm.write', 'tweet.read']) } } };
  const second = { paths: { '/2/a': { get: operation('A', 'a', ['tweet.read', 'users.read', 'dm.write']) } } };
  normalizeSpec(first);
  normalizeSpec(second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('normalizeSpecFile keeps the formatting and only writes when something changed', (t) => {
  const root = makeRoot(t, { paths: { '/2/a': { get: operation('A', 'a') } } });
  const specFile = path.join(root, 'openapi.json');
  assert.equal(read(root, 'openapi.json').endsWith('\n'), false);

  assert.equal(normalizeSpecFile(specFile), 1);
  const normalized = read(root, 'openapi.json');
  assert.equal(normalized, JSON.stringify(JSON.parse(normalized), null, 2));
  assert.deepEqual(JSON.parse(normalized).paths['/2/a'].get.security[0].OAuth2UserToken, ['a.read', 'b.read']);

  const mtime = fs.statSync(specFile).mtimeMs;
  assert.equal(normalizeSpecFile(specFile), 0);
  assert.equal(fs.statSync(specFile).mtimeMs, mtime);

  fs.writeFileSync(specFile, `${JSON.stringify({ paths: { '/2/a': { get: operation('A', 'a') } } }, null, 2)}\n`);
  normalizeSpecFile(specFile);
  assert.equal(read(root, 'openapi.json').endsWith('}\n'), true);
});

test('parseOpenapiRef reads default-spec, custom-spec and unsupported values', () => {
  assert.deepEqual(parseOpenapiRef('POST /2/tweets'), { spec: null, method: 'post', path: '/2/tweets' });
  assert.deepEqual(parseOpenapiRef('ads-openapi.json get /12/accounts'), {
    spec: 'ads-openapi.json',
    method: 'get',
    path: '/12/accounts',
  });
  assert.equal(parseOpenapiRef('webhook postCreated'), null);
  assert.equal(parseOpenapiRef(''), null);
  assert.equal(parseOpenapiRef(null), null);
});

test('parseFrontmatter reads openapi and title and detects bare stubs', () => {
  const page = parseFrontmatter('---\nopenapi: "get /2/a"\ntitle: \'A page\'\n---\n\nBody\n');
  assert.equal(page.openapi, 'get /2/a');
  assert.equal(page.openapiLine, 1);
  assert.equal(page.title, 'A page');
  assert.equal(page.isBareStub, false);

  assert.equal(parseFrontmatter(stub('get /2/a')).isBareStub, true);
  assert.equal(parseFrontmatter('---\r\nopenapi: get /2/a\r\n---\r\n').isBareStub, true);
  assert.equal(parseFrontmatter('---\nopenapi: get /2/a\n---\n\n<Note>Kept</Note>\n').isBareStub, false);
  assert.equal(parseFrontmatter('---\nopenapi: get /2/a\ntag: "NEW"\n---\n').isBareStub, false);
  assert.equal(parseFrontmatter('# No frontmatter\n'), null);
});

test('collectNavPages finds pages in nested groups and ignores other strings', () => {
  const pages = collectNavPages({
    navigation: {
      products: [
        {
          product: 'API',
          tabs: [
            {
              tab: 'Reference',
              dropdowns: [
                {
                  dropdown: 'Chat',
                  icon: 'message',
                  groups: [{ group: 'Top', root: 'x-api/chat/index', pages: ['/x-api/chat/a', { group: 'Nested', pages: ['x-api/chat/b'] }] }],
                },
              ],
            },
          ],
        },
      ],
      global: { anchors: [{ anchor: 'Status', href: 'https://example.com' }] },
    },
  });
  assert.deepEqual([...pages].sort(), ['x-api/chat/a', 'x-api/chat/b', 'x-api/chat/index']);
});

test('listOperations indexes operations by lower-case method and path', () => {
  const operations = listOperations({
    paths: { '/2/a': { parameters: [], GET: operation('Get A', 'getA'), post: operation('Create A', 'createA') } },
    webhooks: { event: { post: operation('Event', 'event') } },
  });
  assert.deepEqual([...operations.keys()], ['get /2/a', 'post /2/a']);
  assert.equal(operations.get('get /2/a').summary, 'Get A');
});

test('slugify and slugifyIdentifier', () => {
  assert.equal(
    slugify('Turn Off Disappearing Messages in a Chat Conversation'),
    'turn-off-disappearing-messages-in-a-chat-conversation',
  );
  assert.equal(slugify('Get OpenAPI Spec'), 'get-openapi-spec');
  assert.equal(slugifyIdentifier('unmuteChatConversation'), 'unmute-chat-conversation');
  assert.equal(slugify(undefined), '');
});

test('isDeleteToPostMigration accepts /remove, /delete, /disable and un* only', () => {
  const stale = (apiPath, method = 'delete') => ({ method, path: apiPath });
  const post = (apiPath) => ({ method: 'post', path: apiPath });

  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/message_ttl'), post('/2/c/{id}/message_ttl/remove')), true);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}'), post('/2/c/{id}/delete')), true);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/invite'), post('/2/c/{id}/invite/disable')), true);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/mute'), post('/2/c/{id}/unmute')), true);

  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/mute'), post('/2/c/{id}/mute')), false);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/mute'), post('/2/c/{id}/unread')), false);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/mute'), post('/2/other/{id}/unmute')), false);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/invite'), post('/2/c/{id}/invite/enable')), false);
  assert.equal(isDeleteToPostMigration(stale('/2/c/{id}/mute', 'put'), post('/2/c/{id}/unmute')), false);
  assert.equal(
    isDeleteToPostMigration(stale('/2/c/{id}/mute'), { method: 'put', path: '/2/c/{id}/unmute' }),
    false,
  );
});

test('reconcile repoints the DELETE -> POST chat pages and removes the duplicate stubs', (t) => {
  const root = makeRoot(t, {
    paths: {
      '/2/chat/conversations/{id}/message_ttl': { put: operation('Turn On Disappearing Messages in a Chat Conversation', 'updateChatConversationMessageTtl') },
      '/2/chat/conversations/{id}/message_ttl/remove': { post: operation('Turn Off Disappearing Messages in a Chat Conversation', 'deleteChatConversationMessageTtl') },
      '/2/chat/conversations/{id}/invite': { post: operation('Enable a Chat Group Invite Link', 'enableChatGroupInvite') },
      '/2/chat/conversations/{id}/invite/disable': { post: operation('Disable a Chat Group Invite Link', 'disableChatGroupInvite') },
      '/2/chat/conversations/{id}/mute': { post: operation('Mute a Chat Conversation', 'muteChatConversation') },
      '/2/chat/conversations/{id}/unmute': { post: operation('Unmute a Chat Conversation', 'unmuteChatConversation') },
      '/2/chat/conversations/{id}/unread': { post: operation('Mark a Chat Conversation as Unread', 'markChatConversationUnread') },
    },
    pages: [
      'x-api/chat/turn-on-disappearing-messages-in-a-chat-conversation',
      'x-api/chat/turn-off-disappearing-messages-in-a-chat-conversation',
      'x-api/chat/enable-a-chat-group-invite-link',
      'x-api/chat/disable-a-chat-group-invite-link',
      'x-api/chat/mute-a-chat-conversation',
      'x-api/chat/unmute-a-chat-conversation',
    ],
    files: {
      'x-api/chat/turn-on-disappearing-messages-in-a-chat-conversation.mdx': stub('put /2/chat/conversations/{id}/message_ttl'),
      'x-api/chat/turn-off-disappearing-messages-in-a-chat-conversation.mdx': '---\nopenapi: delete /2/chat/conversations/{id}/message_ttl\n---',
      'x-api/chat/enable-a-chat-group-invite-link.mdx': stub('post /2/chat/conversations/{id}/invite'),
      'x-api/chat/disable-a-chat-group-invite-link.mdx': stub('delete /2/chat/conversations/{id}/invite'),
      'x-api/chat/mute-a-chat-conversation.mdx': stub('post /2/chat/conversations/{id}/mute'),
      'x-api/chat/unmute-a-chat-conversation.mdx': stub('delete /2/chat/conversations/{id}/mute'),
      'x-api/chat/delete-conversation-message-ttl.mdx': stub('post /2/chat/conversations/{id}/message_ttl/remove'),
      'x-api/chat/disable-group-invite.mdx': stub('post /2/chat/conversations/{id}/invite/disable'),
      'x-api/chat/unmute-conversation.mdx': stub('post /2/chat/conversations/{id}/unmute'),
      'x-api/chat/mark-conversation-as-unread.mdx': stub('post /2/chat/conversations/{id}/unread'),
    },
  });

  const result = reconcile(root);

  assert.deepEqual(
    result.updated.map(({ file, from, to }) => ({ file, from, to })),
    [
      {
        file: 'x-api/chat/disable-a-chat-group-invite-link.mdx',
        from: 'delete /2/chat/conversations/{id}/invite',
        to: 'post /2/chat/conversations/{id}/invite/disable',
      },
      {
        file: 'x-api/chat/turn-off-disappearing-messages-in-a-chat-conversation.mdx',
        from: 'delete /2/chat/conversations/{id}/message_ttl',
        to: 'post /2/chat/conversations/{id}/message_ttl/remove',
      },
      {
        file: 'x-api/chat/unmute-a-chat-conversation.mdx',
        from: 'delete /2/chat/conversations/{id}/mute',
        to: 'post /2/chat/conversations/{id}/unmute',
      },
    ],
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.removed.map((entry) => entry.file).sort(), [
    'x-api/chat/delete-conversation-message-ttl.mdx',
    'x-api/chat/disable-group-invite.mdx',
    'x-api/chat/unmute-conversation.mdx',
  ]);

  assert.equal(
    read(root, 'x-api/chat/turn-off-disappearing-messages-in-a-chat-conversation.mdx'),
    '---\nopenapi: post /2/chat/conversations/{id}/message_ttl/remove\n---',
  );
  assert.equal(read(root, 'x-api/chat/unmute-a-chat-conversation.mdx'), stub('post /2/chat/conversations/{id}/unmute'));
  assert.equal(exists(root, 'x-api/chat/unmute-conversation.mdx'), false);
  // A stub for an operation no reconciled page took over is a new endpoint, not a duplicate.
  assert.equal(exists(root, 'x-api/chat/mark-conversation-as-unread.mdx'), true);
  assert.deepEqual(findStalePages(root), []);

  assert.deepEqual(reconcile(root), { updated: [], removed: [], unresolved: [] });
});

test('reconcile matches on summary, title and operationId and keeps the rest of the page', (t) => {
  const root = makeRoot(t, {
    paths: {
      '/2/widgets/{widget_id}': { get: operation('Get Widget by ID', 'getWidget') },
      '/2/gadgets/search/all': { get: operation('Search every gadget', 'searchGadgets') },
      '/2/gizmos/{id}/pause': { post: operation('Suspend gizmo', 'pauseGizmo') },
    },
    pages: ['x-api/widgets/get-widget-by-id', 'x-api/gadgets/search', 'x-api/gizmos/pause-gizmo'],
    files: {
      'x-api/widgets/get-widget-by-id.mdx': '---\nopenapi: "get /2/widgets/{id}"\ntag: "NEW"\n---\n\n<Note>Kept</Note>\n',
      'x-api/gadgets/search.mdx': '---\r\ntitle: "Search Every Gadget"\r\nopenapi: get /2/gadgets/search\r\n---\r\n',
      'x-api/gizmos/pause-gizmo.mdx': stub('put /2/gizmos/{id}/state'),
    },
  });

  const result = reconcile(root);

  assert.deepEqual(
    result.updated.map(({ file, reasons }) => ({ file, reasons })),
    [
      { file: 'x-api/gadgets/search.mdx', reasons: ['summary matches title'] },
      { file: 'x-api/gizmos/pause-gizmo.mdx', reasons: ['operationId matches page'] },
      { file: 'x-api/widgets/get-widget-by-id.mdx', reasons: ['summary matches file name'] },
    ],
  );
  assert.equal(
    read(root, 'x-api/widgets/get-widget-by-id.mdx'),
    '---\nopenapi: "get /2/widgets/{widget_id}"\ntag: "NEW"\n---\n\n<Note>Kept</Note>\n',
  );
  assert.equal(
    read(root, 'x-api/gadgets/search.mdx'),
    '---\r\ntitle: "Search Every Gadget"\r\nopenapi: get /2/gadgets/search/all\r\n---\r\n',
  );
  assert.equal(read(root, 'x-api/gizmos/pause-gizmo.mdx'), stub('post /2/gizmos/{id}/pause'));
});

test('reconcile leaves a page alone when the replacement is ambiguous or missing', (t) => {
  const pages = {
    'x-api/chat/unmute-a-chat-conversation.mdx': stub('delete /2/chat/conversations/{id}/mute'),
    'x-api/account-activity/create-replay-job.mdx': '---\nopenapi: post /2/account_activity/replay\ntitle: "Create replay job"\n---\n\n<Warning>Deprecated</Warning>\n',
    'x-api/chat/first-leave.mdx': '---\nopenapi: delete /2/chat/members\ntitle: "Leave a Chat"\n---\n',
    'x-api/chat/second-leave.mdx': '---\nopenapi: delete /2/chat/membership\ntitle: "Leave a Chat"\n---\n',
  };
  const root = makeRoot(t, {
    paths: {
      // Two operations match the unmute page: one by summary, one by path.
      '/2/chat/conversations/{id}/unmute': { post: operation('Remove a Chat Mute', 'removeChatMute') },
      '/2/chat/unmute/{id}': { post: operation('Unmute a Chat Conversation', 'unmuteChatConversation') },
      // Two stale pages match this operation.
      '/2/chat/leave': { post: operation('Leave a Chat', 'leaveChat') },
    },
    pages: Object.keys(pages).map((file) => file.replace(/\.mdx$/, '')),
    files: { ...pages, 'x-api/chat/unmute-conversation.mdx': stub('post /2/chat/conversations/{id}/unmute') },
  });

  const result = reconcile(root);

  assert.deepEqual(result.updated, []);
  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.unresolved, [
    {
      file: 'x-api/account-activity/create-replay-job.mdx',
      operation: 'post /2/account_activity/replay',
      reason: 'no replacement operation found',
    },
    {
      file: 'x-api/chat/first-leave.mdx',
      operation: 'delete /2/chat/members',
      reason: 'several stale pages match post /2/chat/leave',
    },
    {
      file: 'x-api/chat/second-leave.mdx',
      operation: 'delete /2/chat/membership',
      reason: 'several stale pages match post /2/chat/leave',
    },
    {
      file: 'x-api/chat/unmute-a-chat-conversation.mdx',
      operation: 'delete /2/chat/conversations/{id}/mute',
      reason: 'ambiguous: post /2/chat/conversations/{id}/unmute, post /2/chat/unmute/{id}',
    },
  ]);
  for (const [file, content] of Object.entries(pages)) assert.equal(read(root, file), content);
  assert.equal(exists(root, 'x-api/chat/unmute-conversation.mdx'), true);
});

test('reconcile never reuses an operation another nav-linked page documents', (t) => {
  const root = makeRoot(t, {
    paths: { '/2/chat/conversations/{id}/unmute': { post: operation('Unmute a Chat Conversation', 'unmuteChatConversation') } },
    pages: ['x-api/chat/unmute-a-chat-conversation', 'x-api/chat/unmute'],
    files: {
      'x-api/chat/unmute-a-chat-conversation.mdx': stub('delete /2/chat/conversations/{id}/mute'),
      'x-api/chat/unmute.mdx': stub('post /2/chat/conversations/{id}/unmute'),
    },
  });

  const result = reconcile(root);

  assert.deepEqual(result.updated, []);
  assert.equal(result.unresolved[0].reason, 'no replacement operation found');
  assert.equal(read(root, 'x-api/chat/unmute.mdx'), stub('post /2/chat/conversations/{id}/unmute'));
});

test('reconcile keeps an unlinked duplicate page that has content of its own', (t) => {
  const withBody = '---\nopenapi: post /2/chat/conversations/{id}/unmute\n---\n\nHand-written notes.\n';
  const withTitle = '---\nopenapi: post /2/chat/conversations/{id}/unmute\ntitle: "Unmute"\n---\n';
  const root = makeRoot(t, {
    paths: { '/2/chat/conversations/{id}/unmute': { post: operation('Unmute a Chat Conversation', 'unmuteChatConversation') } },
    pages: ['x-api/chat/unmute-a-chat-conversation'],
    files: {
      'x-api/chat/unmute-a-chat-conversation.mdx': stub('delete /2/chat/conversations/{id}/mute'),
      'x-api/chat/unmute-conversation.mdx': stub('post /2/chat/conversations/{id}/unmute'),
      'x-api/chat/unmute-notes.mdx': withBody,
      'x-api/chat/unmute-titled.mdx': withTitle,
      '.xdk-gen/docs/unmute.mdx': stub('post /2/chat/conversations/{id}/unmute'),
    },
  });

  const result = reconcile(root);

  assert.deepEqual(result.removed, [
    { file: 'x-api/chat/unmute-conversation.mdx', operation: 'post /2/chat/conversations/{id}/unmute' },
  ]);
  assert.equal(read(root, 'x-api/chat/unmute-notes.mdx'), withBody);
  assert.equal(read(root, 'x-api/chat/unmute-titled.mdx'), withTitle);
  assert.equal(exists(root, '.xdk-gen/docs/unmute.mdx'), true);
});

test('findStalePages reports nav-linked default-spec pages only', (t) => {
  const root = makeRoot(t, {
    paths: { '/2/tweets': { get: operation('Get Posts', 'getPosts') } },
    pages: [
      'x-api/posts/get-posts',
      'x-api/posts/stale',
      'x-api/posts/stale-with-default-spec-prefix',
      'x-ads-api/accounts',
      'x-api/posts/guide',
      'x-api/posts/webhook',
      'x-api/posts/missing-file',
    ],
    files: {
      'x-api/posts/get-posts.mdx': stub('GET /2/tweets'),
      'x-api/posts/stale.mdx': stub('delete /2/tweets/{id}/gone'),
      'x-api/posts/stale-with-default-spec-prefix.mdx': stub('"/openapi.json post /2/tweets/gone"'),
      'x-ads-api/accounts.mdx': stub('ads-openapi.json get /12/accounts'),
      'x-api/posts/guide.mdx': '---\ntitle: "Guide"\n---\n\nNo openapi key.\n',
      'x-api/posts/webhook.mdx': stub('webhook postCreated'),
      'x-api/posts/unlinked-stale.mdx': stub('get /2/not/in/nav'),
    },
  });

  assert.deepEqual(findStalePages(root), [
    { file: 'x-api/posts/stale-with-default-spec-prefix.mdx', operation: 'post /2/tweets/gone' },
    { file: 'x-api/posts/stale.mdx', operation: 'delete /2/tweets/{id}/gone' },
  ]);
});

test('CLI: --validate exits 1 and names the file and the stale operation', (t) => {
  const root = makeRoot(t, {
    paths: { '/2/tweets': { get: operation('Get Posts', 'getPosts') } },
    pages: ['x-api/posts/get-posts', 'x-api/posts/stale'],
    files: {
      'x-api/posts/get-posts.mdx': stub('get /2/tweets'),
      'x-api/posts/stale.mdx': stub('delete /2/tweets/{id}/gone'),
    },
  });

  const failed = runCli('--validate', '--root', root);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /x-api\/posts\/stale\.mdx: openapi: delete \/2\/tweets\/\{id\}\/gone is not in openapi\.json/);
  assert.doesNotMatch(failed.stderr, /get-posts/);

  fs.rmSync(path.join(root, 'x-api/posts/stale.mdx'));
  const passed = runCli('--validate', '--root', root);
  assert.equal(passed.status, 0, passed.stderr);
});

test('CLI: --normalize --reconcile --validate fixes a docs root and is idempotent', (t) => {
  const root = makeRoot(t, {
    paths: {
      '/2/chat/conversations/{id}/unmute': {
        post: operation('Unmute a Chat Conversation', 'unmuteChatConversation', ['users.read', 'dm.write']),
      },
    },
    pages: ['x-api/chat/unmute-a-chat-conversation'],
    files: {
      'x-api/chat/unmute-a-chat-conversation.mdx': stub('delete /2/chat/conversations/{id}/mute'),
      'x-api/chat/unmute-conversation.mdx': stub('post /2/chat/conversations/{id}/unmute'),
    },
  });
  const snapshot = () => ['openapi.json', 'x-api/chat/unmute-a-chat-conversation.mdx'].map((name) => read(root, name));

  // Flags are given out of order on purpose: validate must still run last.
  const first = runCli('--validate', '--reconcile', '--normalize', '--root', root);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /normalize: sorted 1 scope array/);
  assert.match(first.stdout, /reconcile: updated 1 page\(s\), removed 1 stub\(s\), 0 unresolved/);
  assert.equal(exists(root, 'x-api/chat/unmute-conversation.mdx'), false);
  const afterFirst = snapshot();

  const second = runCli('--normalize', '--reconcile', '--validate', '--root', root);
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /normalize: sorted 0 scope array/);
  assert.match(second.stdout, /reconcile: updated 0 page\(s\), removed 0 stub\(s\), 0 unresolved/);
  assert.deepEqual(snapshot(), afterFirst);
});

test('CLI: rejects unknown or missing flags', () => {
  assert.equal(runCli().status, 2);
  assert.equal(runCli('--fix').status, 2);
});
