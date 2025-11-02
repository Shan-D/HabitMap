from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Habit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    color: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HabitCreate(BaseModel):
    name: str
    color: str

class HabitLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    habit_id: str
    date: str
    completed: bool
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HabitLogCreate(BaseModel):
    habit_id: str
    date: str
    completed: bool

class MoodLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    mood_level: int  # 1-5 scale
    emoji: str
    note: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MoodLogCreate(BaseModel):
    date: str
    mood_level: int
    emoji: str
    note: Optional[str] = ""

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    theme: str = "light"
    color_palette: str = "default"

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    color_palette: Optional[str] = None

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    payload = decode_jwt_token(credentials.credentials)
    return payload["user_id"]

# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    await db.users.insert_one(user.model_dump())
    
    # Create default settings
    settings = UserSettings(user_id=user.id)
    await db.settings.insert_one(settings.model_dump())
    
    token = create_jwt_token(user.id)
    return {"token": token, "user_id": user.id, "email": user.email}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"])
    return {"token": token, "user_id": user["id"], "email": user["email"]}

# ============ HABITS ROUTES ============

@api_router.get("/habits", response_model=List[Habit])
async def get_habits(user_id: str = Depends(get_current_user)):
    habits = await db.habits.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    return habits

@api_router.post("/habits", response_model=Habit)
async def create_habit(habit_data: HabitCreate, user_id: str = Depends(get_current_user)):
    habit = Habit(
        user_id=user_id,
        name=habit_data.name,
        color=habit_data.color
    )
    await db.habits.insert_one(habit.model_dump())
    return habit

