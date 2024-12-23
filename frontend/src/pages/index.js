import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import { FaFileVideo, FaTimes } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";

axios.defaults.baseURL = "http://127.0.0.1:8000"; // Установите базовый URL для axios

Modal.setAppElement("#__next");

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [previousFile, setPreviousFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get("/videos/");
        const cloudVideos = response.data.videos.filter((video) => video.cloud_path);
        setVideos(cloudVideos);
      } catch (error) {
        console.error("Ошибка при получении списка видео:", error);
      }
    };
  
    fetchVideos();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleFileChange = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setProgress(0);
    setUploadMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Выберите файл для загрузки");
      return;
    }
  
    if (previousFile === file) {
      alert("Этот файл уже загружен!");
      return;
    }
  
    const formData = new FormData();
    formData.append("file", file);
  
    setUploading(true);
    setUploadMessage("Загрузка видео... Пожалуйста, подождите.");
    setProgress(0);
  
    try {
      await axios.post("/upload_video/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setProgress(percent);
          }
        },
      });
  
      setProgress(100);
      setUploadMessage("Видео успешно загружено!");
  
      const response = await axios.get("/videos/");
      const cloudVideos = response.data.videos.filter((video) => video.cloud_path);
      setVideos(cloudVideos);
    } catch (error) {
      console.error("Ошибка при загрузке видео:", error);
      setUploadMessage("Ошибка при загрузке видео.");
    } finally {
      setUploading(false);
      setPreviousFile(file);
    }
  };

  const handleDelete = async (videoId) => {
    try {
      await axios.delete(`/videos/${videoId}/`);
      setVideos(videos.filter((video) => video.id !== videoId));
      toast.success("Видео успешно удалено!");
    } catch (error) {
      console.error("Ошибка при удалении видео:", error);
      toast.error("Ошибка при удалении видео.");
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFileChange,
    accept: "video/mp4,video/x-m4v,video/*",
  });

  return (
    <div>
      <header style={{ textAlign: "center", marginBottom: "20px" }}>
        <h1 style={{ color: "#333", fontSize: "2.5rem", fontWeight: "bold" }}>Облачное хранилище</h1>
      </header>

      <div style={{ textAlign: "center" }}>
        <h2 style={{ color: "#555", fontWeight: "600" }}>Загруженные видео</h2>

        {videos.length === 0 && (
          <p className="no-videos-message">Нет видео для отображения</p>
        )}

        <div className="video-list">
          {videos.map((video) => (
            <div key={video.id} className="video-item">
              <video width="320" height="240" controls>
                <source src={`http://localhost:8000/videos/${video.filename}`} />
                Ваш браузер не поддерживает элемент video.
              </video>
              <p>{video.filename}</p>
              <a
                href="#"
                onClick={() => handleDelete(video.id)}
                className="delete-link"
              >
                Удалить
              </a>
            </div>
          ))}
        </div>

        <button
          onClick={openModal}
          className="button-primary upload-btn"
        >
          Загрузить видео
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Загрузка видео"
        style={{
          content: {
            maxWidth: "500px",
            margin: "auto",
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <span onClick={closeModal} className="close-btn">
          ×
        </span>
        <h2>Загрузить видео</h2>

        <div
          {...getRootProps()}
          className="dropzone"
          style={{
            border: "2px dashed #007bff",
            padding: "30px",
            textAlign: "center",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          <input {...getInputProps()} />
          <p>Перетащите видео сюда или нажмите, чтобы выбрать</p>
        </div>

        {file && (
          <div style={{ marginTop: "20px", color: "#333", fontSize: "16px", display: "flex", alignItems: "center" }}>
            <FaFileVideo style={{ fontSize: "24px", marginRight: "10px" }} />
            <span>Выбран файл: {file.name}</span>
            <a
              href="#"
              onClick={() => setFile(null)}
              style={{
                color: "#f44336",
                marginLeft: "10px",
                fontSize: "16px",
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <FaTimes />
            </a>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="button-primary"
          style={{ marginTop: "20px" }}
        >
          {uploading ? "Загрузка..." : "Загрузить"}
        </button>

        <div style={{ marginTop: "20px" }}>
          <p>{uploadMessage}</p>
          <div
            style={{
              width: "100%",
              backgroundColor: "#f3f3f3",
              borderRadius: "5px",
              height: "20px",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#007bff",
                borderRadius: "5px",
                transition: "width 0.1s linear",
              }}
            ></div>
          </div>
        </div>

        {uploading && (
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
        )}
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default HomePage;