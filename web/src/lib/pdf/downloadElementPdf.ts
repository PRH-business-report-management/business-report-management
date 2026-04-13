import { prepareCloneForHtml2Canvas } from "./cloneForHtml2Canvas";

/**
 * クライアント専用: DOM を PDF 保存。
 * メイン文書の Tailwind 等（lab 色）を html2canvas が読まないよう、空の iframe 内へ渡してから生成する。
 */
export async function downloadElementPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const clone = element.cloneNode(true) as HTMLElement;
  prepareCloneForHtml2Canvas(element, clone);

  clone.style.position = "relative";
  clone.style.left = "auto";
  clone.style.top = "auto";
  clone.style.zIndex = "auto";
  clone.style.width = "190mm";
  clone.style.maxWidth = "190mm";
  clone.style.minHeight = "auto";
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.background = "#ffffff";
  clone.style.color = "#000000";
  clone.style.padding = "12px";
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";
  clone.removeAttribute("aria-hidden");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "pdf-export");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:210mm;min-height:1200px;height:auto;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    document.body.removeChild(iframe);
    throw new Error("PDF用 iframe を開けませんでした");
  }

  idoc.open();
  idoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head><body style="margin:0;padding:0;background:#fff;color:#000"></body></html>`
  );
  idoc.close();

  const style = idoc.createElement("style");
  style.textContent = `
    html, body { height: auto !important; }
    * { box-sizing: border-box; }
    table { page-break-inside: auto; break-inside: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: auto; break-inside: auto; }
    th, td { vertical-align: top; overflow: visible; }
    h1, h2, h3, h4 { page-break-inside: avoid; break-inside: avoid; }
    ul, ol { break-inside: auto; }
    li { break-inside: avoid; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  `;
  idoc.head.appendChild(style);

  const imported = idoc.importNode(clone, true) as HTMLElement;
  idoc.body.appendChild(imported);

  idoc.body.style.margin = "0";
  idoc.body.style.padding = "0";
  idoc.body.style.height = "auto";
  idoc.body.style.minHeight = "100%";
  idoc.body.style.overflow = "visible";
  idoc.documentElement.style.height = "auto";
  idoc.documentElement.style.overflow = "visible";

  void imported.offsetHeight;
  await new Promise<void>((r) => {
    requestAnimationFrame(() => requestAnimationFrame(() => r()));
  });

  /** iframe が低いと scrollHeight が足りず html2canvas が途中で切るため長さに合わせる */
  const measure = () =>
    Math.max(
      imported.scrollHeight,
      imported.offsetHeight,
      idoc.body.scrollHeight,
      idoc.documentElement.scrollHeight
    );
  let contentH = measure();
  iframe.style.height = `${Math.min(contentH + 400, 200000)}px`;
  idoc.body.style.minHeight = `${contentH}px`;
  void imported.offsetHeight;
  await new Promise<void>((r) => setTimeout(r, 0));
  contentH = measure();
  const contentW = Math.max(
    imported.scrollWidth,
    imported.offsetWidth,
    idoc.documentElement.scrollWidth,
    800
  );

  /** ブラウザの canvas 上限を超えると下が欠けるので scale を下げる */
  const maxCanvasPx = 12000;
  let canvasScale = 2;
  if (contentH * canvasScale > maxCanvasPx) {
    canvasScale = Math.max(1, maxCanvasPx / contentH);
  }

  try {
    const mod = await import("html2pdf.js");
    type Html2Pdf = () => {
      set: (opts: object) => {
        from: (el: HTMLElement) => { save: () => Promise<void> };
      };
    };
    const html2pdf = mod.default as Html2Pdf;
    await html2pdf()
      .set({
        margin: [12, 10, 12, 10],
        filename,
        image: { type: "jpeg", quality: 0.95 },
        pagebreak: {
          // avoid-all は空白が大きく出ることがあるため、CSS 優先で制御する
          mode: ["css", "legacy"],
          avoid: ["h1", "h2", "h3", ".avoid-break"],
        },
        html2canvas: {
          scale: canvasScale,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#ffffff",
          foreignObjectRendering: false,
          width: contentW,
          height: contentH,
          windowWidth: contentW,
          windowHeight: contentH,
          onclone: (clonedDoc: Document) => {
            clonedDoc
              .querySelectorAll('link[rel="stylesheet"], style')
              .forEach((el) => el.remove());
            const st = clonedDoc.createElement("style");
            st.textContent = `
              html, body { height: auto !important; }
              * { box-sizing: border-box; }
              table { page-break-inside: auto; break-inside: auto; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              tr { page-break-inside: auto; break-inside: auto; }
              th, td { vertical-align: top; overflow: visible; }
              h1, h2, h3, h4 { page-break-inside: avoid; break-inside: avoid; }
              ul, ol { break-inside: auto; }
              li { break-inside: avoid; }
              .avoid-break { page-break-inside: avoid; break-inside: avoid; }
            `;
            clonedDoc.head.appendChild(st);
            const bd = clonedDoc.body;
            bd.style.height = "auto";
            bd.style.overflow = "visible";
            const root = bd.firstElementChild;
            if (root instanceof HTMLElement) {
              root.style.overflow = "visible";
              root.style.maxHeight = "none";
              const h = Math.max(
                root.scrollHeight,
                root.offsetHeight,
                contentH
              );
              bd.style.minHeight = `${h}px`;
            } else {
              bd.style.minHeight = `${contentH}px`;
            }
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(imported)
      .save();
  } finally {
    document.body.removeChild(iframe);
  }
}
