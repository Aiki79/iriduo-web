# Cleanup for test_reports_safety.py / UI safety tests: removes only TEST_ reports against testdev* devices and their suspensions
import asyncio
import os
import re
import sys

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/backend/.env")


async def main(extra_devices):
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    q = {"note": {"$regex": "^TEST_"}, "reported_device": {"$regex": "^testdev\\d{8}$"}}
    devs = {d["reported_device"] for d in await db.reports.find(q, {"reported_device": 1}).to_list(10000)}
    r1 = await db.reports.delete_many(q)
    r2 = await db.suspended.delete_many({"device": {"$in": list(devs)}})
    r3 = await db.reports.delete_many({"$or": [{"reported_device": {"$in": extra_devices}}, {"reporter_device": {"$in": extra_devices}}]}) if extra_devices else None
    print("reports:", r1.deleted_count, "suspended:", r2.deleted_count, "ui reports:", r3.deleted_count if r3 else 0)


asyncio.run(main([d for d in sys.argv[1:] if re.fullmatch(r"[a-z0-9]{12,40}", d)]))
