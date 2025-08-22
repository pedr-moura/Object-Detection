import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.2.1";

// Reference the elements that we will need
const status = document.getElementById("status");
const fileUpload = document.getElementById("file-upload");
const imageContainer = document.getElementById("image-container");
const saveButton = document.getElementById("save-button");

// Create a new object detection pipeline
status.textContent = "Loading model...";
const detector = await pipeline("object-detection", "Xenova/detr-resnet-50");
status.textContent = "Ready";

fileUpload.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();

  // Set up a callback when the file is loaded
  reader.onload = function (e2) {
    imageContainer.innerHTML = "";
    const image = document.createElement("img");
    image.src = e2.target.result;
    imageContainer.appendChild(image);
    saveButton.style.display = "none"; // Hide save button until detection is complete
    detect(image);
  };
  reader.readAsDataURL(file);
});

// Detect objects in the image
async function detect(img) {
  status.textContent = "Analysing...";
  const output = await detector(img.src, {
    threshold: 0.5,
    percentage: true,
  });
  status.textContent = "";
  output.forEach((box) => renderBox(img, box));
  saveButton.style.display = "block"; // Show save button after detection
}

// Render a bounding box and label on the image
function renderBox(img, { box, label }) {
  const { xmax, xmin, ymax, ymin } = box;

  // Use a consistent color to match CSS
  const color = "#00CFFF";

  // Draw the box
  const boxElement = document.createElement("div");
  boxElement.className = "bounding-box";
  Object.assign(boxElement.style, {
    borderColor: color,
    left: 100 * xmin + "%",
    top: 100 * ymin + "%",
    width: 100 * (xmax - xmin) + "%",
    height: 100 * (ymax - ymin) + "%",
  });

  // Draw label
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  labelElement.className = "bounding-box-label";
  labelElement.style.backgroundColor = "rgba(0, 0, 0, 0.6)";

  boxElement.appendChild(labelElement);
  imageContainer.appendChild(boxElement);

  // Store box data for saving
  boxElement.dataset.boxData = JSON.stringify({ box, label, color });
}

// Save image with bounding boxes
saveButton.addEventListener("click", function () {
  const img = imageContainer.querySelector("img");
  const boxes = imageContainer.querySelectorAll(".bounding-box");

  // Create a canvas to draw the image and boxes
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size to match image
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  // Draw the image
  ctx.drawImage(img, 0, 0);

  // Draw each bounding box and label
  boxes.forEach((boxElement) => {
    const { box, label, color } = JSON.parse(boxElement.dataset.boxData);
    const { xmax, xmin, ymax, ymin } = box;

    // Convert percentage coordinates to pixel values
    const xMinPx = xmin * img.naturalWidth;
    const yMinPx = ymin * img.naturalHeight;
    const xMaxPx = xmax * img.naturalWidth;
    const yMaxPx = ymax * img.naturalHeight;

    // Draw bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(xMinPx, yMinPx, xMaxPx - xMinPx, yMaxPx - yMinPx);

    // Draw label background
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.font = "12px Roboto, sans-serif";
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect(xMinPx, yMinPx - 18, textWidth + 8, 16);

    // Draw label text
    ctx.fillStyle = "#fff";
    ctx.fillText(label, xMinPx + 4, yMinPx - 6);
  });

  // Trigger download
  const link = document.createElement("a");
  link.download = "detected_objects.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});
