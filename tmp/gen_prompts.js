const fs = require('fs');
const template = fs.readFileSync('/tmp/prompt_template.txt', 'utf8');

const langs = [
  { code: 'ja', name: 'Japanese' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ko', name: 'Korean' },
];

const slices = [
  { label: 'xdks_ts_interfaces', file: '/tmp/groups/xdks_ts_interfaces.txt' },
  { label: 'xdks_misc', file: '/tmp/groups/xdks_misc.txt' },
  { label: 'xapi_posts', file: '/tmp/groups/xapi_posts.txt' },
  { label: 'xapi_users_lists', file: '/tmp/groups/xapi_users_lists.txt' },
  { label: 'xapi_misc', file: '/tmp/groups/xapi_misc.txt' },
  { label: 'xapi_rest', file: '/tmp/groups/xapi_rest.txt' },
  { label: 'other', file: '/tmp/groups/other.txt' },
];

const tasks = [];
for (const lang of langs) {
  for (const slice of slices) {
    const files = fs.readFileSync(slice.file, 'utf8').trim();
    const prompt = template
      .replaceAll('{{LANG_CODE}}', lang.code)
      .replaceAll('{{LANG_NAME}}', lang.name)
      .replaceAll('{{GROUP_LABEL}}', slice.label)
      .replaceAll('{{FILES}}', files);
    tasks.push({
      description: `translate ${slice.label} → ${lang.code}`,
      prompt,
    });
  }
}

fs.writeFileSync('/tmp/tasks.json', JSON.stringify(tasks, null, 2));
console.log(`Generated ${tasks.length} tasks`);
console.log(`Total prompt bytes: ${tasks.reduce((s, t) => s + t.prompt.length, 0)}`);
