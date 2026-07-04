# 暑假作业打卡

家庭自用的暑假作业打卡 Web App。本地版本包含：

- 孩子手机端 PWA：选择孩子、选择日期、按学科查看作业、拍照上传、多图预览、已完成折叠。
- 家长 Web 端：固定密码进入、按日期查看、待审核列表、手动添加作业、JSON 导入、照片预览、标记完成。
- Python/FastAPI 后端：SQLite 存数据，本地 `data/uploads` 存照片。

## 本地运行

启动后端：

```powershell
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

启动前端：

```powershell
npm install
npm run dev
```

孩子端打开 Vite 给出的本地地址，通常是：

```text
http://localhost:5173
```

家长端单独打开：

```text
http://localhost:5173/admin
```

家长端默认密码：

```text
123456
```

## JSON 导入示例

```json
{
  "children": [
    {
      "name": "安安",
      "days": [
        {
          "date": "2026-07-04",
          "items": [
            { "subject": "语文", "content": "阅读 20 分钟" },
            { "subject": "数学", "content": "口算 2 页" }
          ]
        }
      ]
    }
  ]
}
```

## 服务器用 Git 更新

首次克隆后，后续更新可以在服务器目录执行：

```bash
cd /home/agentuser/apps/homework
git pull
npm install
npm run build
. .venv/bin/activate
pip install -r backend/requirements.txt
sudo systemctl restart homework
```

如果当前服务器还是 zip 部署，可以继续上传 `deploy/homework-release.zip` 覆盖。

## 自检命令

```powershell
python -m pytest backend/tests/test_api.py
npm test
npm run build
```
