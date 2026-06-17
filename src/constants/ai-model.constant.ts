export const AiModel = {
  FLOWISE_AGENT: 'flowise-agent',
} as const;

export type AiModelKey = typeof AiModel[keyof typeof AiModel]; // Dinh dang type 

export const AI_MODELS_VALUES = Object.values(AiModel) as [AiModelKey, ...AiModelKey[]]; // validate cho modelName trong message.type.ts

export const AI_MODEL_CONFIG = {
  [AiModel.FLOWISE_AGENT]: {
    provider: 'flowise',
    modelName: 'flowise-agent',
  },
} as const;
