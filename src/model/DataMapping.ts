const scoreMapping: { [key: number]: string } = {
    "-2": "Very distracting",
    "-1": "Distracting",
    "0": "Neutral",
    "1": "Productive",
    "2": "Very productive"
};

const colorMapping: Record<string, string> = {
    "-2": "#d61800",
    "-1": "#dc685a",
    "0": "#cedcdf",
    "1": "#3d80e0",
    "2": "#0055c4"
};