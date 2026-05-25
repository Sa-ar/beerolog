from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, recommendations, users

app = FastAPI(title="Beerolog API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(recommendations.router)
app.include_router(users.router)
