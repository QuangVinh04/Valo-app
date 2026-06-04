export const AiModel = {
  GROQ_FAST: 'groq-fast',
  FLOWISE_AGENT: 'flowise-agent',
} as const;

export type AiModelKey = typeof AiModel[keyof typeof AiModel]; // Dinh dang type 

export const AI_MODELS_VALUES = Object.values(AiModel); // validate cho modelName trong message.type.ts

export const AI_MODEL_CONFIG = {
  [AiModel.GROQ_FAST]: {
    provider: 'groq',
    modelName: 'llama-3.1-8b-instant',
  },
  [AiModel.FLOWISE_AGENT]: {
    provider: 'flowise',
    modelName: 'your-flowise-chatflow-id-or-name',
  },
} as const;