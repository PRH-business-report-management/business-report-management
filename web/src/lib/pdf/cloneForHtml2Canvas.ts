/**
 * html2canvas が解釈できない色関数を除去（一部環境で getComputedStyle が lab を返す場合の保険）。
 */
export function sanitizeColorCssValue(value: string): string {
  return value
    .replace(/\blab\([^)]*\)/gi, "rgb(0, 0, 0)")
    .replace(/\boklch\([^)]*\)/gi, "rgb(0, 0, 0)")
    .replace(/\blch\([^)]*\)/gi, "rgb(0, 0, 0)")
    .replace(/\bcolor-mix\([^)]*\)/gi, "rgb(128, 128, 128)");
}

/**
 * html2canvas が Tailwind 4 の lab()/oklch を含むスタイルシートを読んで落ちるのを防ぐため、
 * 各要素の getComputedStyle をインラインへ複製し、class / id を外す。
 */
export function prepareCloneForHtml2Canvas(
  source: HTMLElement,
  clone: HTMLElement
): void {
  function walk(orig: Element, copy: Element) {
    if (orig instanceof HTMLElement && copy instanceof HTMLElement) {
      copy.removeAttribute("class");
      copy.removeAttribute("id");
      const cs = getComputedStyle(orig);
      for (let i = 0; i < cs.length; i++) {
        const name = cs.item(i);
        if (!name) continue;
        let value = cs.getPropertyValue(name);
        if (!value) continue;
        if (/lab\(|oklch\(|lch\(|color-mix\(/i.test(value)) {
          value = sanitizeColorCssValue(value);
        }
        const priority = cs.getPropertyPriority(name);
        try {
          copy.style.setProperty(name, value, priority);
        } catch {
          /* インラインへ入れられないプロパティは無視 */
        }
      }
    }
    const n = Math.min(orig.children.length, copy.children.length);
    for (let j = 0; j < n; j++) {
      walk(orig.children[j]!, copy.children[j]!);
    }
  }
  walk(source, clone);

  clone.querySelectorAll("*").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.removeAttribute("class");
      node.removeAttribute("id");
      const st = node.getAttribute("style");
      if (st && /lab\(|oklch\(|lch\(|color-mix\(/i.test(st)) {
        node.setAttribute("style", sanitizeColorCssValue(st));
      }
    }
  });
}
