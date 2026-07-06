from io import BytesIO

from fastapi.testclient import TestClient

from backend.app.main import create_app


def make_client(tmp_path):
    app = create_app(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        upload_dir=tmp_path / "uploads",
        admin_password="123456",
    )
    return TestClient(app)


def test_seed_children_and_import_plan_appends_items(tmp_path):
    client = make_client(tmp_path)

    children = client.get("/api/children").json()
    assert [child["name"] for child in children] == ["\u5b89\u5b89", "\u4e50\u4e50"]

    payload = {
        "children": [
            {
                "name": "\u5b89\u5b89",
                "days": [
                    {
                        "date": "2026-07-04",
                        "items": [
                            {"subject": "\u8bed\u6587", "content": "\u9605\u8bfb 20 \u5206\u949f"},
                            {"subject": "\u6570\u5b66", "content": "\u53e3\u7b97 2 \u9875"},
                        ],
                    }
                ],
            }
        ]
    }

    preview = client.post("/api/admin/import/preview", json=payload).json()
    assert preview["valid"] is True
    assert preview["item_count"] == 2

    saved = client.post(
        "/api/admin/import",
        json=payload,
        headers={"x-admin-password": "123456"},
    ).json()
    assert saved["created"] == 2

    day = client.get("/api/homework", params={"childId": children[0]["id"], "date": "2026-07-04"}).json()
    assert [group["subject"] for group in day["subjects"]] == ["\u8bed\u6587", "\u6570\u5b66"]
    assert day["subjects"][0]["items"][0]["status"] == "not_submitted"


def test_photo_upload_sets_pending_and_completed_item_locks_child_edits(tmp_path):
    client = make_client(tmp_path)
    child = client.get("/api/children").json()[0]
    client.post(
        "/api/admin/homework",
        json={
            "child_id": child["id"],
            "date": "2026-07-04",
            "subject": "\u8bed\u6587",
            "content": "\u4f5c\u6587\u8349\u7a3f\u4e00\u9875",
        },
        headers={"x-admin-password": "123456"},
    )
    item = client.get("/api/homework", params={"childId": child["id"], "date": "2026-07-04"}).json()["subjects"][0]["items"][0]

    upload = client.post(
        f"/api/homework/{item['id']}/photos",
        files={"file": ("work.jpg", BytesIO(b"fake image bytes"), "image/jpeg")},
    )
    assert upload.status_code == 200

    updated = client.get("/api/homework", params={"childId": child["id"], "date": "2026-07-04"}).json()["subjects"][0]["items"][0]
    assert updated["status"] == "pending_confirmation"
    assert updated["photo_count"] == 1

    client.patch(
        f"/api/admin/homework/{item['id']}/completion",
        json={"is_completed": True},
        headers={"x-admin-password": "123456"},
    )
    locked = client.post(
        f"/api/homework/{item['id']}/photos",
        files={"file": ("again.jpg", BytesIO(b"more bytes"), "image/jpeg")},
    )
    assert locked.status_code == 409


def test_pending_review_only_returns_items_with_photos_not_completed(tmp_path):
    client = make_client(tmp_path)
    child = client.get("/api/children").json()[0]
    created = client.post(
        "/api/admin/homework",
        json={
            "child_id": child["id"],
            "date": "2026-07-04",
            "subject": "\u82f1\u8bed",
            "content": "\u6717\u8bfb\u7b2c\u4e00\u8bfe",
        },
        headers={"x-admin-password": "123456"},
    ).json()

    assert client.get("/api/admin/pending", headers={"x-admin-password": "123456"}).json() == []
    client.post(
        f"/api/homework/{created['id']}/photos",
        files={"file": ("read.jpg", BytesIO(b"bytes"), "image/jpeg")},
    )

    pending = client.get("/api/admin/pending", headers={"x-admin-password": "123456"}).json()
    assert len(pending) == 1
    assert pending[0]["content"] == "\u6717\u8bfb\u7b2c\u4e00\u8bfe"

    client.patch(
        f"/api/admin/homework/{created['id']}/completion",
        json={"is_completed": True},
        headers={"x-admin-password": "123456"},
    )
    assert client.get("/api/admin/pending", headers={"x-admin-password": "123456"}).json() == []


