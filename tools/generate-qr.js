const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const targetUrl =
  "https://jwshaffstall.github.io/asteroid-orbit-3d-webgl/astorb3d.html";
const outputPath = path.join(__dirname, "..", "assets", "astorb3d-qr.png");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

QRCode.toFile(outputPath, targetUrl, { width: 300, margin: 1 }, (err) => {
  if (err) {
    console.error("Failed to generate QR code:", err);
    process.exit(1);
  }
  console.log(`QR code written to ${outputPath}`);
});
