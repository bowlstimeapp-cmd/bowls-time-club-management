import React, { useRef, useLayoutEffect } from 'react';

export default function EmailPreview({ html, onChange }) {
  const ref = useRef(null);
  const lastUserEdit = useRef('');

  const isFullHtml = /^<!DOCTYPE html/i.test(html || '') || /^<html/i.test(html || '');

  const extractBody = (fullHtml) => {
    const bodyMatch = (fullHtml || '').match(/<body[^>]*>([\s\S]*)<\/body>/i);
    return bodyMatch ? bodyMatch[1] : (fullHtml || '');
  };

  const wrapBody = (bodyContent) => {
    if (!isFullHtml) return bodyContent;
    const headMatch = (html || '').match(/<head[^>]*>([\s\S]*)<\/head>/i);
    const head = headMatch ? headMatch[1] : '<meta charset="utf-8">';
    return `<!DOCTYPE html>\n<html lang="en">\n<head>${head}</head>\n<body>${bodyContent}</body>\n</html>`;
  };

  const bodyContent = extractBody(html);

  useLayoutEffect(() => {
    if (ref.current && bodyContent !== lastUserEdit.current) {
      ref.current.innerHTML = bodyContent;
    }
  }, [bodyContent]);

  const handleInput = () => {
    if (onChange && ref.current) {
      lastUserEdit.current = ref.current.innerHTML;
      onChange(wrapBody(ref.current.innerHTML));
    }
  };

  if (!html) {
    return (
      <div className="border rounded-md p-8 text-center text-gray-400 text-sm">
        Nothing to preview
      </div>
    );
  }

  return (
    <>
      <div
        ref={ref}
        contentEditable={!!onChange}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={handleInput}
        onBlur={handleInput}
        title="Click to edit"
        className="w-full h-[500px] overflow-y-auto border rounded-md bg-white text-sm outline-none cursor-text focus:ring-2 focus:ring-emerald-400"
        style={{ fontFamily: '-apple-system, Helvetica, Arial, sans-serif' }}
      />
      {onChange && (
        <p className="text-xs text-gray-400 mt-1">Click in the preview to edit — changes save automatically.</p>
      )}
    </>
  );
}