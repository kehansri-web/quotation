/**
 * QuoteCraft Pro - High-Resolution PDF Export & Print Engine
 */

class PdfExportManager {
  /**
   * Waits for every <img> inside the element to finish loading (or fail) before
   * we let html2canvas snapshot it. Without this, a slow logo/hero image on page 2+
   * can get captured mid-load, showing up as a blank patch or a misaligned page.
   */
  static async waitForImages(element, timeoutMs = 8000) {
    const imgs = Array.from(element.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true }); // don't let one bad image hang the export
          setTimeout(done, timeoutMs);
        });
      })
    );
  }

  /**
   * Downloads the quotation as a crisp, pixel-perfect 10-page A4 PDF
   */
  static async downloadPdf(element, quoteNumber = "Quotation") {
    const filename = `${quoteNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    const pages = Array.from(element.querySelectorAll(".proposal-page"));
    if (pages.length === 0) {
      window.print();
      return { success: true, fallback: true };
    }

    try {
      // Check if html2pdf or jsPDF + html2canvas bundle is available
      const jsPdfConstructor = window.jspdf?.jsPDF || window.jsPDF;

      if (typeof html2canvas !== "undefined" && jsPdfConstructor) {
        await this.waitForImages(element);

        const pdf = new jsPdfConstructor({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true
        });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (i > 0) {
            pdf.addPage("a4", "portrait");
          }

          // Temporarily ensure high-DPI rendering
          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
            imageTimeout: 10000,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
            windowHeight: 1123
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.98);
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        }

        pdf.save(filename);
        return { success: true };
      } else if (typeof html2pdf !== "undefined") {
        const opt = {
          margin: 0,
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            scrollY: 0
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
          },
          pagebreak: { mode: ["css", "legacy"], after: ".proposal-page" }
        };

        await html2pdf().set(opt).from(element).save();
        return { success: true };
      } else {
        window.print();
        return { success: true, native: true };
      }
    } catch (err) {
      console.error("PDF Export encountered an error, falling back to print:", err);
      window.print();
      return { success: false, fallback: true, error: err };
    }
  }

  /**
   * Generates a PDF Blob for sharing
   */
  static async generatePdfBlob(element) {
    const pages = Array.from(element.querySelectorAll(".proposal-page"));
    if (pages.length === 0) return null;

    try {
      const jsPdfConstructor = window.jspdf?.jsPDF || window.jsPDF;
      if (typeof html2canvas !== "undefined" && jsPdfConstructor) {
        await this.waitForImages(element);

        const pdf = new jsPdfConstructor({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true
        });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (i > 0) {
            pdf.addPage("a4", "portrait");
          }

          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
            imageTimeout: 10000,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
            windowHeight: 1123
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.98);
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
        }

        return pdf.output("blob");
      }

      console.warn("PdfExportManager: html2canvas/jsPDF not found on window — check that the CDN scripts in index.html loaded before this ran.");
    } catch (err) {
      console.error("Failed to generate PDF blob:", err);
    }
    return null;
  }

  /**
   * Triggers native print preview
   */
  static printDocument() {
    window.print();
  }
}
