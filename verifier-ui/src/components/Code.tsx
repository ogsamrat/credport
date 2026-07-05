import { useState, type ReactNode } from 'react';

/*
 * A small editor-window styled code block: traffic-light chrome, a filename tab,
 * line numbers, and light syntax coloring for TypeScript, TSX, and shell. It is
 * intentionally lightweight (no dependency), tokenizing per line with a single
 * regex so long lines scroll inside the window rather than widening the page.
 */

type Lang = 'ts' | 'tsx' | 'bash';

const TS_KEYWORDS =
  'import|from|export|default|const|let|var|await|async|function|return|new|type|interface|extends|if|else|for|of|in|class|this';

function tokenRegex(lang: Lang): RegExp {
  if (lang === 'bash') {
    // comments (#...), strings, and a few common commands/flags
    return /(#[^\n]*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:npm|npx|pnpm|yarn|docker|cd|run|install|i)\b|--?[a-z][\w-]*)/g;
  }
  return new RegExp(
    `(\\/\\/[^\\n]*|'(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`(?:[^\`\\\\]|\\\\.)*\`|\\b(?:${TS_KEYWORDS})\\b|\\b\\d[\\w.]*)`,
    'g',
  );
}

function classFor(tok: string, lang: Lang): string {
  if (tok.startsWith('//') || tok.startsWith('#')) return 'tk-c';
  if (/^['"`]/.test(tok)) return 'tk-s';
  if (/^-/.test(tok)) return 'tk-f';
  if (/^\d/.test(tok)) return 'tk-n';
  if (lang === 'bash') return 'tk-cmd';
  return 'tk-k';
}

function highlight(code: string, lang: Lang): ReactNode[] {
  const re = tokenRegex(lang);
  return code.split('\n').map((line, li) => {
    const parts: ReactNode[] = [];
    let last = 0;
    let key = 0;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) parts.push(line.slice(last, m.index));
      parts.push(
        <span key={key++} className={classFor(m[0], lang)}>
          {m[0]}
        </span>,
      );
      last = m.index + m[0].length;
      if (m.index === re.lastIndex) re.lastIndex += 1; // guard against zero-width
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <span className="ln" key={li}>
        {parts.length ? parts : ' '}
      </span>
    );
  });
}

export function CodeWindow({
  file,
  lang = 'ts',
  code,
}: {
  file: string;
  lang?: Lang;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return (
    <div className="ide">
      <div className="ide__bar">
        <span className="ide__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <span className="ide__file">{file}</span>
        <button className={`ide__copy ${copied ? 'copied' : ''}`} onClick={copy} type="button">
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="ide__code">
        <code>{highlight(code, lang)}</code>
      </pre>
    </div>
  );
}
