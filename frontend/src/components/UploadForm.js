import React, { useState } from 'react';
import axios from 'axios';

const UploadForm = () => {
  const [progress, setProgress] = useState(0);  // Прогресс загрузки (в процентах)
  const [loading, setLoading] = useState(false); // Статус загрузки
  const [uploadedMB, setUploadedMB] = useState(0); // Загрузка в МБ

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true); // Начинаем загрузку
    setProgress(0); // Сброс прогресса
    setUploadedMB(0); // Сброс МБ

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/upload_video/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          // Рассчитываем прогресс загрузки
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentage);

          // Рассчитываем количество загруженных МБ
          const mbUploaded = Math.round((progressEvent.loaded / 1024 / 1024) * 100) / 100;
          setUploadedMB(mbUploaded);
        },
      });

      // Завершаем загрузку
      setLoading(false);
      alert('Видео успешно загружено!');
    } catch (error) {
      setLoading(false);
      console.error('Error uploading file:', error);
      alert('Произошла ошибка при загрузке видео');
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
      {loading && (
        <div className="loading-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <div className="upload-status">
            <p>Загружено: {uploadedMB} MB</p>
            <p>Прогресс: {progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
