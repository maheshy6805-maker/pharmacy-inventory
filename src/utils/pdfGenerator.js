const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

exports.generateBillPDF = async (bill, enterprise) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.join(__dirname, "../uploads/bills");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${bill._id}.pdf`);
      const pdf = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      pdf.pipe(stream);

      // Header
      pdf
        .fontSize(22)
        .fillColor("#7e22ce")
        .text(enterprise.name || "Pharmalogy", { align: "center" });
      pdf.moveDown(0.3);
      pdf
        .fontSize(12)
        .fillColor("#555")
        .text(enterprise.email || "", { align: "center" });
      pdf.moveDown(1);

      // Bill Info
      pdf
        .fontSize(16)
        .fillColor("#000")
        .text(`Invoice #${bill._id}`, { align: "left" });
      pdf
        .fontSize(12)
        .fillColor("#444")
        .text(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
      pdf.moveDown(0.8);

      // Customer
      pdf.fontSize(14).fillColor("#000").text("Customer Details:");
      pdf
        .fontSize(12)
        .fillColor("#333")
        .text(`Name: ${bill.customer?.name}`)
        .text(`Mobile: ${bill.customer?.mobile}`)
        .text(`Email: ${bill.customer?.email || "N/A"}`);
      pdf.moveDown(1);

      // Table Header
      pdf.fontSize(14).fillColor("#000").text("Products:");
      pdf.moveDown(0.3);
      pdf.fontSize(12).text("Name", 50, pdf.y, { continued: true });
      pdf.text("Qty", 200, pdf.y, { continued: true });
      pdf.text("Price", 260, pdf.y, { continued: true });
      pdf.text("Total", 320);
      pdf.moveDown(0.3);

      // Table Rows
      bill.products.forEach((item) => {
        pdf
          .fontSize(12)
          .text(item.product?.name || "-", 50, pdf.y, { continued: true });
        pdf.text(item.quantitySold, 200, pdf.y, { continued: true });
        pdf.text(item.unitPrice.toFixed(2), 260, pdf.y, { continued: true });
        pdf.text(item.totalPrice.toFixed(2), 320);
      });

      pdf.moveDown(1);
      pdf
        .fontSize(13)
        .text(`Total Amount: ₹${bill.totalAmount}`, { align: "right" });
      pdf
        .fontSize(12)
        .text(`Payment Mode: ${bill.paymentMode}`, { align: "right" });

      pdf.moveDown(1);
      pdf.text("Thank you for your purchase!", { align: "center" });
      pdf.text("Powered by Pharmalogy", {
        align: "center",
        fontSize: 10,
        fillColor: "#888",
      });

      pdf.end();

      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};
