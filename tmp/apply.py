import sys
src_path, dst_path, front_path = sys.argv[1], sys.argv[2], sys.argv[3]

src = open(src_path).read()
lines = src.split('\n')
end = 0
if lines[0] == '---':
    for i, ln in enumerate(lines[1:], 1):
        if ln == '---':
            end = i + 1
            break

front = open(front_path).read()

body_lines = lines[end:]
while body_lines and body_lines[0].strip() == '':
    body_lines.pop(0)

if '## API リファレンス' in front:
    if body_lines and body_lines[0].strip() == '## API Reference':
        body_lines.pop(0)
        while body_lines and body_lines[0].strip() == '':
            body_lines.pop(0)

body = '\n'.join(body_lines)
result = front + body

open(dst_path, 'w').write(result)
print("done", dst_path, len(result))
