import { escapeHtml } from "./dom.js";

// Small line-based Markdown renderer for assets/docs/*.md
// Supports: # headings, ``` fences, - / * / 1. / 1) lists (nested by indent),
// > quotes, | pipe | tables |, **bold**, *italic*, `code`, [links](url), bare URLs, paragraphs.

function inline(text){
  const codes = [];
  let s = escapeHtml(text).replace(/`([^`]+)`/g, (m, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, `$1<a href="$2" target="_blank" rel="noopener">$2</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(/ {2,}$/gm, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[+i]}</code>`);
}

const LIST_RE = /^(\s*)([-*]|\d+[.)])\s+(.*)$/;

export function mdToHtml(md){
  if (!md) return "";
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let para = [];
  let quote = [];
  const stack = []; // open lists: { indent, tag }

  const flushPara = () => {
    if (para.length){ out.push(`<p>${inline(para.join("\n")).replace(/\n/g, " ")}</p>`); para = []; }
  };
  const flushQuote = () => {
    if (quote.length){ out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`); quote = []; }
  };
  const closeLists = (toIndent = -1) => {
    while (stack.length && stack[stack.length - 1].indent > toIndent){
      out.push(`</li></${stack.pop().tag}>`);
    }
  };
  const flushAll = () => { flushPara(); flushQuote(); closeLists(); };

  for (let i = 0; i < lines.length; i++){
    const line = lines[i];

    if (/^\s*```/.test(line)){
      flushAll();
      const buf = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i]);
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h){
      flushAll();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }

    if (/^\s*$/.test(line)){
      flushPara(); flushQuote();
      // a blank line ends a list unless the next line continues it
      const next = lines[i + 1] || "";
      if (!LIST_RE.test(next) && !/^\s{2,}\S/.test(next)) closeLists();
      continue;
    }

    // pipe table: header row, |---| separator, body rows
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || "")){
      flushAll();
      const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map(c => inline(c.trim()));
      const head = cells(line).map(c => `<th>${c}</th>`).join("");
      const body = [];
      i++;
      while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])){
        body.push(`<tr>${cells(lines[++i]).map(c => `<td>${c}</td>`).join("")}</tr>`);
      }
      out.push(`<div class="tablewrap"><table class="data"><thead><tr>${head}</tr></thead><tbody>${body.join("")}</tbody></table></div>`);
      continue;
    }

    const q = line.match(/^>\s?(.*)$/);
    if (q){ flushPara(); closeLists(); quote.push(q[1]); continue; }

    const li = line.match(LIST_RE);
    if (li){
      flushPara(); flushQuote();
      const indent = li[1].length;
      const tag = /\d/.test(li[2]) ? "ol" : "ul";
      const top = stack[stack.length - 1];
      if (!top || indent > top.indent){
        stack.push({ indent, tag });
        out.push(`<${tag}><li>`);
      } else {
        closeLists(indent);
        const cur = stack[stack.length - 1];
        if (cur && cur.indent === indent && cur.tag === tag){
          out.push(`</li><li>`);
        } else {
          if (cur && cur.indent === indent) out.push(`</li></${stack.pop().tag}>`);
          stack.push({ indent, tag });
          out.push(`<${tag}><li>`);
        }
      }
      out.push(inline(li[3]));
      continue;
    }

    // indented continuation of a list item
    if (stack.length && /^\s+\S/.test(line)){
      out.push(" " + inline(line.replace(/^\s+/, "")));
      continue;
    }

    closeLists();
    flushQuote();
    para.push(line);
  }

  flushAll();
  return out.join("");
}
