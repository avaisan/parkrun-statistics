/*
  * Used to format average times in minutes to a string format of "MM:SS" in the main web UI.
  * So instead of 1.5 minutes, it will show 1:30. 
*/
export const formatTime = (minutes: number): string => {
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  