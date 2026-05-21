"""
ai-time-companion-mvp backend
FastAPI + OpenAI SDK
"""

import os
import json
import logging
from typing import Any, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── Environment ─────────────────────────────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").strip().lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")

OPENAI_COMPATIBLE_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "groq": "https://api.groq.com/openai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
}
OPENAI_BASE_URL = (
    os.getenv("OPENAI_BASE_URL")
    or OPENAI_COMPATIBLE_BASE_URLS.get(LLM_PROVIDER, OPENAI_COMPATIBLE_BASE_URLS["openai"])
)

_frontend_origins_raw = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in _frontend_origins_raw.split(",")
    if origin.strip()
]
for dev_origin in ("http://localhost:5173", "http://localhost:3000"):
    if dev_origin not in FRONTEND_ORIGINS:
        FRONTEND_ORIGINS.append(dev_origin)

if LLM_PROVIDER not in OPENAI_COMPATIBLE_BASE_URLS:
    logger.warning("Unknown LLM_PROVIDER=%s; using OpenAI-compatible client settings.", LLM_PROVIDER)

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY is not set. LLM calls will fail.")

# ── OpenAI client ────────────────────────────────────────────────────────────
from openai import OpenAI

client: Optional[OpenAI] = None


def get_openai_client() -> OpenAI:
    """Create the OpenAI-compatible client lazily so /health still works without a key."""
    global client
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured.")
    if client is None:
        client = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
        )
    return client

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="AI Time Companion API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────────

class CheckIn(BaseModel):
    sleep_time: str = Field(default="23:00", description="今晚预计休息时间, e.g. 23:00")
    energy_level: int = Field(default=5, ge=1, le=10, description="疲劳指数 1-10")
    mood: str = Field(default="平静", description="情绪标签")

class TodoItem(BaseModel):
    id: str
    title: str

class ScheduleRequest(BaseModel):
    checkin: CheckIn
    yesterday_unfinished_tasks: list[dict[str, Any]] = Field(default_factory=list)
    yesterday_unfinished_action: str = Field(
        default="none",
        description="split_today | postpone | cancel | none"
    )
    today_todos: list[TodoItem] = Field(default_factory=list)
    brain_dump_items: list[str] = Field(default_factory=list)

class TimelineItem(BaseModel):
    time: str
    title: str
    type: str  # focus | rest | soft | admin | life
    reason: str

class ScheduleResponse(BaseModel):
    ai_message: str
    timeline: list[dict[str, Any]]
    deferred_tasks: list[str]
    cancelled_tasks: list[str]
    brain_dump_next_actions: list[str]

class CompletedTask(BaseModel):
    id: str = ""
    title: str = ""
    completed_at: str = ""
    focus_minutes: int = 0
    energy: str = ""
    type: str = "focus"

class DailyCheckin(BaseModel):
    date: str = ""
    sleep_time: str = ""
    energy_level: int = 5
    mood: str = ""

class WeeklyReviewRequest(BaseModel):
    completed_tasks: list[dict[str, Any]] = Field(default_factory=list)
    daily_checkins: list[dict[str, Any]] = Field(default_factory=list)
    brain_dump_items: list[str] = Field(default_factory=list)
    schedules: list[dict[str, Any]] = Field(default_factory=list)

class WeeklyReviewResponse(BaseModel):
    summary_message: str
    effort_highlights: list[str]
    pattern_insights: list[str]
    next_week_suggestions: list[str]
    gentle_closing: str


# ── Schedule JSON Schema ──────────────────────────────────────────────────────
SCHEDULE_SCHEMA = {
    "type": "object",
    "required": ["ai_message", "timeline", "deferred_tasks", "cancelled_tasks", "brain_dump_next_actions"],
    "properties": {
        "ai_message": {"type": "string", "description": "温和理性的今日留言"},
        "timeline": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["time", "title", "type", "reason"],
                "properties": {
                    "time": {"type": "string"},
                    "title": {"type": "string"},
                    "type": {"type": "string", "enum": ["focus", "rest", "soft", "admin", "life"]},
                    "reason": {"type": "string"},
                },
                "additionalProperties": False,
            },
        },
        "deferred_tasks": {"type": "array", "items": {"type": "string"}},
        "cancelled_tasks": {"type": "array", "items": {"type": "string"}},
        "brain_dump_next_actions": {"type": "array", "items": {"type": "string"}},
    },
    "additionalProperties": False,
}

