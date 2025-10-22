export async function loadConfigList() {
  const res = await fetch('/configs/index.json');
  if (!res.ok) throw new Error('Failed to load config index');
  return res.json();
}

export async function loadConfigByPath(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load config: ${path}`);
  return res.json();
}
