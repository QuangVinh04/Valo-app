export const AiModel = {
  GROQ_FAST: 'groq 3.3',
  GROQ_LLAMA_33: 'groq-llama-3.3',
  FLOWISE_AGENT: 'flowise-agent',
} as const;

export type AiModelKey = typeof AiModel[keyof typeof AiModel]; // Dinh dang type 

export const AI_MODELS_VALUES = Object.values(AiModel) as [AiModelKey, ...AiModelKey[]]; // validate cho modelName trong message.type.ts

export const AI_MODEL_CONFIG = {
  [AiModel.GROQ_FAST]: {
    provider: 'groq',
    modelName: 'llama-3.3-70b-versatile',
  },
  [AiModel.GROQ_LLAMA_33]: {
    provider: 'groq',
    modelName: 'llama-3.3-70b-versatile', 
  },
  [AiModel.FLOWISE_AGENT]: {
    provider: 'flowise',
    modelName: 'your-flowise-chatflow-id-or-name',
  },
} as const;
