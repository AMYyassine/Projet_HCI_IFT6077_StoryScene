from pathlib import Path
import re
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from .models import Workspace, Story, GenerateRequest, ChangeRequest, GeneratedStory, Impact, Rewrite
from .providers import AIProvider, Settings, ProviderError
from .storage import ProjectStore

app = FastAPI(title='Storyscene local API', version='0.1.0')
provider = AIProvider(Settings())
store = ProjectStore(Path(__file__).resolve().parents[1] / 'data' / 'storyscene.db')
MOODS = [
    {'id': 'hope', 'name': 'Hope', 'color': '#e9bd55'}, {'id': 'joy', 'name': 'Joy', 'color': '#e99675'},
    {'id': 'tension', 'name': 'Tension', 'color': '#d6737a'}, {'id': 'mystery', 'name': 'Mystery', 'color': '#9b82bf'},
    {'id': 'sadness', 'name': 'Sadness', 'color': '#7f9dbf'}, {'id': 'calm', 'name': 'Calm', 'color': '#82ae9f'},
]


@app.middleware('http')
async def local_request_guard(request: Request, call_next):
    # The frontend uses Vite's same-origin /api proxy. Reject cross-site writes.
    if request.method in {'POST', 'PUT', 'DELETE', 'PATCH'}:
        if request.headers.get('sec-fetch-site') == 'cross-site':
            return JSONResponse({'detail': 'Cross-site writes are not allowed.'}, status_code=403)
        if not request.headers.get('content-type', '').startswith('application/json'):
            return JSONResponse({'detail': 'Use application/json.'}, status_code=415)
        if int(request.headers.get('content-length', '0') or '0') > 10_000_000:
            return JSONResponse({'detail': 'Project is too large (10 MB maximum).'}, status_code=413)
    return await call_next(request)


@app.exception_handler(ProviderError)
async def provider_error_handler(_request: Request, exc: ProviderError):
    return JSONResponse(status_code=exc.status, content={'detail': exc.message})


@app.get('/api/config')
def configuration():
    return {'provider': provider.settings.ai_provider, 'model': provider.model, 'configured': provider.configured}


@app.get('/api/project')
def load_project():
    return store.load()


@app.put('/api/project')
def save_project(project: Workspace):
    store.save(project)
    return {'saved': True}


def validate_generated(generated: GeneratedStory, request: GenerateRequest, paragraphs: list[dict]):
    if len(generated.acts) != request.acts or len(generated.scenes) != request.scenes:
        raise ProviderError('The AI did not return the requested number of acts and scenes. Please try again.')
    if any(not any(s.actId == a.id for s in generated.scenes) for a in generated.acts):
        raise ProviderError('The AI returned an empty act. Please try again.')
    if any(not s.anchors for s in generated.scenes):
        raise ProviderError('The AI returned a scene without a source passage. Please try again.')
    data = generated.model_dump()
    data.update(paragraphs=paragraphs, moods=MOODS, positions={})
    for scene in data['scenes']:
        scene['needsReview'] = False
    try:
        return Story.model_validate(data)
    except ValidationError as exc:
        raise ProviderError('The AI returned an invalid reference or a quotation that does not occur in your story. Nothing was imported; please try again.') from exc


@app.post('/api/generate')
async def generate(request: GenerateRequest):
    paragraphs = [{'id': f'p{i+1}', 'text': text.strip()} for i, text in enumerate(re.split(r'\n\s*\n', request.text.strip())) if text.strip()]
    result = await provider.structured(GeneratedStory,
        'Map an existing story into acts and scenes. Preserve the story and quote exact source substrings in anchors. '
        'Do not invent story content. Use unique stable IDs. Every act has at least one scene. '
        'Cast must reference character IDs; x is a visual position from 15 to 85. '
        'Dependencies explain explicit causal or preparatory relationships; do not add links for mere reading order. '
        'Choose a schematic art template from the allowed values. Mood weights range from 0 to 100 and should sum to 100. '
        'Use hex character colors. Include individual actions. Produce the exact requested counts.',
        {'paragraphs': paragraphs, 'actCount': request.acts, 'sceneCount': request.scenes})
    return validate_generated(result, request, paragraphs)


@app.post('/api/analyze')
async def analyze(request: ChangeRequest):
    result = await provider.structured(Impact,
        'Review the proposed change to a scene. It has not been applied. Identify downstream narrative consequences, '
        'character continuity issues and uncertain inferences. Reference only existing scene IDs. '
        'Do not claim completeness or certainty. Suggest repairs; never silently rewrite the story.', request.model_dump())
    ids = {s.id for s in request.story.scenes}
    if any(a.sceneId not in ids for a in result.affected):
        raise ProviderError('The AI impact report referenced a scene that does not exist. Please try again.')
    return result


@app.post('/api/rewrite')
async def rewrite(request: ChangeRequest):
    return await provider.structured(Rewrite,
        'Propose replacement prose only for the selected scene. Follow the requested edit and the scene cast, actions, '
        'events and mood weights. Preserve the rest of the story. Return the prose as text and a brief explanation. '
        'This is a proposal requiring human acceptance, not an automatic edit.', request.model_dump())