WEEKLY_REVIEW_SCHEMA = {
    "type": "object",
    "required": ["summary_message", "effort_highlights", "pattern_insights", "next_week_suggestions", "gentle_closing"],
    "properties": {
        "summary_message": {"type": "string"},
        "effort_highlights": {"type": "array", "items": {"type": "string"}},
        "pattern_insights": {"type": "array", "items": {"type": "string"}},
        "next_week_suggestions": {"type": "array", "items": {"type": "string"}},
        "gentle_closing": {"type": "string"},
    },
    "additionalProperties": False,
}


# ── Prompt builders ───────────────────────────────────────────────────────────

def build_schedule_prompt(req: ScheduleRequest) -> str:
    ci = req.checkin
    energy = ci.energy_level
    mood = ci.mood
    sleep = ci.sleep_time
    todos = req.today_todos
    brain_dump = req.brain_dump_items
    unfinished = req.yesterday_unfinished_tasks
    action = req.yesterday_unfinished_action

    action_map = {
        "split_today": "用户希望把昨日未完成任务拆小并平摊到今天的时间轴中",
        "postpone": "用户希望把昨日未完成任务放入延后列表，不加入今天排期",
        "cancel": "用户决定取消昨日未完成任务，帮他们卸下心理负担",
        "none": "昨日没有未完成任务，无需处理",
    }
    action_desc = action_map.get(action, "不处理")

    energy_hint = ""
    if energy >= 7:
        energy_hint = "（疲劳指数较高，高耗能任务后必须插入 15-20 分钟放空/休息时间）"

    todos_text = "\n".join(f"- {t.title}" for t in todos) if todos else "（今日暂无待办）"
    brain_text = "\n".join(f"- {b}" for b in brain_dump) if brain_dump else "（无 Brain Dump）"
    unfinished_text = "\n".join(f"- {t.get('title','未知任务')}" for t in unfinished) if unfinished else "（无）"

    return f"""你是一位温柔理性的个人时间助理。
你的目标是根据用户今天的状态，生成一份合适的日程安排。

## 用户今日状态
- 预计休息时间：{sleep}
- 疲劳指数（1=精力满满，10=力竭）：{energy} {energy_hint}
- 情绪：{mood}

## 今日待办任务
{todos_text}

## 大脑放空 Brain Dump
{brain_text}

## 昨日未完成任务
{unfinished_text}
处理方式：{action_desc}

## 排期规则
1. 所有任务必须在睡前 1 小时前结束（休息时间：{sleep}，即任务最晚结束：{_subtract_hour(sleep)}）
2. 疲劳指数 >= 7 时，每个高耗能任务后必须插入 15-20 分钟休息/放空块
3. 不要鸡血激励，不要责备，不要制造羞耻感
4. 根据情绪调整语气，情绪低落时更温柔，情绪好时可以稍微积极
5. type 只能是：focus / rest / soft / admin / life
6. ai_message 要温和、有陪伴感，像朋友说的话，50字以内
7. 根据用户选择处理昨日未完成任务（见上方处理方式）
8. brain_dump_next_actions 只列出明确可执行的下一步动作，模糊想法不要列

请输出符合 JSON Schema 的结果，语言为中文。"""


