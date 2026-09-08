// Paste into the rebuilt page's console (or run via the browser MCP), then save
// the returned JSON to clone-workspace/tic-tac-cheat/06-qa/clone-styles.json.
// Reads computed styles for every selector named in 03-design-spec/assertions.json.
(() => {
  const sels = ["body","main",".intro","h1","h1 span",".lede",".game-shell",".game-topline",".status",
    ".turn-pill",".turn-pill > span:first-child",".game-grid",".board",".board button","#new-game",
    ".scorecard",".score-head",".label",".scores",".scores > div + div",".scores strong",".house-score strong",
    ".fine-print",".incident-log",".incident-log li",".appeal","footer",".toast"];
  const props = ["color","backgroundColor","backgroundImage","fontFamily","fontWeight","fontStyle","letterSpacing",
    "textTransform","lineHeight","display","flexDirection","justifyContent","alignItems","gap","gridTemplateColumns",
    "position","overflowX","overflowY","listStyleType","cursor","maxWidth","minWidth","minHeight","aspectRatio",
    "containerType","borderTopWidth","borderTopStyle","borderTopColor","borderRightWidth","borderBottomWidth",
    "borderLeftWidth","borderLeftStyle","borderLeftColor","borderBottomColor","borderTopLeftRadius","marginTop",
    "boxShadow"];
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = null; continue; }
    const cs = getComputedStyle(el);
    out[s] = Object.fromEntries(props.map(p => [p, cs[p]]));
  }
  // pseudo-element marks
  const b = document.querySelector('.board button');
  if (b) {
    b.classList.add('x');
    out['.board button.x::before'] = { content: getComputedStyle(b, '::before').content, color: getComputedStyle(b, '::before').color };
    b.classList.remove('x'); b.classList.add('o');
    out['.board button.o::before'] = { content: getComputedStyle(b, '::before').content, color: getComputedStyle(b, '::before').color };
    b.classList.remove('o');
  }
  b && b.classList.add('winner');
  out['.board button.winner'] = { backgroundColor: getComputedStyle(document.querySelector('.board button')).backgroundColor };
  b && b.classList.remove('winner');
  // :root vars
  const rs = getComputedStyle(document.documentElement);
  out.__vars = Object.fromEntries(["--ink","--paper","--red","--yellow","--muted"].map(v => [v, rs.getPropertyValue(v).trim()]));
  return JSON.stringify(out, null, 1);
})();
