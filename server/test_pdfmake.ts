import PdfPrinter from "pdfmake";

console.log("Imported PdfPrinter:", PdfPrinter);

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

try {
  // Try direct constructor
  const printer = new PdfPrinter(fonts);
  console.log("PdfPrinter instantiated successfully");
} catch (error) {
  console.error("Error with new PdfPrinter:", error);
  try {
    // Try verify if it is inside default
    const P = (PdfPrinter as any).default;
    const printer2 = new P(fonts);
    console.log("PdfPrinter.default instantiated successfully");
  } catch (e) {
    console.error("Error with PdfPrinter.default:", e);
  }
}
