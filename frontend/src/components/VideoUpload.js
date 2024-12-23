import React, { useState } from "react";
import axios from "axios";
import Modal from "react-modal";

// Устанавливаем корневой элемент для модального окна
Modal.setAppElement("#__next");

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadToCloud, setUploadToCloud] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Состояние для открытия/закрытия модального окна
  const [videoUrl, setVideoUrl] = useState(null); // Состояние для URL загруженного видео

  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log("File selected:", selectedFile);
      setFile(selectedFile);
      // Создаем URL для предварительного просмотра видео
      setVideoUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleCheckboxChange = (e) => {
    setUploadToCloud(e.target.checked);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_to_cloud", uploadToCloud);

    try {
      const response = await axios.post(
        "http://localhost:8000/upload_video/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Upload Success:", response.data);
      alert("Video uploaded successfully!");
      setIsModalOpen(false); // Закрытие модального окна после успешной загрузки
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Error uploading video");
    }
  };

  return (
    <div style={{ textAlign: "center", color: "black" }}>
      <h1>Video Upload</h1>
      {/* Кнопка для открытия модального окна */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          backgroundColor: "#4CAF50",
          color: "white",
          padding: "10px 20px",
          fontSize: "16px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Upload Video
      </button>

      {/* Модальное окно */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            width: "400px",
            padding: "20px",
            backgroundColor: "#f4f4f4",
            borderRadius: "8px",
            textAlign: "center",
          },
        }}
      >
        <h2>Upload Video</h2>
        <input
          type="file"
          accept="video/*"
          onChange={handleChange}
          style={{ marginBottom: "10px" }}
        />
        <br />

        {videoUrl && (
          <div>
            <h3>Preview:</h3>
            <video
              width="100%"
              controls
              src={videoUrl}
              style={{ marginBottom: "10px" }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        <label>
          Upload to Cloud
          <input
            type="checkbox"
            checked={uploadToCloud}
            onChange={handleCheckboxChange}
          />
        </label>
        <br />
        <button
          onClick={handleUpload}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "10px 20px",
            fontSize: "16px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Upload
        </button>

        <button
          onClick={() => setIsModalOpen(false)} // Закрыть модальное окно
          style={{
            backgroundColor: "#f44336",
            color: "white",
            padding: "10px 20px",
            fontSize: "16px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Close
        </button>
      </Modal>
    </div>
  );
};

export default VideoUpload;
