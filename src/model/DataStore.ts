import { DataReturnType } from "./FetchedData";


export interface Period {
    start: string;
    end: string;
}

export enum ResolutionTime {
    MONTH = "month",
    WEEK = "week",
    DAY = "day",
    HOUR = "hour",
    MINUTE = "minute" // means 5-minute interval, based on RT API specification
}

export enum ApiStatus {
    AVAILABLE = "Data is successfully retrieved from API.",
    EMPTY_DATA = "Data is retrieved but empty. Wait until data is logged and sent from your RescueTime client.",
    UNEXPECTED_DATATYPE = "Unexpected type of data is returned. Kindly notify the developer if you see this.",
    INVALID_PARAM = "API request failed. Check your API key in the plugin setting.",
    UNREACHABLE = "Internet connection error.",
    UNTESTED = "API is still untested",
    UNKNOWN = "Unknown error. Kindly notify the developer if you see this."
}


export interface DataHeaders {
        period: Period,
        resolutionTime: ResolutionTime,
        apiStatus: ApiStatus
}

export interface FetchedDataAndHeaders {
    headers: DataHeaders,
    data: DataReturnType | null
}