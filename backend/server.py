"""DragonflyDecalogue API server."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.forecast import router as forecast_router

app = FastAPI(
    title="DragonflyDecalogue",
    description="Tetlock-inspired forecasting engine with eight aggregated lenses",
    version="1.0.0",
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
api_router = FastAPI()
api_router.include_router(forecast_router)
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    return {
        "name": "DragonflyDecalogue",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
