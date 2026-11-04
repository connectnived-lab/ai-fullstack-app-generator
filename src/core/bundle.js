// One text file that holds a whole generated project, with a header line before each file.
export function toBundle(files) {
  return Object.keys(files)
    .sort()
    .map((path) => `=== ${path} ===\n${files[path]}`)
    .join('\n');
}

export function parseBundle(text) {
  const files = {};
  const parts = String(text).split(/^=== (.+?) ===\n/m);
  for (let i = 1; i < parts.length; i += 2) {
    files[parts[i]] = parts[i + 1].replace(/\n$/, '\n');
  }
  return files;
}
