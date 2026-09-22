import uuid
from fastapi import APIRouter, HTTPException, Request
from auth import get_user
from security_data import now, snapshot_for, sync_device_alert, workspace_for
from security_models import (Workspace, DeviceInput, Device, AlertInput, Alert,
                             AlertStatus, Dashboard, Report)

router = APIRouter(prefix="/api", tags=["security workspace"])


async def scope(request):
    return request.app.state.db, (await get_user(request)).id


@router.get("/dashboard", response_model=Dashboard)
async def dashboard(request: Request):
    db, uid = await scope(request)
    recent = await db.alerts.find({"user_id": uid}, {"_id": 0, "user_id": 0}).sort("updated_at", -1).limit(5).to_list(5)
    return Dashboard(workspace=await workspace_for(db, uid), posture=await snapshot_for(db, uid), recent_alerts=recent)


@router.post("/workspace", response_model=Workspace)
async def save_workspace(body: Workspace, request: Request):
    db, uid = await scope(request)
    await db.workspaces.update_one({"user_id": uid}, {"$set": body.model_dump()}, upsert=True)
    return body


@router.get("/devices", response_model=list[Device])
async def devices(request: Request):
    db, uid = await scope(request)
    return await db.devices.find({"user_id": uid}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(2000)


@router.post("/devices", response_model=Device, status_code=201)
async def add_device(body: DeviceInput, request: Request):
    db, uid = await scope(request)
    if await db.devices.count_documents({"user_id": uid}) >= 2000:
        raise HTTPException(409, "Workspace device limit reached.")
    device = Device(**body.model_dump(), id=uuid.uuid4().hex, created_at=now(), updated_at=now())
    await db.devices.insert_one({**device.model_dump(), "user_id": uid})
    await sync_device_alert(db, uid, device.model_dump())
    return device


@router.post("/devices/{device_id}", response_model=Device)
async def edit_device(device_id: str, body: DeviceInput, request: Request):
    db, uid = await scope(request)
    device = await db.devices.find_one({"id": device_id, "user_id": uid}, {"_id": 0, "user_id": 0})
    if not device:
        raise HTTPException(404, "Device not found.")
    updated = Device(**{**device, **body.model_dump(), "updated_at": now()})
    await db.devices.update_one({"id": device_id, "user_id": uid}, {"$set": updated.model_dump()})
    await sync_device_alert(db, uid, updated.model_dump())
    return updated


@router.post("/devices/{device_id}/remove")
async def remove_device(device_id: str, request: Request):
    db, uid = await scope(request)
    result = await db.devices.delete_one({"id": device_id, "user_id": uid})
    if not result.deleted_count:
        raise HTTPException(404, "Device not found.")
    await db.alerts.update_many({"user_id": uid, "device_id": device_id, "source": "control_check"}, {"$set": {"status": "resolved", "updated_at": now()}})
    return {"ok": True}


@router.get("/alerts", response_model=list[Alert])
async def alerts(request: Request):
    db, uid = await scope(request)
    return await db.alerts.find({"user_id": uid}, {"_id": 0, "user_id": 0}).sort("updated_at", -1).to_list(5000)


@router.post("/alerts", response_model=Alert, status_code=201)
async def add_alert(body: AlertInput, request: Request):
    db, uid = await scope(request)
    alert = Alert(**body.model_dump(), id=uuid.uuid4().hex, source="manual", status="open", created_at=now(), updated_at=now())
    await db.alerts.insert_one({**alert.model_dump(), "user_id": uid})
    return alert


@router.post("/alerts/{alert_id}", response_model=Alert)
async def update_alert(alert_id: str, body: AlertStatus, request: Request):
    db, uid = await scope(request)
    doc = await db.alerts.find_one_and_update({"id": alert_id, "user_id": uid},
        {"$set": {"status": body.status, "updated_at": now()}}, return_document=True, projection={"_id": 0, "user_id": 0})
    if not doc:
        raise HTTPException(404, "Incident not found.")
    return Alert(**doc)


@router.get("/reports", response_model=list[Report])
async def reports(request: Request):
    db, uid = await scope(request)
    return await db.reports.find({"user_id": uid}, {"_id": 0, "user_id": 0}).sort("created_at", -1).limit(100).to_list(100)


@router.post("/reports", response_model=Report, status_code=201)
async def create_report(request: Request):
    db, uid = await scope(request)
    snapshot = await snapshot_for(db, uid)
    if not snapshot.device_count:
        raise HTTPException(400, "Register a device before generating a report.")
    workspace = await workspace_for(db, uid)
    report = Report(id=uuid.uuid4().hex, title=f"{workspace.name} · Security posture", workspace=workspace,
                    posture=snapshot, created_at=now(), methodology="Inventory control score: percentage of four declared controls across registered devices (MFA, encryption, updates, access reviewed). Incidents are tracked separately. Based on user-entered data, not endpoint scans; not a compliance certification.")
    await db.reports.insert_one({**report.model_dump(), "user_id": uid})
    return report