import { escapeHtml } from "./dom.js";

export function mdToHtml(md){
  if (!md) return "";
  let s = escapeHtml(md);

  s = s.replace(/```([\s\S]*?)```/g, (m, code) => `<pre><code>${code}</code></pre>`);
  s = s.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  s = s.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  s = s.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);

  const blocks = s.split(/\n{2,}/).map(p => {
    if (p.startsWith("<h") || p.startsWith("<pre")) return p;
    return `<p>${p.replace(/\n/g,"<br>")}</p>`;
  });
  return blocks.join("");
}
