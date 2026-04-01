from pydantic import BaseModel
from typing import List


class AttemptPause(BaseModel):
    current_order: List[str]  # Current arrangement of blocks


class AttemptResume(BaseModel):
    pass  # No data needed, just trigger resume
