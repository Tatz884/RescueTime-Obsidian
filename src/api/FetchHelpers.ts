import { requestUrl, request} from 'obsidian'
import { QueryError, InternetError, OtherError, Errors} from "../model/ApiErrors"
import { Row, DataReturnType } from '../model/FetchedData';
import { RestrictKind } from '../model/DataStore';

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



function arrayToRow(data: any[], restrict_kind: RestrictKind): Row {
    if (restrict_kind === RestrictKind.ACTIVITY) {
        return {
            date: new Date(data[0]),
            timeSpentSeconds: data[1],
            numberOfPeople: data[2],
            activity: data[3],
            category: data[4],
            productivity: data[5]
        };
    } if (restrict_kind === RestrictKind.OVERVIEW) {
        return {
            date: new Date(data[0]),
            timeSpentSeconds: data[1],
            numberOfPeople: data[2],
            category: data[3],
        };
    } if (restrict_kind === RestrictKind.PRODUCTIVITY) {
        return {
            date: new Date(data[0]),
            timeSpentSeconds: data[1],
            numberOfPeople: data[2],
            productivity: data[3],
        };
    } else {
        throw new Error("restrict kind is unexpected")
    }
}





// Converts received data arrays into Row objects,
// to allow the developers to write a more readable code 
// (e.g. you can now write like convertedRow.date)
export function convertToRows(dataArrays: any[][], restrict_kind: RestrictKind): Row[] {
    return dataArrays.map(data => arrayToRow(data, restrict_kind));
}

const expectedHeadersMap = {
    [RestrictKind.ACTIVITY]: [
        "Date",
        "Time Spent (seconds)",
        "Number of People",
        "Activity",
        "Category",
        "Productivity"
    ],
    [RestrictKind.OVERVIEW]: [
        "Date",
        "Time Spent (seconds)",
        "Number of People",
        "Category"
    ],
    [RestrictKind.PRODUCTIVITY]: [
        "Date",
        "Time Spent (seconds)",
        "Number of People",
        "Productivity"
    ]
};

export function validateHeaders(actualHeaders: string[], restrict_kind: RestrictKind): boolean {
    const expectedHeaders = expectedHeadersMap[restrict_kind];

    if (!expectedHeaders) {
        throw new Error(`Unknown restrict_kind: ${restrict_kind}`);
    }

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

