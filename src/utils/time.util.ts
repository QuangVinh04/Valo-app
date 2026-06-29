import ms, { type StringValue } from 'ms';

export const durationToSeconds = (duration: string): number => {
  const milliseconds = ms(duration as StringValue);

  if (typeof milliseconds !== 'number') {
    throw new Error(`Invalid duration: ${duration}`);
  }

  return Math.floor(milliseconds / 1000);
};
