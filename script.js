document.addEventListener("DOMContentLoaded", function () {
  const supabaseUrl = "https://znwsvdurindumxattjet.supabase.co";
  const supabaseKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpud3N2ZHVyaW5kdW14YXR0amV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3MDgwNzIsImV4cCI6MjA0MjI4NDA3Mn0.nF4-Y5XNO-rwuVmt9dq3BmOTzMkLtCcFUoD7EvjqK0Y";
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  const bucketName = "drive";
  let selectedFile = null;
  let totalUsedStorage = 0;
  let selectedFileNameForContext = null;

  const fileInput = document.getElementById("fileInput");
  const dropArea = document.getElementById("dropArea");
  const fileList = document.getElementById("fileList");

  // 파일 선택
  document.getElementById("selectFileButton").addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    const files = e.target.files;
    if (files.length) {
      selectedFile = files[0];
      document.getElementById("selectedFileName").innerText = `선택된 파일: ${selectedFile.name}`;
    }
  });

  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("dragover");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length) {
      selectedFile = files[0];
      document.getElementById("selectedFileName").innerText = `선택된 파일: ${selectedFile.name}`;
    }
  });

  // 파일 목록 불러오기
  async function listFiles() {
    try {
      const { data, error } = await supabase.storage.from(bucketName).list("", { limit: 100 });

      if (error) {
        console.error("Error fetching file list:", error.message);
        alert("Error fetching file list: " + error.message);
        return;
      }

      fileList.innerHTML = "";
      totalUsedStorage = 0;

      const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      sortedData.forEach((file) => {
        const listItem = document.createElement("li");
        listItem.classList.add("file-item");

        const fileInfo = document.createElement("div");
        fileInfo.classList.add("file-info");

        if (file.metadata && file.metadata.size !== undefined) {
          const fileSizeFormatted = formatFileSize(file.metadata.size);
          totalUsedStorage += file.metadata.size / 1048576;

          // Format the upload date without seconds and apply styles
          const uploadDate = new Date(file.created_at).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          fileInfo.innerHTML = `
            <span class="file-time">${uploadDate}</span>
            <span class="file-size">(${fileSizeFormatted})</span>
            <span class="material-symbols-outlined" onclick="downloadFileDirect('${file.name}')">download</span>
            <span class="material-symbols-outlined" onclick="deleteFile('${file.name}')">delete</span>
            <span class="material-symbols-outlined" onclick="renameFile('${file.name}')">edit</span>`;
        }

        listItem.innerHTML = `<span>${file.name}</span>`;
        listItem.appendChild(fileInfo);
        
        // 우클릭 이벤트 추가
        listItem.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          selectedFileNameForContext = file.name; // 우클릭한 파일 이름 저장
          showContextMenu(event.pageX, event.pageY); // 우클릭한 위치에 컨텍스트 메뉴 표시
        });

        fileList.appendChild(listItem);
      });

      updateStorageUsage();
    } catch (error) {
      console.error("Error listing files:", error.message);
      alert("Error listing files: " + error.message);
    }
  }

  // 컨텍스트 메뉴 표시 함수
  function showContextMenu(x, y) {
    const contextMenu = document.getElementById("contextMenu");
    contextMenu.style.display = "block";
    contextMenu.style.left = `${x}px`;
    contextMenu.style.top = `${y}px`;
  }

  // 컨텍스트 메뉴 항목 클릭 핸들러
  window.contextDownload = function () {
    downloadFileDirect(selectedFileNameForContext);
  };

  window.contextDelete = function () {
    deleteFile(selectedFileNameForContext);
  };

  window.contextRename = function () {
    renameFile(selectedFileNameForContext);
  };

  document.addEventListener("click", () => {
    document.getElementById("contextMenu").style.display = "none";
  });

  function formatFileSize(size) {
    return size >= 1048576
      ? (size / 1048576).toFixed(2) + " MB"
      : size >= 1024
      ? (size / 1024).toFixed(2) + " KB"
      : size + " bytes";
  }

  function updateStorageUsage() {
    document.getElementById("storageUsage").innerText = `사용된 용량: ${totalUsedStorage.toFixed(2)} MB / 1 GB`;
  }

  window.uploadFile = async function () {
    if (!selectedFile) {
      alert("파일을 선택해주세요.");
      return;
    }

    try {
      const filePath = `${selectedFile.name}`;
      const { error } = await supabase.storage.from(bucketName).upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        console.error("Error uploading file:", error.message);
        alert("Error uploading file: " + error.message);
        return;
      }

      alert("파일 업로드 성공!");
      listFiles();
    } catch (error) {
      console.error("Error uploading file:", error.message);
      alert("Error uploading file: " + error.message);
    }
  };

  window.deleteFile = async function (fileName) {
    if (confirm(`파일 ${fileName}을(를) 삭제하시겠습니까?`)) {
      try {
        const { error } = await supabase.storage.from(bucketName).remove([fileName]);

        if (error) {
          console.error("Error deleting file:", error.message);
          alert("Error deleting file: " + error.message);
          return;
        }

        alert("파일 삭제 성공!");
        listFiles();
      } catch (error) {
        console.error("Error deleting file:", error.message);
        alert("Error deleting file: " + error.message);
      }
    }
  };

  window.renameFile = function (fileName) {
    const newName = prompt("새로운 파일 이름을 입력하세요:", fileName);
    if (!newName) return;

    supabase.storage.from(bucketName).move(fileName, newName).then(({ error }) => {
      if (error) {
        console.error("Error renaming file:", error.message);
        alert("파일 이름 변경 실패: " + error.message);
      } else {
        alert("파일 이름 변경 성공!");
        listFiles();
      }
    });
  };

  window.downloadFileDirect = async function (fileName) {
    try {
      const { data, error } = await supabase.storage.from(bucketName).download(fileName);

      if (error) {
        console.error("Error downloading file:", error.message);
        alert("Error downloading file: " + error.message);
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error.message);
      alert("Error downloading file: " + error.message);
    }
  };

  listFiles();
});
