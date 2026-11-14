import { useLayoutEffect, useRef } from 'react';

/**
 * Sidebar brand lockup: ASTRA wordmark with the role tag underneath.
 * The tag's letter-spacing is computed on mount (and once webfonts finish
 * loading) so its rendered width exactly matches the ASTRA wordmark above it —
 * a justified two-line block, in every locale.
 */
export default function BrandLockup({ tag }: { tag: string }) {
  const nameRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const name = nameRef.current;
    const tag = tagRef.current;
    if (!name || !tag) return;
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return;

    const fit = () => {
      // Measure the ASTRA wordmark at its real font + letter-spacing.
      const ns = getComputedStyle(name);
      ctx.font = `${ns.fontWeight} ${ns.fontSize} ${ns.fontFamily}`;
      ctx.letterSpacing = ns.letterSpacing === 'normal' ? '0px' : ns.letterSpacing;
      const target = ctx.measureText(name.textContent ?? '').width;

      // Measure the tag with zero tracking, then distribute the difference
      // evenly across its glyphs (CSS letter-spacing adds after every glyph,
      // including the last, so dividing by the glyph count lands flush).
      const ts = getComputedStyle(tag);
      const upper = ts.textTransform === 'uppercase';
      const text = upper ? (tag.textContent ?? '').toUpperCase() : (tag.textContent ?? '');
      ctx.font = `${ts.fontWeight} ${ts.fontSize} ${ts.fontFamily}`;
      ctx.letterSpacing = '0px';
      const natural = ctx.measureText(text).width;
      const glyphs = [...text].length;
      const spacing = glyphs > 0 ? Math.max(0, (target - natural) / glyphs) : 0;
      tag.style.letterSpacing = `${spacing.toFixed(2)}px`;
    };

    fit();
    // Cinzel/JetBrains Mono load asynchronously — re-measure once ready.
    void document.fonts?.ready.then(fit);
  }, [tag]);

  return (
    <div className="brand-text">
      <div className="name" ref={nameRef}>ASTRA</div>
      <div className="tag" ref={tagRef}>{tag}</div>
    </div>
  );
}
