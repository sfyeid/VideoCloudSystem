import os
import boto3

# Настройки для Yandex Object Storage
YANDEX_BUCKET_NAME = os.getenv("YANDEX_BUCKET_NAME", "video-cloud-system")
YANDEX_ACCESS_KEY_ID = os.getenv("YANDEX_ACCESS_KEY_ID", "YCAJElSEp6nLlLYKJNR7Ak7vp")
YANDEX_SECRET_ACCESS_KEY = os.getenv("YANDEX_SECRET_ACCESS_KEY", "YCOLuIACnpxZH__JnQVxNPJTTHY0YN3vPoVk0Avs")

# Настройка клиента S3 для Yandex Object Storage
s3_client = boto3.client(
    's3',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id=YANDEX_ACCESS_KEY_ID,
    aws_secret_access_key=YANDEX_SECRET_ACCESS_KEY
)