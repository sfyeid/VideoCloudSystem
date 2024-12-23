from fastapi import Depends, FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from .config import s3_client
from .models import Video
from .database import engine, get_db
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from . import models  # Добавить этот импорт
import ffmpeg  # type: ignore
from datetime import datetime
from sqlalchemy import create_engine
import logging

# Настроим логирование
logging.basicConfig(level=logging.INFO)  # Устанавливаем уровень логирования INFO
logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Создание таблиц в базе данных
models.Base.metadata.create_all(bind=engine)  # type: ignore

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Фронтенд, который будет запрашивать сервер
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Локальная директория для временного хранения видео
upload_dir = "./uploads"
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)

# Имя бакета в Яндекс Облаке
YANDEX_BUCKET_NAME = "video-cloud-system"

def check_video_exists(video_key):
    try:
        # Проверка наличия видео в бакете по ключу
        response = s3_client.head_object(Bucket=YANDEX_BUCKET_NAME, Key=video_key)
        if response.get('ResponseMetadata', {}).get('HTTPStatusCode') == 200:
            return True  # Видео существует
        else:
            return False  # Видео не найдено
    except Exception as e:
        logger.error(f"Ошибка при проверке видео: {e}")
        return False

@app.post("/upload_video/")
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        # Получаем имя файла
        file_name = file.filename

        # Проверяем расширение файла
        allowed_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
        file_extension = os.path.splitext(file_name)[1].lower()
        if file_extension not in allowed_extensions:
            logger.warning(f"Попытка загрузить файл с недопустимым расширением: {file_extension}")
            return JSONResponse(
                content={"error": f"Invalid file type: {file_extension}. Only video files are allowed."},
                status_code=400,
            )

        # Прочитаем содержимое файла
        file_content = await file.read()

        # Загружаем файл в облако
        logger.info(f"Загружаем файл: {file_name}")
        response = s3_client.put_object(
            Bucket=YANDEX_BUCKET_NAME,  # Укажите ваш бакет
            Key=f"videos/{file_name}",
            Body=file_content,
            ContentType="video/mp4",
        )

        # Проверим, существует ли видео в базе данных
        existing_video = db.query(Video).filter(Video.filename == file_name).first()
        if existing_video:
            logger.warning(f"Видео с именем {file_name} уже существует в базе данных")
            return {"message": "Видео с таким названием уже существует в базе данных"}

        # Сохраняем путь к видео в базе данных
        cloud_path = f"videos/{file_name}"
        new_video = Video(filename=file_name, cloud_path=cloud_path)
        db.add(new_video)
        db.commit()

        logger.info(f"Видео {file_name} успешно загружено на облако и в базу данных.")
        return {"message": "Видео успешно загружено на облако и в базу данных"}

    except Exception as e:
        logger.error(f"Ошибка при загрузке видео: {str(e)}")
        return {"error": str(e)}

@app.get("/videos/")
async def get_videos(db: Session = Depends(get_db)):
    try:
        # Получаем список всех видео в бакете
        response = s3_client.list_objects_v2(Bucket=YANDEX_BUCKET_NAME, Prefix="videos/")
        
        # Если объектов нет, то бакет пуст, и возвращаем пустой список
        if 'Contents' not in response:
            logger.info("В бакете нет видео.")
            return {"videos": []}

        # Получаем список всех файлов в бакете
        videos_in_bucket = [item['Key'].replace("videos/", "") for item in response['Contents']]

        # Получаем список видео из базы данных
        videos_in_db = db.query(Video).all()

        # Логируем, что в базе и бакете
        logger.info(f"Видео в бакете: {videos_in_bucket}")
        logger.info(f"Видео в базе данных: {[video.filename for video in videos_in_db]}")

        # Удаляем все дубликаты из базы данных
        unique_video_filenames = set(video.filename for video in videos_in_db)

        for video in videos_in_db:
            if video.filename not in videos_in_bucket:
                logger.info(f"Удаляем видео {video.filename} из базы данных, так как его нет в бакете.")
                db.delete(video)  # Удаляем видео из базы, если его нет в бакете

        db.commit()  # Сохраняем изменения

        # Проверим, есть ли в бакете новые видео, которых нет в базе данных
        for filename in videos_in_bucket:
            if filename not in unique_video_filenames:
                logger.info(f"Добавляем видео {filename} в базу данных, так как его нет в базе.")
                new_video = Video(filename=filename, cloud_path=f"videos/{filename}")
                db.add(new_video)

        db.commit()  # Сохраняем изменения

        # После синхронизации получаем актуальные видео из базы данных
        updated_videos_in_db = db.query(Video).all()
        
        # Отправляем актуальные видео на фронт
        return {"videos": updated_videos_in_db}

    except Exception as e:
        logger.error(f"Ошибка при получении списка видео: {str(e)}")
        return JSONResponse(content={"error": f"Error: {str(e)}"}, status_code=500)

@app.get("/videos/{video_name}")
async def get_video(video_name: str):
    """
    Эндпоинт для получения видео по имени файла
    :param video_name: имя видеофайла
    """
    video_path = f"videos/{video_name}"
    try:
        # Получаем видео из S3
        logger.info(f"Запрос на видео: {video_name}")
        response = s3_client.get_object(Bucket=YANDEX_BUCKET_NAME, Key=video_path)
        
        # Возвращаем видео как поток (StreamingResponse)
        return StreamingResponse(response['Body'], media_type="video/mp4")
    except Exception as e:
        logger.error(f"Ошибка при получении видео {video_name}: {str(e)}")
        # В случае ошибки (например, видео не найдено)
        return JSONResponse(content={"error": f"Video not found: {str(e)}"}, status_code=404)

@app.delete("/videos/{video_id}")
async def delete_video(video_id: int, db: Session = Depends(get_db)):
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            return JSONResponse(content={"error": "Video not found"}, status_code=404)

        # Удаление видео из облака
        if video.cloud_path:
            try:
                s3_client.delete_object(Bucket=YANDEX_BUCKET_NAME, Key=video.cloud_path)
                logger.info(f"Видео {video_id} удалено из облака.")
            except Exception as e:
                logger.error(f"Ошибка при удалении видео {video_id} из облака: {str(e)}")
                return JSONResponse(content={"error": f"Error deleting from cloud: {str(e)}"}, status_code=500)

        # Удаление из базы данных
        db.delete(video)
        db.commit()
        
        logger.info(f"Видео {video_id} удалено из базы данных.")
        return {"message": "Video deleted successfully"}

    except Exception as e:
        logger.error(f"Ошибка при удалении видео {video_id}: {str(e)}")
        return JSONResponse(content={"error": f"Error: {str(e)}"}, status_code=500)

@app.get("/video_stats/")
async def get_video_stats(db: Session = Depends(get_db)):
    """
    Эндпоинт для получения статистики по видео
    :param db: сессия базы данных
    """
    try:
        total_videos = db.query(Video).count()
        last_uploaded = db.query(Video).order_by(Video.uploaded_at.desc()).first()
        return {
            "total_videos": total_videos,
            "last_uploaded": last_uploaded.uploaded_at if last_uploaded else None,
        }
    except Exception as e:
        logger.error(f"Ошибка при получении статистики по видео: {str(e)}")
        return JSONResponse(content={"error": f"Error: {str(e)}"}, status_code=500)
