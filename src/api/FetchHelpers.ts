import { requestUrl, request} from 'obsidian'
import { QueryError, InternetError, OtherError, Errors} from "../model/ApiErrors"
import { Row, DataReturnType } from 'src/model/FetchedData';

// http headers used on every call to the RescueTime API.
const headers = {
    "user-agent":
      "RescueTime Integration for Obsidian (alpha ver.)",
  };

type FetchResult<T> = T | Errors;

export async function fetchDataFromRT<T = DataReturnType>(url: string): Promise<FetchResult<T> | void> {
    try {
        const response = await requestUrl({url: url, method: "get", contentType: "application/json", headers: headers});

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`HTTP error. Status: ${response.status}`);
        }
        return await response.json;
    } catch (error) {

        if (error.message && error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
            return { type: 'InternetError', message: error.message };
        } else if (error.status && error.status === 400) {
            return { type: 'QueryError', message: error}
        }
        return { type: 'OtherError', message: error.message };
    }
}



function arrayToRow(data: any[]): Row {
    return {
        date: new Date(data[0]),
        timeSpentSeconds: data[1],
        numberOfPeople: data[2],
        activity: data[3],
        category: data[4],
        productivity: data[5]
    };
}

const expectedHeaders = [
    "Date",
    "Time Spent (seconds)",
    "Number of People",
    "Activity",
    "Category",
    "Productivity"
];

// Converts received data arrays into Row objects
export function convertToRows(dataArrays: any[][]): Row[] {
    return dataArrays.map(arrayToRow);
}

export function validateHeaders(actualHeaders: string[]): boolean {
    if (actualHeaders.length !== expectedHeaders.length) {
        return false;
    }

    for (let i = 0; i < expectedHeaders.length; i++) {
        if (actualHeaders[i] !== expectedHeaders[i]) {
            return false;
        }
    }
    return true;
}