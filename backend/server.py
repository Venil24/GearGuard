from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'gearguard-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# Security
security = HTTPBearer()

# Password hashing
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Create the main app
app = FastAPI(title="GearGuard API", version="1.0.0")

# CORS - Add this BEFORE routes
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ================== MODELS ==================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "employee"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar: Optional[str] = None
    team_id: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EquipmentCreate(BaseModel):
    name: str
    serial_number: str
    department: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_info: Optional[str] = None
    location: str
    default_team_id: str
    default_technician_id: Optional[str] = None
    is_usable: bool = True
    image_url: Optional[str] = None

class EquipmentResponse(BaseModel):
    id: str
    name: str
    serial_number: str
    department: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    purchase_date: Optional[str] = None
    warranty_info: Optional[str] = None
    location: str
    default_team_id: str
    default_technician_id: Optional[str] = None
    is_usable: bool
    image_url: Optional[str] = None
    created_at: str
    maintenance_count: int = 0

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None

class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    member_ids: List[str] = []
    created_at: str
    member_count: int = 0

class MaintenanceRequestCreate(BaseModel):
    subject: str
    equipment_id: str
    request_type: str
    scheduled_date: Optional[str] = None
    description: Optional[str] = None

class MaintenanceRequestUpdate(BaseModel):
    subject: Optional[str] = None
    status: Optional[str] = None
    assigned_technician_id: Optional[str] = None
    duration_hours: Optional[float] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceRequestResponse(BaseModel):
    id: str
    subject: str
    equipment_id: str
    equipment_name: Optional[str] = None
    team_id: str
    team_name: Optional[str] = None
    assigned_technician_id: Optional[str] = None
    technician_name: Optional[str] = None
    request_type: str
    scheduled_date: Optional[str] = None
    duration_hours: Optional[float] = None
    status: str
    created_by_id: str
    created_by_name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    is_overdue: bool = False

# ================== HELPERS ==================

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def check_roles(user: dict, allowed_roles: List[str]):
    if user["role"] not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

# ================== SEED DATA (NO AUTH) ==================