def build_weekly_review_prompt(req: WeeklyReviewRequest) -> str:
    tasks = req.completed_tasks
    checkins = req.daily_checkins
    brain = req.brain_dump_items
    schedules = req.schedules

    task_count = len(tasks)
    focus_total = sum(t.get("focus_minutes", 0) for t in tasks)
    moods = [c.get("mood", "") for c in checkins if c.get("mood")]
    energies = [c.get("energy_level", 5) for c in checkins if c.get("energy_level")]
    avg_energy = sum(energies) / len(energies) if energies else None

    task_list = "\n".join(f"- {t.get('title','')}" for t in tasks[:20]) if tasks else "（本周暂无完成任务）"
    mood_list = "、".join(moods[-5:]) if moods else "（无记录）"
    brain_list = "\n".join(f"- {b}" for b in brain[:10]) if brain else "（无 Brain Dump）"

    energy_desc = ""
    if avg_energy is not None:
        if avg_energy >= 7:
            energy_desc = "本周整体疲劳度较高（平均 {:.1f}/10）".format(avg_energy)
        elif avg_energy <= 4:
            energy_desc = "本周整体状态不错（平均 {:.1f}/10）".format(avg_energy)
        else:
            energy_desc = "本周状态中等（平均 {:.1f}/10）".format(avg_energy)

    data_quality = "充足" if task_count >= 5 else "有限（数据积累不足，部分分析可能不准确）"

    return f"""你是一位温柔理性的个人复盘教练，像一封宇宙寄来的温柔回信。

## 本周数据（数据质量：{data_quality}）
- 完成任务数：{task_count}
- 累计专注时间：{focus_total} 分钟
- 近期情绪：{mood_list}
- 能量状态：{energy_desc if energy_desc else '无记录'}

## 本周完成任务
{task_list}

## Brain Dump 内容
{brain_list}

## 复盘规则
1. 必须中文输出
2. 语气：温柔、理性，像私人复盘教练
3. 不要鸡血、不要制造愧疚
4. 不要说"你应该"，用"可以试试""也许更适合""下周不妨"
5. 如果数据不足（任务数 < 5），要诚实说明，不要假装洞察很多
6. 如果有数据，要结合任务类型、疲劳状态、情绪推断节奏规律
7. effort_highlights：列出真实的成就，不要夸大
8. pattern_insights：基于数据推断节奏规律，数据不足时如实说明
9. next_week_suggestions：温和的建议，2-4 条，具体可操作
10. gentle_closing：一句温柔收束，50字以内

请输出符合 JSON Schema 的结果。"""


def _subtract_hour(t: str) -> str:
    """Subtract 1 hour from time string like 23:00."""
    try:
        h, m = t.replace("24:", "0:").split(":")
        h = int(h)
        h = (h - 1) % 24
        return f"{h:02d}:{m}"
    except Exception:
        return "22:00"


def call_llm_json(prompt: str, schema: dict) -> dict:
    """Call OpenAI with JSON schema output enforcement."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured.")

    llm_client = get_openai_client()

    response = llm_client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {
                "role": "system",
                "content": "你是一个有温度的 AI 助理。你必须严格按照 JSON Schema 格式输出，不要输出任何额外文字。",
            },
            {"role": "user", "content": prompt},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "output",
                "strict": True,
                "schema": schema,
            },
        },
        max_tokens=2048,
        temperature=0.7,
    )
    raw = response.choices[0].message.content
    return json.loads(raw)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "provider": LLM_PROVIDER,
        "model": OPENAI_MODEL,
        "base_url": OPENAI_BASE_URL,
        "api_key_configured": bool(OPENAI_API_KEY),
    }


@app.post("/api/schedule", response_model=ScheduleResponse)
async def create_schedule(req: ScheduleRequest):
    logger.info(f"Schedule request: mood={req.checkin.mood}, energy={req.checkin.energy_level}")
    try:
        prompt = build_schedule_prompt(req)
        result = call_llm_json(prompt, SCHEDULE_SCHEMA)
        logger.info(f"Schedule generated with {len(result.get('timeline', []))} slots")
        return result
    except ValueError as e:
        logger.error(f"Config error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"LLM 未配置：{str(e)}。请在后端 .env 中设置 OPENAI_API_KEY。",
        )
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=502, detail=f"LLM 返回格式异常：{str(e)}")
    except Exception as e:
        logger.error(f"Schedule error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"排期生成失败：{str(e)}",
        )


@app.post("/api/weekly-review", response_model=WeeklyReviewResponse)
async def weekly_review(req: WeeklyReviewRequest):
    task_count = len(req.completed_tasks)
    logger.info(f"Weekly review request: {task_count} tasks, {len(req.daily_checkins)} checkins")
    try:
        prompt = build_weekly_review_prompt(req)
        result = call_llm_json(prompt, WEEKLY_REVIEW_SCHEMA)
        logger.info("Weekly review generated successfully")
        return result
    except ValueError as e:
        logger.error(f"Config error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"LLM 未配置：{str(e)}。请在后端 .env 中设置 OPENAI_API_KEY。",
        )
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=502, detail=f"LLM 返回格式异常：{str(e)}")
    except Exception as e:
        logger.error(f"Weekly review error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"周报生成失败：{str(e)}",
        )