@api_router.put("/habits/{habit_id}", response_model=Habit)
async def update_habit(habit_id: str, habit_data: HabitCreate, user_id: str = Depends(get_current_user)):
    result = await db.habits.find_one_and_update(
        {"id": habit_id, "user_id": user_id},
        {"$set": {"name": habit_data.name, "color": habit_data.color}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Habit not found")
    result.pop("_id", None)
    return result

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user_id: str = Depends(get_current_user)):
    result = await db.habits.delete_one({"id": habit_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    # Also delete all logs for this habit
    await db.habit_logs.delete_many({"habit_id": habit_id, "user_id": user_id})
    return {"success": True}

# ============ HABIT LOGS ROUTES ============

@api_router.get("/habit-logs", response_model=List[HabitLog])
async def get_habit_logs(user_id: str = Depends(get_current_user)):
    logs = await db.habit_logs.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    return logs

@api_router.post("/habit-logs", response_model=HabitLog)
async def create_habit_log(log_data: HabitLogCreate, user_id: str = Depends(get_current_user)):
    # Check if log already exists for this date and habit
    existing = await db.habit_logs.find_one({
        "user_id": user_id,
        "habit_id": log_data.habit_id,
        "date": log_data.date
    }, {"_id": 0})
    
    if existing:
        # Update existing log
        await db.habit_logs.update_one(
            {"id": existing["id"]},
            {"$set": {"completed": log_data.completed}}
        )
        existing["completed"] = log_data.completed
        return HabitLog(**existing)
    
    # Create new log
    log = HabitLog(
        user_id=user_id,
        habit_id=log_data.habit_id,
        date=log_data.date,
        completed=log_data.completed
    )
    await db.habit_logs.insert_one(log.model_dump())
    return log

# ============ MOOD LOGS ROUTES ============

@api_router.get("/mood-logs", response_model=List[MoodLog])
async def get_mood_logs(user_id: str = Depends(get_current_user)):
    logs = await db.mood_logs.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    return logs

@api_router.post("/mood-logs", response_model=MoodLog)
async def create_mood_log(log_data: MoodLogCreate, user_id: str = Depends(get_current_user)):
    # Check if log already exists for this date
    existing = await db.mood_logs.find_one({
        "user_id": user_id,
        "date": log_data.date
    }, {"_id": 0})
    
    if existing:
        # Update existing log
        await db.mood_logs.update_one(
            {"id": existing["id"]},
            {"$set": {
                "mood_level": log_data.mood_level,
                "emoji": log_data.emoji,
                "note": log_data.note
            }}
        )
        return MoodLog(
            id=existing["id"],
            user_id=user_id,
            date=log_data.date,
            mood_level=log_data.mood_level,
            emoji=log_data.emoji,
            note=log_data.note,
            created_at=existing["created_at"]
        )
    
    # Create new log
    log = MoodLog(
        user_id=user_id,
        date=log_data.date,
        mood_level=log_data.mood_level,
        emoji=log_data.emoji,
        note=log_data.note
    )
    await db.mood_logs.insert_one(log.model_dump())
    return log

@api_router.delete("/mood-logs/{date}")
async def delete_mood_log(date: str, user_id: str = Depends(get_current_user)):
    result = await db.mood_logs.delete_one({"date": date, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mood log not found")
    return {"success": True}

# ============ ANALYTICS ROUTES ============

@api_router.get("/analytics/summary")
async def get_analytics_summary(user_id: str = Depends(get_current_user)):
    # Get all habits
    habits = await db.habits.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    # Get habit logs for the last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    habit_logs = await db.habit_logs.find({
        "user_id": user_id,
        "date": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(10000)
    
    # Get mood logs for the last 30 days
    mood_logs = await db.mood_logs.find({
        "user_id": user_id,
        "date": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate statistics
    total_habits = len(habits)
    total_completions = sum(1 for log in habit_logs if log["completed"])
    avg_mood = sum(log["mood_level"] for log in mood_logs) / len(mood_logs) if mood_logs else 0
    
    # Calculate completion rate by habit
    habit_stats = {}
    for habit in habits:
        habit_logs_filtered = [log for log in habit_logs if log["habit_id"] == habit["id"]]
        completed_count = sum(1 for log in habit_logs_filtered if log["completed"])
        total_count = len(habit_logs_filtered)
        completion_rate = (completed_count / total_count * 100) if total_count > 0 else 0
        habit_stats[habit["id"]] = {
            "name": habit["name"],
            "completion_rate": round(completion_rate, 1),
            "total_completions": completed_count
        }
    
    return {
        "total_habits": total_habits,
        "total_completions": total_completions,
        "avg_mood": round(avg_mood, 1),
        "habit_stats": habit_stats,
        "mood_trend": mood_logs
    }

@api_router.get("/analytics/ai-insights")
async def get_ai_insights(user_id: str = Depends(get_current_user)):
    # Get data for the last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).date().isoformat()
    
    habits = await db.habits.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    habit_logs = await db.habit_logs.find({
        "user_id": user_id,
        "date": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(10000)
    mood_logs = await db.mood_logs.find({
        "user_id": user_id,
        "date": {"$gte": thirty_days_ago}
    }, {"_id": 0}).to_list(10000)
    
    if not habits or not mood_logs:
        return {"insights": "Not enough data yet. Start tracking your habits and mood to get AI insights!"}
    
    # Prepare data summary
    habit_names = [h["name"] for h in habits]
    completed_habits = {}
    for log in habit_logs:
        if log["completed"]:
            habit_name = next((h["name"] for h in habits if h["id"] == log["habit_id"]), "Unknown")
            date = log["date"]
            if date not in completed_habits:
                completed_habits[date] = []
            completed_habits[date].append(habit_name)
    
    mood_by_date = {log["date"]: log["mood_level"] for log in mood_logs}
    
    # Create prompt for GPT-5
    prompt = f"""
You are a wellness coach analyzing a user's habit and mood data.

User's Habits: {', '.join(habit_names)}

Last 30 days data:
- Total mood entries: {len(mood_logs)}
- Average mood level: {sum(m['mood_level'] for m in mood_logs) / len(mood_logs):.1f}/5
- Total habit completions: {sum(1 for log in habit_logs if log['completed'])}

Correlation data (sample):
"""
    
    # Add sample correlations
    sample_count = 0
    for date in sorted(mood_by_date.keys(), reverse=True)[:10]:
        if date in completed_habits:
            prompt += f"\n- {date}: Mood {mood_by_date[date]}/5, Completed: {', '.join(completed_habits[date])}"
            sample_count += 1
    
    if sample_count == 0:
        prompt += "\nNo habit completions found in recent mood entries."
    
    prompt += "\n\nProvide 3-4 brief, actionable insights about:\n1. Which habits seem to correlate with better mood\n2. Consistency patterns\n3. Recommendations for improvement\n\nKeep it warm, encouraging, and under 200 words."
    
    try:
        # Initialize LLM chat with GPT-5
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"insights_{user_id}",
            system_message="You are a supportive wellness coach providing personalized habit insights."
        ).with_model("openai", "gpt-5")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"insights": response}
    except Exception as e:
        logging.error(f"AI insights error: {str(e)}")
        return {"insights": "Unable to generate AI insights at this time. Please try again later."}

# ============ SETTINGS ROUTES ============

@api_router.get("/settings")
async def get_settings(user_id: str = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": user_id}, {"_id": 0})
    if not settings:
        # Create default settings
        settings = UserSettings(user_id=user_id)
        await db.settings.insert_one(settings.model_dump())
    return settings

@api_router.put("/settings")
async def update_settings(settings_data: SettingsUpdate, user_id: str = Depends(get_current_user)):
    update_dict = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.settings.find_one_and_update(
        {"user_id": user_id},
        {"$set": update_dict},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Settings not found")
    result.pop("_id", None)
    return result

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()