@api_router.post("/seed")
async def seed_database():
    existing = await db.users.find_one({"email": "admin@gearguard.com"})
    if existing:
        return {"message": "Database already seeded"}
    
    teams_data = [
        {"id": str(uuid.uuid4()), "name": "Mechanical Team", "description": "Handles all mechanical equipment", "member_ids": [], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Electrical Team", "description": "Handles electrical systems", "member_ids": [], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "IT Support", "description": "Handles IT infrastructure", "member_ids": [], "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.teams.insert_many(teams_data)
    
    users_data = [
        {"id": str(uuid.uuid4()), "email": "admin@gearguard.com", "password": get_password_hash("admin123"), "name": "Admin User", "role": "admin", "avatar": None, "team_id": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "manager@gearguard.com", "password": get_password_hash("manager123"), "name": "John Manager", "role": "manager", "avatar": None, "team_id": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "tech1@gearguard.com", "password": get_password_hash("tech123"), "name": "Mike Technician", "role": "technician", "avatar": None, "team_id": teams_data[0]["id"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "tech2@gearguard.com", "password": get_password_hash("tech123"), "name": "Sarah Engineer", "role": "technician", "avatar": None, "team_id": teams_data[1]["id"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "tech3@gearguard.com", "password": get_password_hash("tech123"), "name": "Alex IT", "role": "technician", "avatar": None, "team_id": teams_data[2]["id"], "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "email": "employee@gearguard.com", "password": get_password_hash("employee123"), "name": "Jane Employee", "role": "employee", "avatar": None, "team_id": None, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.users.insert_many(users_data)
    
    for i, team in enumerate(teams_data):
        tech_id = users_data[i + 2]["id"]
        await db.teams.update_one({"id": team["id"]}, {"$push": {"member_ids": tech_id}})
    
    equipment_data = [
        {"id": str(uuid.uuid4()), "name": "CNC Machine A1", "serial_number": "CNC-2024-001", "department": "Production", "assigned_employee_id": None, "purchase_date": "2023-01-15", "warranty_info": "Valid until 2026-01-15", "location": "Building A, Floor 1", "default_team_id": teams_data[0]["id"], "default_technician_id": users_data[2]["id"], "is_usable": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Industrial Press B2", "serial_number": "IP-2024-002", "department": "Production", "assigned_employee_id": None, "purchase_date": "2022-06-20", "warranty_info": "Expired", "location": "Building A, Floor 2", "default_team_id": teams_data[0]["id"], "default_technician_id": users_data[2]["id"], "is_usable": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Power Generator G1", "serial_number": "PG-2024-003", "department": "Facilities", "assigned_employee_id": None, "purchase_date": "2021-03-10", "warranty_info": "Valid until 2025-03-10", "location": "Building B, Basement", "default_team_id": teams_data[1]["id"], "default_technician_id": users_data[3]["id"], "is_usable": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "HVAC System H1", "serial_number": "HVAC-2024-004", "department": "Facilities", "assigned_employee_id": None, "purchase_date": "2023-08-05", "warranty_info": "Valid until 2028-08-05", "location": "Building A, Rooftop", "default_team_id": teams_data[1]["id"], "default_technician_id": users_data[3]["id"], "is_usable": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Server Rack S1", "serial_number": "SRV-2024-005", "department": "IT", "assigned_employee_id": None, "purchase_date": "2024-01-20", "warranty_info": "Valid until 2027-01-20", "location": "Data Center, Room 101", "default_team_id": teams_data[2]["id"], "default_technician_id": users_data[4]["id"], "is_usable": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Network Switch N1", "serial_number": "NET-2024-006", "department": "IT", "assigned_employee_id": None, "purchase_date": "2024-02-15", "warranty_info": "Valid until 2029-02-15", "location": "Data Center, Room 101", "default_team_id": teams_data[2]["id"], "default_technician_id": users_data[4]["id"], "is_usable": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.equipment.insert_many(equipment_data)
    
    now = datetime.now(timezone.utc)
    requests_data = [
        {"id": str(uuid.uuid4()), "subject": "CNC Machine not starting", "equipment_id": equipment_data[0]["id"], "team_id": teams_data[0]["id"], "assigned_technician_id": users_data[2]["id"], "request_type": "corrective", "scheduled_date": None, "duration_hours": None, "status": "new", "created_by_id": users_data[5]["id"], "description": "Machine fails to power on", "notes": None, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "subject": "Monthly maintenance check", "equipment_id": equipment_data[2]["id"], "team_id": teams_data[1]["id"], "assigned_technician_id": users_data[3]["id"], "request_type": "preventive", "scheduled_date": (now + timedelta(days=7)).isoformat(), "duration_hours": None, "status": "new", "created_by_id": users_data[1]["id"], "description": "Routine monthly inspection", "notes": None, "created_at": now.isoformat(), "updated_at": now.isoformat()},
        {"id": str(uuid.uuid4()), "subject": "Oil leak detected", "equipment_id": equipment_data[1]["id"], "team_id": teams_data[0]["id"], "assigned_technician_id": users_data[2]["id"], "request_type": "corrective", "scheduled_date": None, "duration_hours": 2.5, "status": "in_progress", "created_by_id": users_data[5]["id"], "description": "Oil leaking from hydraulic system", "notes": "Parts ordered", "created_at": (now - timedelta(days=2)).isoformat(), "updated_at": now.isoformat()},
    ]
    await db.maintenance_requests.insert_many(requests_data)
    
    return {"message": "Database seeded successfully", "credentials": {"admin": {"email": "admin@gearguard.com", "password": "admin123"}}}

# ================== AUTH ROUTES ==================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "name": user_data.name,
        "role": user_data.role,
        "avatar": None,
        "team_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token({"sub": user_id})
    user_response = UserResponse(
        id=user_id, email=user_data.email, name=user_data.name, role=user_data.role,
        avatar=None, team_id=None, created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user["id"]})
    user_response = UserResponse(
        id=user["id"], email=user["email"], name=user["name"], role=user["role"],
        avatar=user.get("avatar"), team_id=user.get("team_id"), created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)

# ================== USERS ROUTES ==================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(role: Optional[str] = None, team_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if role: query["role"] = role
    if team_id: query["team_id"] = team_id
    users = await db.users.find(query, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, name: Optional[str] = None, role: Optional[str] = None, team_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    update_data = {}
    if name: update_data["name"] = name
    if role: update_data["role"] = role
    if team_id is not None: update_data["team_id"] = team_id
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user: raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)

# ================== EQUIPMENT ROUTES ==================

@api_router.post("/equipment", response_model=EquipmentResponse)
async def create_equipment(equipment: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    equipment_id = str(uuid.uuid4())
    equipment_doc = {"id": equipment_id, **equipment.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.equipment.insert_one(equipment_doc)
    return EquipmentResponse(**equipment_doc, maintenance_count=0)

@api_router.get("/equipment", response_model=List[EquipmentResponse])
async def get_equipment(department: Optional[str] = None, is_usable: Optional[bool] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if department: query["department"] = department
    if is_usable is not None: query["is_usable"] = is_usable
    equipment_list = await db.equipment.find(query, {"_id": 0}).to_list(1000)
    result = []
    for eq in equipment_list:
        count = await db.maintenance_requests.count_documents({"equipment_id": eq["id"], "status": {"$in": ["new", "in_progress"]}})
        result.append(EquipmentResponse(**eq, maintenance_count=count))
    return result

@api_router.get("/equipment/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment_by_id(equipment_id: str, current_user: dict = Depends(get_current_user)):
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not equipment: raise HTTPException(status_code=404, detail="Equipment not found")
    count = await db.maintenance_requests.count_documents({"equipment_id": equipment_id, "status": {"$in": ["new", "in_progress"]}})
    return EquipmentResponse(**equipment, maintenance_count=count)

@api_router.put("/equipment/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(equipment_id: str, equipment: EquipmentCreate, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    await db.equipment.update_one({"id": equipment_id}, {"$set": equipment.model_dump()})
    updated = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not updated: raise HTTPException(status_code=404, detail="Equipment not found")
    count = await db.maintenance_requests.count_documents({"equipment_id": equipment_id, "status": {"$in": ["new", "in_progress"]}})
    return EquipmentResponse(**updated, maintenance_count=count)

@api_router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin"])
    result = await db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Equipment not found")
    return {"message": "Equipment deleted"}

# ================== TEAMS ROUTES ==================

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(team: TeamCreate, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    team_id = str(uuid.uuid4())
    team_doc = {"id": team_id, **team.model_dump(), "member_ids": [], "created_at": datetime.now(timezone.utc).isoformat()}
    await db.teams.insert_one(team_doc)
    return TeamResponse(**team_doc, member_count=0)

@api_router.get("/teams", response_model=List[TeamResponse])
async def get_teams(current_user: dict = Depends(get_current_user)):
    teams = await db.teams.find({}, {"_id": 0}).to_list(1000)
    result = []
    for team in teams:
        member_count = await db.users.count_documents({"team_id": team["id"]})
        result.append(TeamResponse(**team, member_count=member_count))
    return result

@api_router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team_by_id(team_id: str, current_user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id}, {"_id": 0})
    if not team: raise HTTPException(status_code=404, detail="Team not found")
    member_count = await db.users.count_documents({"team_id": team_id})
    return TeamResponse(**team, member_count=member_count)

@api_router.post("/teams/{team_id}/members/{user_id}")
async def add_team_member(team_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    await db.users.update_one({"id": user_id}, {"$set": {"team_id": team_id}})
    await db.teams.update_one({"id": team_id}, {"$addToSet": {"member_ids": user_id}})
    return {"message": "Member added to team"}

@api_router.delete("/teams/{team_id}/members/{user_id}")
async def remove_team_member(team_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    await db.users.update_one({"id": user_id}, {"$set": {"team_id": None}})
    await db.teams.update_one({"id": team_id}, {"$pull": {"member_ids": user_id}})
    return {"message": "Member removed from team"}

@api_router.get("/teams/{team_id}/technicians", response_model=List[UserResponse])
async def get_team_technicians(team_id: str, current_user: dict = Depends(get_current_user)):
    technicians = await db.users.find({"team_id": team_id, "role": "technician"}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**t) for t in technicians]

# ================== MAINTENANCE REQUESTS ==================

@api_router.post("/maintenance-requests", response_model=MaintenanceRequestResponse)
async def create_maintenance_request(request: MaintenanceRequestCreate, current_user: dict = Depends(get_current_user)):
    if request.request_type == "preventive":
        check_roles(current_user, ["admin", "manager"])
    equipment = await db.equipment.find_one({"id": request.equipment_id}, {"_id": 0})
    if not equipment: raise HTTPException(status_code=404, detail="Equipment not found")
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    request_doc = {
        "id": request_id, "subject": request.subject, "equipment_id": request.equipment_id,
        "team_id": equipment["default_team_id"], "assigned_technician_id": equipment.get("default_technician_id"),
        "request_type": request.request_type, "scheduled_date": request.scheduled_date,
        "duration_hours": None, "status": "new", "created_by_id": current_user["id"],
        "description": request.description, "notes": None, "created_at": now, "updated_at": now
    }
    await db.maintenance_requests.insert_one(request_doc)
    team = await db.teams.find_one({"id": equipment["default_team_id"]}, {"_id": 0})
    return MaintenanceRequestResponse(**request_doc, equipment_name=equipment["name"], team_name=team["name"] if team else None, technician_name=None, created_by_name=current_user["name"], is_overdue=False)

@api_router.get("/maintenance-requests", response_model=List[MaintenanceRequestResponse])
async def get_maintenance_requests(status: Optional[str] = None, equipment_id: Optional[str] = None, request_type: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status: query["status"] = status
    if equipment_id: query["equipment_id"] = equipment_id
    if request_type: query["request_type"] = request_type
    requests = await db.maintenance_requests.find(query, {"_id": 0}).to_list(1000)
    result = []
    for req in requests:
        equipment = await db.equipment.find_one({"id": req["equipment_id"]}, {"_id": 0})
        team = await db.teams.find_one({"id": req["team_id"]}, {"_id": 0})
        technician = await db.users.find_one({"id": req.get("assigned_technician_id")}, {"_id": 0, "password": 0}) if req.get("assigned_technician_id") else None
        creator = await db.users.find_one({"id": req["created_by_id"]}, {"_id": 0, "password": 0})
        is_overdue = False
        if req.get("scheduled_date") and req["status"] in ["new", "in_progress"]:
            try:
                scheduled = datetime.fromisoformat(req["scheduled_date"].replace("Z", "+00:00"))
                if scheduled < datetime.now(timezone.utc): is_overdue = True
            except: pass
        result.append(MaintenanceRequestResponse(**req, equipment_name=equipment["name"] if equipment else None, team_name=team["name"] if team else None, technician_name=technician["name"] if technician else None, created_by_name=creator["name"] if creator else None, is_overdue=is_overdue))
    return result

@api_router.get("/maintenance-requests/{request_id}", response_model=MaintenanceRequestResponse)
async def get_maintenance_request_by_id(request_id: str, current_user: dict = Depends(get_current_user)):
    req = await db.maintenance_requests.find_one({"id": request_id}, {"_id": 0})
    if not req: raise HTTPException(status_code=404, detail="Request not found")
    equipment = await db.equipment.find_one({"id": req["equipment_id"]}, {"_id": 0})
    team = await db.teams.find_one({"id": req["team_id"]}, {"_id": 0})
    technician = await db.users.find_one({"id": req.get("assigned_technician_id")}, {"_id": 0, "password": 0}) if req.get("assigned_technician_id") else None
    creator = await db.users.find_one({"id": req["created_by_id"]}, {"_id": 0, "password": 0})
    is_overdue = False
    if req.get("scheduled_date") and req["status"] in ["new", "in_progress"]:
        try:
            scheduled = datetime.fromisoformat(req["scheduled_date"].replace("Z", "+00:00"))
            if scheduled < datetime.now(timezone.utc): is_overdue = True
        except: pass
    return MaintenanceRequestResponse(**req, equipment_name=equipment["name"] if equipment else None, team_name=team["name"] if team else None, technician_name=technician["name"] if technician else None, created_by_name=creator["name"] if creator else None, is_overdue=is_overdue)

@api_router.put("/maintenance-requests/{request_id}", response_model=MaintenanceRequestResponse)
async def update_maintenance_request(request_id: str, update: MaintenanceRequestUpdate, current_user: dict = Depends(get_current_user)):
    req = await db.maintenance_requests.find_one({"id": request_id}, {"_id": 0})
    if not req: raise HTTPException(status_code=404, detail="Request not found")
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update.status == "scrap":
        await db.equipment.update_one({"id": req["equipment_id"]}, {"$set": {"is_usable": False}})
        update_data["notes"] = (update_data.get("notes", "") or "") + " [Equipment marked as scrapped]"
    await db.maintenance_requests.update_one({"id": request_id}, {"$set": update_data})
    return await get_maintenance_request_by_id(request_id, current_user)

@api_router.delete("/maintenance-requests/{request_id}")
async def delete_maintenance_request(request_id: str, current_user: dict = Depends(get_current_user)):
    check_roles(current_user, ["admin", "manager"])
    result = await db.maintenance_requests.delete_one({"id": request_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Request deleted"}

# ================== DASHBOARD ==================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total_equipment = await db.equipment.count_documents({})
    usable_equipment = await db.equipment.count_documents({"is_usable": True})
    new_requests = await db.maintenance_requests.count_documents({"status": "new"})
    in_progress = await db.maintenance_requests.count_documents({"status": "in_progress"})
    repaired = await db.maintenance_requests.count_documents({"status": "repaired"})
    scrapped = await db.maintenance_requests.count_documents({"status": "scrap"})
    teams_count = await db.teams.count_documents({})
    technicians_count = await db.users.count_documents({"role": "technician"})
    return {"total_equipment": total_equipment, "usable_equipment": usable_equipment, "requests": {"new": new_requests, "in_progress": in_progress, "repaired": repaired, "scrap": scrapped, "overdue": 0}, "teams_count": teams_count, "technicians_count": technicians_count}

@api_router.get("/reports/requests-by-team")
async def get_requests_by_team(current_user: dict = Depends(get_current_user)):
    teams = await db.teams.find({}, {"_id": 0}).to_list(100)
    result = []
    for team in teams:
        count = await db.maintenance_requests.count_documents({"team_id": team["id"]})
        result.append({"team_name": team["name"], "count": count})
    return result

@api_router.get("/reports/requests-by-status")
async def get_requests_by_status(current_user: dict = Depends(get_current_user)):
    statuses = ["new", "in_progress", "repaired", "scrap"]
    result = []
    for s in statuses:
        count = await db.maintenance_requests.count_documents({"status": s})
        result.append({"status": s, "count": count})
    return result

# Include the router
app.include_router(api_router)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()