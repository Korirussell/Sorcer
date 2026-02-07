# Intelligence: pre-check and grid data
from fastapi import APIRouter

router = APIRouter(tags=["intelligence"])


@router.post("/analyze/prompt")
def analyze_prompt():
    resp = {
        "score": 85,
        "suggestions": ["Remove redundant adjectives"],
        "potential_co2_savings": "0.8g",
    }
    return resp


@router.get("/grid/map")
def get_grid_map():

    '''
    BEN you must do some sort of the following: 
    1) if our cache has data that is less than THRESHOLD amount of time old, return cache
    2) if not, you must use a method (which you need to create) that calls our energy api
    parses the results, saves the results to the cache.
    
    '''

    resp = {
        "regions": [
            {
                "name": "us-central1",
                "score": 92,
                "breakdown": {"solar": 80, "nuclear": 12, "coal": 8},
            }
        ]
    }
    return resp
