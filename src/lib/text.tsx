import type { ReactNode } from 'react';

const MARKUP = /<link href="([^"]*)">(.*?)<\/link>|<pink>(.*?)<\/pink>/g;

/**
 * Renders the lightweight markup used inside the locale files:
 *
 *   <pink>highlighted</pink>            → brand-pink emphasis
 *   <link href="...">label</link>       → external link
 *
 * Keeping the markup in the JSON lets translators move emphasis and links
 * around a sentence without touching component code.
 */
export function parseTextWithLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  MARKUP.lastIndex = 0;
  while ((match = MARKUP.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [, href, linkLabel, pinkText] = match;
    if (href !== undefined) {
      parts.push(
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-whd-pink-bright underline decoration-whd-pink-bright/40 underline-offset-4 transition-colors duration-200 hover:text-whd-pink-soft"
        >
          {linkLabel}
        </a>,
      );
    } else {
      parts.push(
        <span key={match.index} className="font-bold text-whd-pink-soft">
          {pinkText}
        </span>,
      );
    }

    lastIndex = MARKUP.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
