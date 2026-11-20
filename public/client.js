const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const uploadStatus = document.getElementById("upload-status");
const refreshBtn = document.getElementById("refresh-btn");
const videoList = document.getElementById("video-list");

uploadBtn.addEventListener("click", async () => {
  const file = fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = "Select a video file.";
    return;
  }

  uploadStatus.textContent = "Uploading...";

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { filename: file.name },
    body: file,
  });

  const result = await response.json();
  uploadStatus.textContent = result.message || result.error;

  if (response.ok) loadVideos();
});

refreshBtn.addEventListener("click", loadVideos);

async function loadVideos() {
  const response = await fetch("/api/videos");
  const videos = await response.json();

  videoList.innerHTML = "";

  videos.forEach((video) => {
    const item = document.createElement("div");
    item.className = "video-item";

    item.innerHTML = `
      <img src="/api/asset?type=thumbnail&videoId=${video.videoId}" width="120" />
      <div>
        <p>${video.name}</p>
        <a href="/api/asset?type=original&videoId=${video.videoId}">Download original</a>
        <form class="resize-form" data-video-id="${video.videoId}">
          <input type="number" placeholder="width" class="width-input" required />
          <input type="number" placeholder="height" class="height-input" required />
          <button type="submit">Resize</button>
        </form>
      </div>
    `;

    videoList.appendChild(item);
  });

  document.querySelectorAll(".resize-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const videoId = form.dataset.videoId;
      const width = form.querySelector(".width-input").value;
      const height = form.querySelector(".height-input").value;

      await fetch("/api/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, width, height }),
      });

      alert("Processing started! Refresh the list shortly.");
    });
  });
}

loadVideos();
