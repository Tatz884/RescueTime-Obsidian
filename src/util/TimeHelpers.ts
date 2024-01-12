export function getToday(): string {

    const time = new Date();
    const today = `${time.getFullYear()}-${time.getMonth() + 1}-${time.getDate()}`;
    return today
}


export function secondsToMinutes(seconds: number): number {
    return seconds / 60;
}

export function secondsToHours(seconds: number): number {
    return seconds / 3600;
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

export function formatDateToCustomString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDateLabel(input: string): string {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const date = new Date(input);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dayName = days[date.getDay()];
    return `${month}/${day} ${dayName}`;
}