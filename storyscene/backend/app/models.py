from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Paragraph(Model):
    id: str
    text: str


class Character(Model):
    id: str
    name: str
    color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')
    role: str


class Act(Model):
    id: str
    title: str


class Anchor(Model):
    paragraphId: str
    quote: str = Field(min_length=1)


class CastMember(Model):
    characterId: str
    action: str
    x: float = Field(ge=0, le=100)


class Scene(Model):
    id: str
    actId: str
    title: str
    mainAction: str
    cast: list[CastMember]
    anchors: list[Anchor]
    events: list[str]
    mood: dict[str, float]
    art: Literal['house', 'garden', 'attic', 'letter', 'photo', 'desk', 'cafe', 'confession', 'farewell', 'train']
    needsReview: bool


class Link(Model):
    id: str
    source: str
    target: str
    type: Literal['causes', 'prepares']
    reason: str


class Mood(Model):
    id: str
    name: str
    color: str = Field(pattern=r'^#[0-9a-fA-F]{6}$')


class Position(Model):
    x: float
    y: float


class MoodPreset(Model):
    id: str
    name: str
    mix: dict[str, float]


class Story(Model):
    title: str
    paragraphs: list[Paragraph]
    characters: list[Character]
    acts: list[Act]
    scenes: list[Scene]
    links: list[Link]
    moods: list[Mood]
    moodPresets: list[MoodPreset] = Field(default_factory=list)
    positions: dict[str, Position]

    @model_validator(mode='after')
    def validate_references(self):
        for collection in (self.paragraphs, self.characters, self.acts, self.scenes, self.links, self.moods):
            ids = [item.id for item in collection]
            if len(ids) != len(set(ids)):
                raise ValueError('Identifiers must be unique within each collection.')
        paragraphs = {p.id: p.text for p in self.paragraphs}
        characters, acts = {c.id for c in self.characters}, {a.id for a in self.acts}
        scenes, moods = {s.id for s in self.scenes}, {m.id for m in self.moods}
        if scenes.intersection(acts):
            raise ValueError('Act and scene identifiers must be distinct.')
        for preset in self.moodPresets:
            if any(k not in moods or not 0 <= v <= 100 for k, v in preset.mix.items()):
                raise ValueError('Invalid saved mood blend.')
        for scene in self.scenes:
            if scene.actId not in acts or any(c.characterId not in characters for c in scene.cast):
                raise ValueError('A scene references a missing act or character.')
            if len({c.characterId for c in scene.cast}) != len(scene.cast):
                raise ValueError('A character can appear only once in a scene.')
            for anchor in scene.anchors:
                if anchor.paragraphId not in paragraphs:
                    raise ValueError('A source paragraph is missing.')
                if anchor.quote not in paragraphs[anchor.paragraphId] and not scene.needsReview:
                    raise ValueError('Source quotations must match the manuscript or be flagged for review.')
            if any(k not in moods or not 0 <= v <= 100 for k, v in scene.mood.items()):
                raise ValueError('Invalid mood weight.')
        for link in self.links:
            if link.source not in scenes or link.target not in scenes or link.source == link.target:
                raise ValueError('A dependency references a missing scene or itself.')
        return self


class Branch(Model):
    id: str
    name: str
    createdAt: str
    forkLabel: str
    story: Story


class Workspace(Model):
    schemaVersion: Literal[1]
    id: str
    activeBranchId: str
    branches: list[Branch] = Field(min_length=1)

    @model_validator(mode='after')
    def validate_branch(self):
        ids = [b.id for b in self.branches]
        if len(set(ids)) != len(ids) or self.activeBranchId not in ids:
            raise ValueError('Invalid active branch or duplicate branch IDs.')
        return self


class GenerateRequest(Model):
    text: str = Field(min_length=40, max_length=40000)
    acts: int = Field(ge=1, le=8)
    scenes: int = Field(ge=1, le=40)

    @model_validator(mode='after')
    def validate_counts(self):
        if self.scenes < self.acts:
            raise ValueError('Each act must contain at least one scene.')
        return self


class ChangeRequest(Model):
    story: Story
    sceneId: str
    change: str = Field(min_length=1, max_length=10000)

    @model_validator(mode='after')
    def validate_scene(self):
        if not any(s.id == self.sceneId for s in self.story.scenes):
            raise ValueError('The selected scene does not exist.')
        return self


class AffectedScene(Model):
    sceneId: str
    reason: str
    suggestion: str


class Impact(Model):
    summary: str
    affected: list[AffectedScene]
    uncertainties: list[str]


class Rewrite(Model):
    text: str = Field(min_length=1)
    explanation: str


# Fixed properties make this schema compatible with strict JSON-schema providers.
class AIMood(Model):
    hope: float = Field(ge=0, le=100)
    joy: float = Field(ge=0, le=100)
    tension: float = Field(ge=0, le=100)
    mystery: float = Field(ge=0, le=100)
    sadness: float = Field(ge=0, le=100)
    calm: float = Field(ge=0, le=100)


class AIScene(Model):
    id: str
    actId: str
    title: str
    mainAction: str
    cast: list[CastMember]
    anchors: list[Anchor]
    events: list[str]
    mood: AIMood
    art: Literal['house', 'garden', 'attic', 'letter', 'photo', 'desk', 'cafe', 'confession', 'farewell', 'train']


class GeneratedStory(Model):
    title: str
    characters: list[Character]
    acts: list[Act]
    scenes: list[AIScene]
    links: list[Link]
