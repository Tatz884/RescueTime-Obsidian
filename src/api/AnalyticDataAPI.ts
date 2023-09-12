import { fetchDataFromRT, validateHeaders, convertToRows } from "./FetchHelpers"
import { PluginSettings } from "../config/PluginSettings"
import { QueryError, InternetError, OtherError} from "../model/ApiErrors"
import { Row, DataReturnType } from '../model/FetchedData';
import { Period, ResolutionTime, ApiStatus, FetchedDataAndHeaders } from '../model/DataStore';
import { today } from "../util/TimeHelpers";

interface FetchDataParam {
    apiToken: string
    period?: Period
    resolutionTime?: ResolutionTime
}

export class AnalyticDataAPI {
    private _settings: PluginSettings;
    private data: Row[];
    private time: Date;

    constructor() {
        this.time = new Date();
    }

    private setURL(apiToken: string, period: Period = {start: today, end: today}, resolutionTime: ResolutionTime = ResolutionTime.HOUR): string {

        const url = `https://www.rescuetime.com/anapi/data?key=${apiToken}&perspective=interval&interval=${resolutionTime}&restrict_begin=${period.start}&restrict_end=${period.end}&format=json`;
        return url;
    }

    // Overloaded function signatures
    public async fetchData(apiToken: string): Promise<FetchedDataAndHeaders | void>;
    public async fetchData(params: FetchDataParam): Promise<FetchedDataAndHeaders | void>;

    public async fetchData(apiTokenOrParams: string | FetchDataParam): Promise<FetchedDataAndHeaders | void> {
        let apiToken: string;
        let period: Period = { start: today, end: today }; // Default values
        let resolutionTime: ResolutionTime = ResolutionTime.HOUR; // Default value
    
        if (typeof apiTokenOrParams === 'string') {
            apiToken = apiTokenOrParams;
        } else {
            apiToken = apiTokenOrParams.apiToken;
            period = apiTokenOrParams.period || period; // Use provided period or default
            resolutionTime = apiTokenOrParams.resolutionTime || resolutionTime; // Use provided resolutionTime or default
        }
    
        const url: string = this.setURL(apiToken, period, resolutionTime);
        const result = await fetchDataFromRT(url);
        
        let apiStatus: ApiStatus;
    
        if (this.isDataReturnType(result)) {
            if (!validateHeaders(result.row_headers)) {
                apiStatus = ApiStatus.UNEXPECTED_DATATYPE;
                return {
                    headers: {
                        period: period,
                        resolutionTime: resolutionTime,
                        apiStatus: apiStatus
                    },
                    data: result
                };
            } else if (result.rows.length === 0) {
                apiStatus = ApiStatus.EMPTY_DATA;
                return {
                    headers: {
                        period: period,
                        resolutionTime: resolutionTime,
                        apiStatus: apiStatus
                    },
                    data: result
                };
            } else {
                // Convert raw rows to Row[]
                result.convertedRows = convertToRows(result.rows);
                apiStatus = ApiStatus.AVAILABLE;
                return {
                    headers: {
                        period: period,
                        resolutionTime: resolutionTime,
                        apiStatus: apiStatus
                    },
                    data: result
                };
            }
        }
    
        // Handle error cases 
        if (this.isQueryError(result)) {
            apiStatus = ApiStatus.INVALID_PARAM;
        } else if (this.isInternetError(result)) {
            apiStatus = ApiStatus.UNREACHABLE;
        } else if (this.isOtherError(result)) {
            console.log("isotherresult")
            apiStatus = ApiStatus.UNKNOWN;
        } else {
            apiStatus = ApiStatus.UNKNOWN;
        }
    
        // Return error information with headers only
        return {
            headers: {
                period: period,
                resolutionTime: resolutionTime,
                apiStatus: apiStatus
            },
            data: null // Or a default DataReturnType value if it exists
        };
    }


    // test connection + error handling
    isQueryError(object: any): object is QueryError {
        return 'type' in object && object.type === 'QueryError';
    }

    isDataReturnType(object: any): object is DataReturnType {
        return 'notes' in object && 'row_headers' in object && 'rows' in object;
    }

    isInternetError(object: any): object is InternetError {
        return 'type' in object && object.type === 'InternetError';
    }
    
    isOtherError(object: any): object is OtherError {
        return 'type' in object && object.type === 'OtherError';
    }

    private handleQueryError(result: QueryError): never {
        throw new Error("API request failed. Check your API key." + result.message);
    }
    
    private handleInternetError(result: InternetError): never {
        throw new Error('Internet connection error.');
    }
    
    private handleOtherError(result: OtherError): never {
        throw new Error("Unknown error type. Kindly notify the developer if you see this. Message from RescueTime API: " + result.message);
    }

    
    public async testConnection(apiToken: string, period: Period = {start: "2023-08-23", end: "2023-08-23"}, resolutionTime: ResolutionTime = ResolutionTime.HOUR): Promise<void|Error> {
        try {
            const url: string = this.setURL(apiToken, period, resolutionTime);
            const result = await fetchDataFromRT(url);
    
            if (this.isDataReturnType(result)) {
            } else if (this.isQueryError(result)) {
                this.handleQueryError(result) 
            } else if (this.isInternetError(result)) {
                this.handleInternetError(result);
            } else if (this.isOtherError(result)) {
                this.handleOtherError(result);
            } else {
                throw new Error("Unknown error. Kindly notify the developer if you see this. Returned data: " + JSON.stringify(result));
            }
        } catch (error) {
            console.error(error.message);
            return error.message;
        }
    }
}