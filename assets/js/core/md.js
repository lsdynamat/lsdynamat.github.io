import { escapeHtml } from "./dom.js";

// Small line-based Markdown renderer for assets/docs/*.md
// Supports: # headings, ``` fences, - / * / 1. / 1) lists (nested by indent),
// > quotes, | pipe | tables |, **bold**, *italic*, `code`, [links](url), bare URLs, paragraphs,
// $inline$ and $$display$$ LaTeX math (typeset by KaTeX in renderMath).

// A $ opens inline math only when followed by a non-space, and closes only when preceded by a
// non-space and not followed by a digit, so "$" in LS-DYNA comments or prices stays plain text.
function mathHtml(tex, display){
  const t = escapeHtml(tex.trim());
  return display
    ? `<div class="math display" data-tex="${t}">${t}</div>`
    : `<span class="math" data-tex="${t}">${t}</span>`;
}

function inline(text){
  const keep = [];
  const stash = (html) => { keep.push(html); return `\u0000${keep.length - 1}\u0000`; };
  let s = text.replace(/`([^`]+)`/g, (m, c) => stash(`<code>${escapeHtml(c)}</code>`));
  s = s.replace(/\$\$([^$]+?)\$\$/g, (m, tex) => stash(mathHtml(tex, true)));
  s = s.replace(/(^|[^\\$\w])\$(?=\S)([^$\n]*?[^\s\\])\$(?!\d)/g, (m, pre, tex) => pre + stash(mathHtml(tex, false)));
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, `$1<a href="$2" target="_blank" rel="noopener">$2</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>");
  s = s.replace(/ {2,}$/gm, "<br>");
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => keep[+i]);
}

// Typeset the math placeholders written by mdToHtml. Without window.katex the TeX source stays visible.
export function renderMath(root){
  if (!root || !window.katex) return;
  root.querySelectorAll(".math[data-tex]").forEach(el => {
    try {
      window.katex.render(el.dataset.tex, el, { displayMode: el.classList.contains("display"), throwOnError: false });
    } catch (e) { /* keep the source */ }
  });
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

    // display math: "$$ TeX $$" on one line, or a block between two "$$" lines
    const dm = line.match(/^\s*\$\$(.+)\$\$\s*$/);
    if (dm){
      if (stack.length && /^\s+/.test(line)) flushPara(); else flushAll();   // indented: stays in the list item
      out.push(mathHtml(dm[1], true));
      continue;
    }
    if (/^\s*\$\$\s*$/.test(line)){
      flushAll();
      const buf = [];
      while (++i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) buf.push(lines[i]);
      out.push(mathHtml(buf.join("\n"), true));
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
