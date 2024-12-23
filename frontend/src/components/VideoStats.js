import React, { useEffect, useState } from "react";
import axios from "axios";

const VideoStats = () => {
  const [stats, setStats] = useState({});

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await axios.get("http://localhost:8000/video_stats/");
        setStats(response.data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div>
      <h1>Video Statistics</h1>
      <p>Total Videos: {stats.total_videos}</p>
      <p>Last Uploaded: {stats.last_uploaded}</p>
    </div>
  );
};

export default VideoStats;
