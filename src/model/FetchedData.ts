const expectedHeaders = [
    "Date",
    "Time Spent (seconds)",
    "Number of People",
    "Activity",
    "Category",
    "Productivity"
];

export interface Row {
    date: Date;
    timeSpentSeconds: number;
    numberOfPeople: number;
    activity: string;
    category: string;
    productivity: number;
}

export interface DataReturnType {
    notes: string;
    row_headers: string[];
    rows: any[][];
    convertedRows?: Row[];
}