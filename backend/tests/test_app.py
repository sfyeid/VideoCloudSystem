
import pytest # type: ignore
from fastapi.testclient import TestClient
from app.main import app
from unittest import mock
from app.models import Video
from app.database import SessionLocal
from sqlalchemy.orm import Session


@pytest.fixture
def client():
    client = TestClient(app)
    yield client


@pytest.fixture
def mock_s3_client():
    with mock.patch('app.main.s3_client') as s3_client:
        yield s3_client


@pytest.fixture
def db_session():
    # Создаем сессию для работы с тестовой базой данных
    db = SessionLocal()
    yield db
    db.close()


# Тест для загрузки видео
def test_upload_video(client, mock_s3_client, db_session):
    video_file = open('test_video.mp4', 'rb')  # Создайте тестовый файл заранее

    mock_s3_client.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    response = client.post(
        "/upload_video/",
        files={"file": ("test_video.mp4", video_file, "video/mp4")},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Видео успешно загружено на облако и в базу данных"}
    
    video = db_session.query(Video).filter(Video.filename == "test_video.mp4").first()
    assert video is not None
    assert video.filename == "test_video.mp4"
    assert video.cloud_path == "videos/test_video.mp4"


# Тест для получения списка видео
def test_get_videos(client, mock_s3_client, db_session):
    mock_s3_client.list_objects_v2.return_value = {
        "Contents": [{"Key": "videos/test_video.mp4"}]
    }

    # Добавляем видео в базу данных
    video = Video(filename="test_video.mp4", cloud_path="videos/test_video.mp4")
    db_session.add(video)
    db_session.commit()

    response = client.get("/videos/")
    assert response.status_code == 200
    videos = response.json()["videos"]
    assert len(videos) == 1
    assert videos[0]["filename"] == "test_video.mp4"


# Тест для получения конкретного видео
def test_get_video(client, mock_s3_client):
    mock_s3_client.get_object.return_value = {"Body": b"test video content"}

    response = client.get("/videos/test_video.mp4")
    assert response.status_code == 200
    assert response.content == b"test video content"


# Тест для ошибки получения видео
def test_get_video_not_found(client, mock_s3_client):
    mock_s3_client.get_object.side_effect = Exception("Video not found")

    response = client.get("/videos/non_existent_video.mp4")
    assert response.status_code == 404
    assert response.json() == {"error": "Video not found: Video not found"}


# Тест для удаления видео
def test_delete_video(client, mock_s3_client, db_session):
    # Добавляем видео в базу данных
    video = Video(filename="test_video.mp4", cloud_path="videos/test_video.mp4")
    db_session.add(video)
    db_session.commit()

    mock_s3_client.delete_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}

    response = client.delete("/videos/1")
    assert response.status_code == 200
    assert response.json() == {"message": "Video deleted successfully"}

    # Проверяем, что видео удалено из базы данных
    video = db_session.query(Video).filter(Video.id == 1).first()
    assert video is None


# Тест для статистики по видео
def test_get_video_stats(client, db_session):
    video1 = Video(filename="test_video1.mp4", cloud_path="videos/test_video1.mp4")
    video2 = Video(filename="test_video2.mp4", cloud_path="videos/test_video2.mp4")
    db_session.add(video1)
    db_session.add(video2)
    db_session.commit()

    response = client.get("/video_stats/")
    assert response.status_code == 200
    data = response.json()
    assert data["total_videos"] == 2
    assert data["last_uploaded"] is not None
