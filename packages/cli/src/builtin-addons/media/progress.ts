export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const computeProgress = (
  currentTime: number,
  totalTime: number,
): number => {
  if (!Number.isFinite(totalTime) || totalTime <= 0) return 0;
  if (!Number.isFinite(currentTime) || currentTime < 0) return 0;
  return Math.min(100, Math.max(0, (currentTime / totalTime) * 100));
};