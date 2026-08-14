import { toPng, toSvg } from "html-to-image";
import { getNodesBounds, getViewportForBounds } from "reactflow";
import { jsPDF } from "jspdf";

const EXPORT_PADDING = 0.05;
const IMAGE_WIDTH = 1920;
const PIXEL_RATIO = 2;

// Subject areas are background-grouping boxes and can be sized far larger
// than the tables they group — including them would zoom the export out
// until the actual tables are too small to read. Notes and tables are the
// content people actually want in the picture.
function exportableNodes(nodes) {
  return nodes.filter((n) => n.type !== "area");
}

function captureTransform(nodes) {
  const bounds = getNodesBounds(nodes);
  const imageHeight = Math.round((bounds.height / bounds.width) * IMAGE_WIDTH) || IMAGE_WIDTH;
  const { x, y, zoom } = getViewportForBounds(bounds, IMAGE_WIDTH, imageHeight, 0.1, 2, EXPORT_PADDING);
  return { x, y, zoom, width: IMAGE_WIDTH, height: imageHeight };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl) {
  const [header, payload] = dataUrl.split(",");
  const mime = header.match(/^data:(.*?)(;base64)?$/)?.[1] || "application/octet-stream";
  // toPng() returns base64; toSvg() returns a plain URI-encoded string instead.
  if (header.endsWith(";base64")) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(payload)], { type: mime });
}

// Screenshotting the minimap/controls/attribution would bake browser chrome
// that isn't part of the diagram itself into the exported image.
function shouldCapture(el) {
  if (!el.classList) return true;
  return !(
    el.classList.contains("react-flow__minimap") ||
    el.classList.contains("react-flow__controls") ||
    el.classList.contains("react-flow__attribution")
  );
}

export async function exportDiagramAsImage(reactFlowInstance, canvasEl, format, filename = "diagram", deselectAll) {
  if (!reactFlowInstance || !canvasEl) return;
  const viewportEl = canvasEl.querySelector(".react-flow__viewport");
  if (!viewportEl) return;

  const nodes = exportableNodes(reactFlowInstance.getNodes());
  if (nodes.length === 0) return;
  const previousViewport = reactFlowInstance.getViewport();
  const { x, y, zoom, width, height } = captureTransform(nodes);

  // React Flow bumps a selected node's z-index above everything else, which
  // would otherwise cover other tables in the capture (most visibly for
  // subject areas, normally pinned behind tables). Nodes are controlled from
  // EditorPage's own state, so selection has to be cleared through that
  // state setter (deselectAll) rather than the RF instance directly —
  // mutating the instance's internal store on a controlled component fights
  // the next prop-driven render and crashes.
  deselectAll?.();
  reactFlowInstance.setViewport({ x, y, zoom });
  // Let React apply the viewport change and (with onlyRenderVisibleElements
  // disabled by the caller for the duration of the export) mount every node.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  try {
    const options = {
      pixelRatio: PIXEL_RATIO,
      width,
      height,
      filter: shouldCapture,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
      // The Google Fonts <link> in index.html is loaded without a
      // `crossorigin` attribute, so the browser treats its stylesheet as
      // opaque — reading its cssRules to embed the font throws a
      // SecurityError. html-to-image catches that, but the corrupted
      // partial <style> it still writes into the output breaks the whole
      // document's XML parsing, so the browser silently renders nothing
      // instead of erroring. Skipping font embedding avoids that entirely;
      // text just falls back to the browser's already-loaded font.
      skipFonts: true,
    };

    if (format === "svg") {
      const dataUrl = await toSvg(viewportEl, options);
      downloadBlob(dataUrlToBlob(dataUrl), `${filename}.svg`);
      return;
    }

    const pngDataUrl = await toPng(viewportEl, options);

    if (format === "png") {
      downloadBlob(dataUrlToBlob(pngDataUrl), `${filename}.png`);
      return;
    }

    if (format === "pdf") {
      const orientation = width >= height ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [width, height] });
      // jsPDF defaults to storing images uncompressed unless a compression
      // level is passed explicitly, which bloats this to 50-60x the PNG's
      // own size for a diagram this size.
      pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height, undefined, "SLOW");
      pdf.save(`${filename}.pdf`);
    }
  } finally {
    reactFlowInstance.setViewport(previousViewport);
  }
}
