FROM python:3.11-slim
WORKDIR /app
COPY agent/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY agent/main.py agent/tools.py ./
COPY backend/foods.json /app/foods.json
CMD ["python", "main.py", "start"]