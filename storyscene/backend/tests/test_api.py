from copy import deepcopy
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app import main
from app.models import Workspace, Story, GenerateRequest, GeneratedStory
from app.providers import AIProvider, Settings, ProviderError
from app.storage import ProjectStore


def story():
    return {
        'title': 'A test story', 'paragraphs': [{'id': 'p1', 'text': 'Lea finds a key.'}],
        'characters': [{'id': 'lea', 'name': 'Lea', 'color': '#a58abc', 'role': 'Protagonist'}],
        'acts': [{'id': 'a1', 'title': 'The discovery'}],
        'scenes': [{'id': 's1', 'actId': 'a1', 'title': 'The key', 'mainAction': 'Lea finds a key.',
                    'cast': [{'characterId': 'lea', 'action': 'Finds a key.', 'x': 50}],
                    'anchors': [{'paragraphId': 'p1', 'quote': 'Lea finds a key.'}],
                    'events': [], 'mood': {'hope': 100}, 'art': 'garden', 'needsReview': False}],
        'links': [], 'moods': main.MOODS, 'moodPresets': [], 'positions': {},
    }


def workspace():
    return {'schemaVersion': 1, 'id': 'project', 'activeBranchId': 'original',
            'branches': [{'id': 'original', 'name': 'Original', 'createdAt': '2026-11-02', 'forkLabel': 'Import', 'story': story()}]}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'store', ProjectStore(tmp_path / 'storyscene.db'))
    monkeypatch.setattr(main, 'provider', AIProvider(Settings(_env_file=None, groq_api_key='')))
    return TestClient(main.app)


def test_project_roundtrip_and_invalid_update_preserves_previous(client):
    assert client.get('/api/project').json() is None
    data = workspace()
    assert client.put('/api/project', json=data).status_code == 200
    assert client.get('/api/project').json() == data
    invalid = deepcopy(data)
    invalid['branches'][0]['story']['scenes'][0]['cast'][0]['characterId'] = 'missing'
    assert client.put('/api/project', json=invalid).status_code == 422
    assert client.get('/api/project').json() == data


def test_counts_and_missing_configuration(client):
    text = 'Lea finds a key. She walks home and opens a locked wooden box.'
    assert client.post('/api/generate', json={'text': text, 'acts': 4, 'scenes': 2}).status_code == 422
    response = client.post('/api/generate', json={'text': text, 'acts': 1, 'scenes': 2})
    assert response.status_code == 503
    assert 'not configured' in response.json()['detail']
    assert 'groq_api_key' not in client.get('/api/config').json()


def test_source_quotes_and_stale_review_flag():
    s = story()
    s['scenes'][0]['anchors'][0]['quote'] = 'A hallucinated quotation.'
    with pytest.raises(ValidationError):
        Story.model_validate(s)
    s['scenes'][0]['needsReview'] = True
    Story.model_validate(s)


def test_generation_checks_counts_and_source_integrity():
    data = story()
    data['scenes'][0].pop('needsReview')
    data['scenes'][0]['mood'] = {m['id']: 0 for m in main.MOODS}
    generated = GeneratedStory.model_validate({k: data[k] for k in ['title', 'characters', 'acts', 'scenes', 'links']})
    req = GenerateRequest(text='Lea finds a key. She opens a box in the family home.', acts=1, scenes=1)
    assert main.validate_generated(generated, req, data['paragraphs']).scenes[0].id == 's1'
    with pytest.raises(ProviderError):
        main.validate_generated(generated, req.model_copy(update={'scenes': 2}), data['paragraphs'])
    generated.scenes[0].anchors[0].quote = 'This does not occur.'
    with pytest.raises(ProviderError):
        main.validate_generated(generated, req, data['paragraphs'])


def test_scoped_change_validation_and_cross_site_write(client):
    assert client.post('/api/analyze', json={'story': story(), 'sceneId': 'missing', 'change': 'Remove it.'}).status_code == 422
    assert client.put('/api/project', json=workspace(), headers={'Sec-Fetch-Site': 'cross-site'}).status_code == 403


def test_provider_stub_exercises_generation_route(client, monkeypatch):
    class FakeProvider:
        async def structured(self, _schema, _system, payload):
            data = story()
            sc = data['scenes'][0]
            sc.pop('needsReview')
            sc['anchors'][0]['quote'] = payload['paragraphs'][0]['text']
            sc['mood'] = {m['id']: 100 if m['id'] == 'hope' else 0 for m in main.MOODS}
            return GeneratedStory.model_validate({k: data[k] for k in ['title', 'characters', 'acts', 'scenes', 'links']})
    monkeypatch.setattr(main, 'provider', FakeProvider())
    response = client.post('/api/generate', json={'text': 'Lea finds a key. She walks home and opens a wooden box.', 'acts': 1, 'scenes': 1})
    assert response.status_code == 200
    assert response.json()['scenes'][0]['anchors'][0]['quote'] == response.json()['paragraphs'][0]['text']
    assert client.get('/api/project').json() is None  # Proposals never silently replace the saved project.
