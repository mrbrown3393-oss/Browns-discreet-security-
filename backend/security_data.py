"""Transparent posture assessment of user-declared controls, not endpoint scanning."""
from datetime import datetime, timezone
from security_models import Snapshot, Finding, Workspace


def now():
    return datetime.now(timezone.utc).isoformat()


async def initialize_security(db):
    await db.workspaces.create_index("user_id", unique=True)
    for name in ("devices", "alerts", "reports", "chat_messages"):
        await db[name].create_index([("user_id", 1), ("created_at", -1)])
        await db[name].create_index("id", unique=True)


async def workspace_for(db, user_id):
    value = await db.workspaces.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
    return Workspace(**(value or {}))


async def snapshot_for(db, user_id):
    devices = await db.devices.find({"user_id": user_id}, {"_id": 0}).to_list(2000)
    alerts = await db.alerts.find({"user_id": user_id, "status": "open"}, {"_id": 0}).to_list(5000)
    count = len(devices)
    totals = {key: sum(bool(d[key]) for d in devices) for key in ("mfa", "encrypted", "updated")}
    reviewed = sum(d["access"] != "review" for d in devices)
    # Four equally weighted inventory controls; incidents are reported separately.
    score = round((sum(totals.values()) + reviewed) / (4 * count) * 100) if count else None
    findings = []
    names = {"mfa": "Enable multi-factor authentication", "encrypted": "Enable disk encryption", "updated": "Install current security updates"}
    for key, title in names.items():
        missing = count - totals[key]
        if missing:
            findings.append(Finding(title=title, detail=f"{missing} of {count} registered devices do not have this control recorded.", priority="high" if key != "updated" else "medium"))
    if count - reviewed:
        findings.append(Finding(title="Review device access", detail=f"{count - reviewed} access decisions are awaiting review. Registry decisions do not enforce network access.", priority="medium"))
    if alerts:
        findings.append(Finding(title="Triage open incidents", detail=f"{len(alerts)} open incident records need review. These do not change the inventory control score.", priority="high"))
    return Snapshot(score=score, device_count=count, open_alerts=len(alerts),
                    critical_alerts=sum(a["severity"] == "critical" for a in alerts),
                    mfa_count=totals["mfa"], encrypted_count=totals["encrypted"],
                    updated_count=totals["updated"], reviewed_count=reviewed,
                    findings=findings, checked_at=now())


async def sync_device_alert(db, user_id, device):
    missing = [label for key, label in (("mfa", "MFA"), ("encrypted", "disk encryption"), ("updated", "security updates")) if not device[key]]
    if device["access"] == "review":
        missing.append("access review")
    alert_id = f"controls_{device['id']}"
    if missing:
        await db.alerts.update_one({"id": alert_id, "user_id": user_id}, {
            "$set": {"title": f"Review {device['name']}", "description": "Missing declared controls: " + ", ".join(missing) + ". Verify and update this device record; this is not an automatic device scan.",
                     "severity": "high" if len(missing) >= 3 else "medium", "status": "open", "updated_at": now()},
            "$setOnInsert": {"source": "control_check", "device_id": device["id"], "created_at": now()},
        }, upsert=True)
    else:
        await db.alerts.update_one({"id": alert_id, "user_id": user_id}, {"$set": {"status": "resolved", "updated_at": now()}})