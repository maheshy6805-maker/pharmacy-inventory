const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/**
 * Generates a professional, clean, aligned PDF invoice (Unicode safe)
 * @param {Object} bill
 * @param {Object} enterprise
 * @returns {Promise<string>} Path to generated PDF file
 */
exports.generateBillPDF = async (bill, enterprise) => {
  return new Promise((resolve, reject) => {
    try {
      const dir = path.join(__dirname, "../uploads/bills");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const filePath = path.join(dir, `${bill._id}.pdf`);
      const pdf = new PDFDocument({ margin: 50 });

      // Load Unicode font that supports ₹
      const fontPath = path.join(__dirname, "./fonts/NotoSans-Regular.ttf");
      if (fs.existsSync(fontPath)) pdf.registerFont("NotoSans", fontPath);
      else pdf.registerFont("NotoSans", "Helvetica"); // fallback

      const stream = fs.createWriteStream(filePath);
      pdf.pipe(stream);

      // ---- Header ----
      pdf
        .font("NotoSans")
        .fontSize(22)
        .fillColor("#7e22ce")
        .text(enterprise?.name || "Pharmalogy", { align: "center" });

      if (enterprise?.email)
        pdf
          .moveDown(0.2)
          .fontSize(11)
          .fillColor("#555")
          .text(enterprise.email, { align: "center" });

      pdf.moveDown(1.2);
      pdf.moveTo(50, pdf.y).lineTo(550, pdf.y).strokeColor("#ddd").stroke();
      pdf.moveDown(1);

      // ---- Invoice Info ----
      pdf.fontSize(16).fillColor("#000").text("Invoice", { align: "left" });
      pdf.moveDown(0.3);
      pdf
        .fontSize(12)
        .fillColor("#333")
        .text(`Invoice ID: ${bill._id}`)
        .text(`Date: ${new Date(bill.createdAt).toLocaleString()}`)
        .text(`Payment Mode: ${bill.paymentMode}`)
        .text(`Bill Type: ${bill.billType}`);
      pdf.moveDown(1);

      // ---- Customer ----
      pdf.fontSize(14).fillColor("#000").text("Customer details");
      pdf
        .fontSize(12)
        .fillColor("#333")
        .text(`Name: ${bill.customer?.name || "-"}`)
        .text(`Mobile: ${bill.customer?.mobile || "-"}`)
        .text(`Email: ${bill.customer?.email || "N/A"}`);
      pdf.moveDown(1.2);

      // ---- Table Header ----
      pdf.fontSize(14).fillColor("#000").text("Products");
      pdf.moveDown(0.4);

      const startY = pdf.y;
      const tableLeft = 50;
      const tableWidth = 500;

      // Draw header background
      pdf
        .rect(tableLeft, startY - 5, tableWidth, 22)
        .fill("#ede9fe")
        .strokeColor("#ccc")
        .stroke();

      const headers = [
        { label: "Name", x: 55, width: 160, align: "left" },
        { label: "Qty", x: 220, width: 40, align: "center" },
        { label: "Unit (₹)", x: 270, width: 60, align: "right" },
        { label: "GST%", x: 340, width: 50, align: "center" },
        { label: "Discount%", x: 400, width: 70, align: "center" },
        { label: "Total (₹)", x: 480, width: 70, align: "right" },
      ];

      pdf.fillColor("#333").fontSize(11);
      headers.forEach((h) =>
        pdf.text(h.label, h.x, startY, { width: h.width, align: h.align })
      );

      // ---- Table Rows ----
      let y = startY + 25;
      pdf.fontSize(10).fillColor("#000");

      bill.products.forEach((item, index) => {
        const { name, gst, discount, price } = item.product;
        const rowHeight = 20;

        // alternate background color
        if (index % 2 === 0) {
          pdf
            .rect(tableLeft, y - 5, tableWidth, rowHeight)
            .fill("#f9f9f9")
            .strokeColor("#eee")
            .stroke();
        }

        pdf
          .fillColor("#000")
          .text(name || "-", 55, y, { width: 160 })
          .text(item.quantitySold.toString(), 220, y, {
            width: 40,
            align: "center",
          })
          .text(`₹${(price || 0).toFixed(2)}`, 270, y, {
            width: 60,
            align: "right",
          })
          .text(`${gst || 0}%`, 340, y, { width: 50, align: "center" })
          .text(`${discount || 0}%`, 400, y, { width: 70, align: "center" })
          .text(`₹${item.totalPrice.toFixed(2)}`, 480, y, {
            width: 70,
            align: "right",
          });

        y += rowHeight;
      });

      // table bottom border
      pdf
        .moveTo(tableLeft, y)
        .lineTo(tableLeft + tableWidth, y)
        .strokeColor("#ccc")
        .stroke();

      // ---- Totals ----
      pdf.moveDown(2);
      const rightAlignX = 300; // right section alignment
      pdf
        .font("NotoSans")
        .fontSize(13)
        .fillColor("#000")
        .text(
          `Total Amount: ₹${bill.totalAmount.toFixed(2)}`,
          rightAlignX,
          pdf.y,
          {
            align: "right",
            width: 250,
          }
        );
      pdf
        .fontSize(12)
        .fillColor("#444")
        .text(`Payment Mode: ${bill.paymentMode}`, rightAlignX, pdf.y + 18, {
          align: "right",
          width: 250,
        });

      // ---- Footer ----
      pdf.moveDown(3);
      pdf
        .font("NotoSans")
        .fontSize(12)
        .fillColor("#7e22ce")
        .text("Thank you for your purchase!", 50, pdf.y, {
          width: 500,
          align: "center",
          continued: false,
        });
      pdf
        .font("NotoSans")
        .fontSize(9)
        .fillColor("#888")
        .text("© Powered by Pharmalogy", 50, pdf.y + 5, {
          width: 500,
          align: "center",
          continued: false,
        });

      pdf.end();
      stream.on("finish", () => resolve(filePath));
      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
};
