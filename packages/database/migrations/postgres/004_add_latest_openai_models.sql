-- Add latest OpenAI models (GPT-5.2, GPT-5.1, Codex variants) to agents.model enum
-- See https://developers.openai.com/api/docs/changelog/

ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_model_check;

ALTER TABLE agents ADD CONSTRAINT agents_model_check CHECK (model IN (
    'gpt-5.2', 'gpt-5.2-chat-latest', 'gpt-5.2-codex', 'gpt-5.3-codex',
    'gpt-5.1', 'gpt-5.1-chat-latest', 'gpt-5.1-codex', 'gpt-5.1-codex-mini', 'gpt-5.1-codex-max',
    'gpt-5', 'gpt-5-mini', 'gpt-5-nano',
    'gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07',
    'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini',
    'o3-deep-research', 'o4-mini-deep-research'
));

ALTER TABLE agents ALTER COLUMN model SET DEFAULT 'gpt-5.2';
