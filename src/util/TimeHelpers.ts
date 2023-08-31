const time = new Date();
export const today = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`;

export function secondsToMinutes(seconds: number): number {
    return seconds / 60;
}
  
export function formatTime(timeInSec: number): string {
    const hours = Math.floor(timeInSec / 3600);
    const minutes = Math.floor((timeInSec % 3600) / 60);
    const seconds = timeInSec % 60;

    let timeString = "";
    if (hours > 0) timeString += hours + ":";
    if (minutes > 0 || hours > 0) timeString += minutes.toString().padStart(2, '0') + ":";
    timeString += seconds.toString().padStart(2, '0');

    return timeString;
}