def test_admin_month_counts_completed_and_pending_items(tmp_path):
    client = make_client(tmp_path)
    child = client.get("/api/children").json()[0]
    first = client.post(
        "/api/admin/homework",
        json={
            "child_id": child["id"],
            "date": "2026-07-04",
            "subject": "\u8bed\u6587",
            "content": "\u4f5c\u6587",
        },
        headers={"x-admin-password": "123456"},
    ).json()
    second = client.post(
        "/api/admin/homework",
        json={
            "child_id": child["id"],
            "date": "2026-07-04",
            "subject": "\u6570\u5b66",
            "content": "\u53e3\u7b97",
        },
        headers={"x-admin-password": "123456"},
    ).json()

    client.post(
        f"/api/homework/{first['id']}/photos",
        files={"file": ("work.jpg", BytesIO(b"bytes"), "image/jpeg")},
    )
    client.patch(
        f"/api/admin/homework/{second['id']}/completion",
        json={"is_completed": True},
        headers={"x-admin-password": "123456"},
    )

    month = client.get(
        "/api/admin/month",
        params={"year": 2026, "month": 7},
        headers={"x-admin-password": "123456"},
    ).json()

    assert month["year"] == 2026
    assert month["month"] == 7
    assert month["days"] == [{"date": "2026-07-04", "total": 2, "completed": 1, "pending": 1}]


def test_admin_plan_returns_items_for_month_range(tmp_path):
    client = make_client(tmp_path)
    child = client.get("/api/children").json()[0]
    for date_value, content in [
        ("2026-07-04", "\u4f5c\u6587"),
        ("2026-07-05", "\u53e3\u7b97"),
        ("2026-08-01", "\u4e0b\u6708\u4f5c\u4e1a"),
    ]:
        client.post(
            "/api/admin/homework",
            json={
                "child_id": child["id"],
                "date": date_value,
                "subject": "\u8bed\u6587",
                "content": content,
            },
            headers={"x-admin-password": "123456"},
        )

    plan = client.get(
        "/api/admin/plan",
        params={"start": "2026-07-01", "end": "2026-07-31"},
        headers={"x-admin-password": "123456"},
    ).json()

    assert [item["date"] for item in plan] == ["2026-07-04", "2026-07-05"]
    assert [item["content"] for item in plan] == ["\u4f5c\u6587", "\u53e3\u7b97"]


def test_admin_can_rename_child(tmp_path):
    client = make_client(tmp_path)
    child = client.get("/api/children").json()[0]

    updated = client.patch(
        f"/api/admin/children/{child['id']}",
        json={"name": "\u5c0f\u660e"},
        headers={"x-admin-password": "123456"},
    )

    assert updated.status_code == 200
    assert updated.json()["name"] == "\u5c0f\u660e"
    children = client.get("/api/children").json()
    assert children[0]["name"] == "\u5c0f\u660e"


def test_admin_creates_dictation_and_child_fetches_hidden_words_then_answers(tmp_path):
    generated: list[tuple[str, str | None]] = []

    def fake_audio(word: str, hint: str | None) -> str:
        generated.append((word, hint))
        return f"dictation/audio/{word}.mp3"

    app = create_app(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        upload_dir=tmp_path / "uploads",
        admin_password="123456",
        dictation_audio_generator=fake_audio,
    )
    client = TestClient(app)
    child = client.get("/api/children").json()[0]

    created = client.post(
        "/api/admin/dictation",
        json={
            "child_id": child["id"],
            "date": "2026-07-06",
            "title": "\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4",
            "words": [
                {"word": "library", "hint": "\u56fe\u4e66\u9986"},
                {"word": "music room", "hint": "\u97f3\u4e50\u6559\u5ba4"},
            ],
        },
        headers={"x-admin-password": "123456"},
    )

    assert created.status_code == 200
    assert generated == [("library", "\u56fe\u4e66\u9986"), ("music room", "\u97f3\u4e50\u6559\u5ba4")]
    item = created.json()
    assert item["subject"] == "\u5916\u8bed"
    assert item["dictation"]["title"] == "\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4"
    assert [word["index"] for word in item["dictation"]["words"]] == [0, 1]
    assert "word" not in item["dictation"]["words"][0]

    day = client.get("/api/homework", params={"childId": child["id"], "date": "2026-07-06"}).json()
    dictation_item = day["subjects"][0]["items"][0]
    assert dictation_item["content"] == "\u82f1\u8bed\u542c\u5199\uff1a\u7b2c1\u7ec4"
    assert "word" not in dictation_item["dictation"]["words"][0]

    answers = client.get(f"/api/dictation/{dictation_item['id']}/answers").json()
    assert [
        {"index": word["index"], "word": word["word"], "hint": word["hint"]}
        for word in answers["words"]
    ] == [
        {"index": 0, "word": "library", "hint": "\u56fe\u4e66\u9986"},
        {"index": 1, "word": "music room", "hint": "\u97f3\u4e50\u6559\u5ba4"},
    ]
