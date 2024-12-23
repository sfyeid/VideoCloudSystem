import React, { useEffect, useState } from "react";
import axios from "axios";

const VideoList = () => {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await axios.get("http://localhost:8000/videos/");
        setVideos(response.data.videos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    }

    fetchVideos();
  }, []);

  return (
    <div>
      <h1>Video List</h1>
      <ul>
        {videos.map((video) => (
          <li key={video.id}>
            {video.filename} - {video.uploaded_at}
            <button onClick={() => handleDelete(video.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const handleDelete = async (id) => {
  try {
    await axios.delete(`http://localhost:8000/delete_video/${id}`);
    alert("Video deleted successfully!");
    window.location.reload();
  } catch (error) {
    console.error("Error deleting video:", error);
    alert("Error deleting video");
  }
};

export default VideoList;
