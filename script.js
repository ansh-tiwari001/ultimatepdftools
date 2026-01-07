document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const pdfFilesInput = document.getElementById("pdfFiles");
  const pdfList = document.getElementById("pdfList");
  const mergeBtn = document.getElementById("mergeBtn");
  const downloadLink = document.getElementById("downloadLink");
  const statusDiv = document.getElementById("status");
  const progressBar = document.getElementById("progressBar");
  const progressContainer = document.querySelector(".progress-container");
  const addBtn = document.getElementById("addBtn");
  const toolName = document.getElementById("toolName");
  const toolDesc = document.getElementById("toolDesc");

  let files = [];

  const params = new URLSearchParams(window.location.search);
  const tool = params.get("tool") || "merge";

  const toolInfo = {
    merge: "Combine multiple PDF files into one",
    split: "Split PDF pages into separate files",
    rotate: "Rotate PDF pages",
    pdf2jpg: "Convert PDF pages into JPG images",
    jpg2pdf: "Convert images into a PDF"
  };

  toolName.textContent = tool.toUpperCase();
  toolDesc.textContent = toolInfo[tool] || "";

  /* ================= ADD FILES ================= */
  addBtn.addEventListener("click", () => {
    pdfFilesInput.click();
  });

  pdfFilesInput.addEventListener("change", (e) => {
    files.push(...e.target.files);
    updateFileList();
    pdfFilesInput.value = "";
  });

  /* ================= DRAG & DROP ================= */
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("hover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("hover");
  });

  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("hover");
    files.push(...e.dataTransfer.files);
    updateFileList();
  });

  /* ================= FILE LIST ================= */
  function updateFileList() {
    pdfList.innerHTML = "";
    files.forEach((file, i) => {
      const div = document.createElement("div");
      div.className = "pdf-item";
      div.innerHTML = `<span>${file.name}</span><button>×</button>`;
      div.querySelector("button").onclick = () => {
        files.splice(i, 1);
        updateFileList();
      };
      pdfList.appendChild(div);
    });
  }

  /* ================= PROCESS ================= */
  mergeBtn.addEventListener("click", async () => {

    statusDiv.textContent = "";
    progressContainer.style.display = "none";
    downloadLink.style.display = "none";

    if (!files.length) {
      statusDiv.textContent = "❌ Please add files first.";
      return;
    }

    /* ===== FILE VALIDATION ===== */
    if (tool === "pdf2jpg" && files.some(f => f.type !== "application/pdf")) {
      statusDiv.textContent = "❌ Please upload only PDF files.";
      return;
    }

    if (tool === "jpg2pdf" && files.some(f => !f.type.startsWith("image/"))) {
      statusDiv.textContent = "❌ Please upload only image files.";
      return;
    }

    try {
      progressContainer.style.display = "block";
      progressBar.style.width = "0%";
      statusDiv.textContent = "Processing...";

      /* ===== MERGE ===== */
      if (tool === "merge") {
        const out = await PDFLib.PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
          const pdf = await PDFLib.PDFDocument.load(await files[i].arrayBuffer());
          const pages = await out.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(p => out.addPage(p));
          progressBar.style.width = ((i + 1) / files.length) * 100 + "%";
        }
        const bytes = await out.save();
        downloadLink.href = URL.createObjectURL(new Blob([bytes]));
        downloadLink.download = "merged.pdf";
        downloadLink.style.display = "inline-block";
        statusDiv.textContent = "✅ Merge completed!";
      }

      /* ===== SPLIT ===== */
      if (tool === "split") {
        for (const file of files) {
          const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
          for (let i = 0; i < pdf.getPageCount(); i++) {
            const out = await PDFLib.PDFDocument.create();
            const [p] = await out.copyPages(pdf, [i]);
            out.addPage(p);
            const b = await out.save();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([b]));
            a.download = `page_${i + 1}.pdf`;
            a.click();
          }
        }
        statusDiv.textContent = "✅ PDF split completed!";
      }

      /* ===== ROTATE ===== */
      if (tool === "rotate") {
        const angle = parseInt(
          document.getElementById("rotationAngle").value
        );
        const out = await PDFLib.PDFDocument.create();

        for (let i = 0; i < files.length; i++) {
          const pdf = await PDFLib.PDFDocument.load(await files[i].arrayBuffer());
          const pages = await out.copyPages(pdf, pdf.getPageIndices());
          pages.forEach(page => {
            page.setRotation(
              PDFLib.degrees(page.getRotation().angle + angle)
            );
            out.addPage(page);
          });
          progressBar.style.width = ((i + 1) / files.length) * 100 + "%";
        }

        const bytes = await out.save();
        downloadLink.href = URL.createObjectURL(new Blob([bytes]));
        downloadLink.download = "rotated.pdf";
        downloadLink.style.display = "inline-block";
        statusDiv.textContent = "✅ PDF rotated successfully!";
      }

      /* ===== JPG → PDF ===== */
      if (tool === "jpg2pdf") {
        const pdf = await PDFLib.PDFDocument.create();
        for (const img of files) {
          const bytes = await img.arrayBuffer();
          const image = img.type.includes("png")
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height
          });
        }
        const out = await pdf.save();
        downloadLink.href = URL.createObjectURL(new Blob([out]));
        downloadLink.download = "images.pdf";
        downloadLink.style.display = "inline-block";
        statusDiv.textContent = "✅ Images converted to PDF!";
      }

    } catch (err) {
      console.error(err);
      statusDiv.textContent = "❌ Something went wrong. Try again.";
    }
  });

});
