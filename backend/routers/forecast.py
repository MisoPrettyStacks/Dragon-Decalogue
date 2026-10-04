from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, Response

from lib import bundle as bundle_lib
from lib.benchmark import benchmark_rows, calibration_report
from lib.db import db
from lib.decalogue import COMMANDMENTS
from lib.engine import AGENT_META, forecast, load_weights
from models.forecast import (
    AgentInfo,
    BenchmarkRow,
    BundleManifest,
    CalibrationReport,
    Commandment,
    FeatureInput,
    PreviewResult,
    Question,
    QuestionCreate,
    QuestionSummary,
)

router = APIRouter(tags=["forecast"])


# ----------------------------------------------------------------- engine ---
@router.get("/engine/agents", response_model=List[AgentInfo])
async def list_agents() -> List[AgentInfo]:
    weights = load_weights()["agent_weights"]
    total = sum(weights.values())
    solo = {r["agent"]: r["brier"] for r in calibration_report()["per_agent"]}
    return [
        AgentInfo(
            agent=name,
            label=meta["label"],
            lens=meta["lens"],
            formula=meta["formula"],
            rationale=meta["rationale"],
            weight=round(weights[name] / total, 4),
            solo_brier=solo[name],
        )
        for name, meta in AGENT_META.items()
    ]


@router.get("/engine/calibration", response_model=CalibrationReport)
async def get_calibration() -> Dict[str, Any]:
    return calibration_report()


@router.get("/engine/benchmark", response_model=List[BenchmarkRow])
async def get_benchmark(limit: int = 200) -> List[Dict[str, Any]]:
    return benchmark_rows(max(1, min(limit, 200)))


@router.post("/engine/preview", response_model=PreviewResult)
async def preview(features: FeatureInput) -> Dict[str, Any]:
    return forecast(features.model_dump())


@router.get("/decalogue", response_model=List[Commandment])
async def get_decalogue() -> List[Dict[str, Any]]:
    return COMMANDMENTS


# -------------------------------------------------------------- questions ---
@router.post("/questions", response_model=Question, status_code=201)
async def create_question(payload: QuestionCreate) -> Question:
    result = forecast(payload.features.model_dump())
    q = Question(
        title=payload.title.strip(),
        domain=payload.domain,
        resolution_criteria=payload.resolution_criteria.strip(),
        **{
            k: result[k]
            for k in (
                "features",
                "breakdown",
                "pooled_logit",
                "extremized_logit",
                "calibrated_logit",
                "extremizing_exponent",
                "calibration_slope",
                "calibration_intercept",
                "probability",
                "disagreement",
                "confidence",
            )
        },
    )
    await db.questions.insert_one(q.model_dump())
    return q


@router.get("/questions", response_model=List[QuestionSummary])
async def list_questions() -> List[QuestionSummary]:
    finder = await db.questions.find({}, {"_id": 0})
    docs = await finder.sort("created_at", -1).to_list(500)
    return [QuestionSummary(**d) for d in docs]


@router.get("/questions/{question_id}", response_model=Question)
async def get_question(question_id: str) -> Question:
    doc = await db.questions.find_one({"id": question_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Question not found")
    return Question(**doc)


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str) -> Dict[str, Any]:
    res = await db.questions.delete_one({"id": question_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"deleted": question_id}


# ----------------------------------------------------------------- bundle ---
@router.get("/bundle/manifest", response_model=BundleManifest)
async def bundle_manifest() -> BundleManifest:
    files = bundle_lib.collect()
    total = 0
    for p, _ in files:
        try:
            total += p.stat().st_size
        except OSError:
            pass
    return BundleManifest(
        file_count=len(files) + 3,
        total_bytes=total,
        files=[rel for _, rel in files],
        download_url="/api/bundle/source.zip",
    )


@router.get("/bundle/source.zip")
async def bundle_zip() -> Response:
    data = bundle_lib.build_zip()
    return Response(
        content=data,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="dragonfly-decalogue-source.zip"',
            "Content-Length": str(len(data)),
        },
    )
