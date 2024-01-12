import { fetchDataFromRT, validateHeaders, convertToRows } from "./FetchHelpers"
import { PluginSettings } from "../config/PluginSettings"
import { QueryError, InternetError, OtherError} from "../model/ApiErrors"
import { Row, DataReturnType } from '../model/FetchedData';
import { getToday } from "../util/TimeHelpers";
import { Period, ResolutionTime, ApiStatus, FetchedDataAndHeaders } from '../model/DataStore';
import { isDataReturnType, isQueryError, isInternetError, isOtherError } from "../util/TypeGuards";
import { RestrictKind } from "../model/DataStore";

interface FetchDataParam {
    apiToken: string
    period: Period
    resolutionTime: ResolutionTime
    restrict_kind: RestrictKind
}

export class AnalyticDataAPI {
    private _settings: PluginSettings;
    private data: Row[];
    private time: Date;


    constructor() {
        this.time = new Date();
    }

    private setURL({
        apiToken,
        period,
        resolutionTime = ResolutionTime.HOUR,
        restrict_kind = RestrictKind.ACTIVITY,
      }: FetchDataParam): string {
        const url = `https://www.rescuetime.com/anapi/data?key=${apiToken}&perspective=interval&interval=${resolutionTime}&restrict_begin=${period.start}&restrict_end=${period.end}&restrict_kind=${restrict_kind}&format=json`;
        return url;
      }

      private async fetchDataInternal(params: FetchDataParam): Promise<FetchedDataAndHeaders | void> {
        const url: string = this.setURL(params);
        const result = await fetchDataFromRT(url);
        let today = getToday();
    

        let period: Period = { start: today, end: today }; // Default values
        let resolutionTime: ResolutionTime = ResolutionTime.HOUR; // Default value
        let restrict_kind: RestrictKind = RestrictKind.ACTIVITY
      
        let apiStatus: ApiStatus;
        const commonHeaders = {
          period: params.period,
          resolutionTime: params.resolutionTime,
          restrict_kind: params.restrict_kind,
        };
      
        if (isDataReturnType(result)) {
          if (!validateHeaders(result.row_headers, params.restrict_kind)) {
            apiStatus = ApiStatus.UNEXPECTED_DATATYPE;
          } else if (result.rows.length === 0) {
            apiStatus = ApiStatus.EMPTY_DATA;
          } else {
            result.convertedRows = convertToRows(result.rows, params.restrict_kind);
            apiStatus = ApiStatus.AVAILABLE;
          }
      
          return {
            headers: { ...commonHeaders, apiStatus },
            data: result,
          };
        }
      
        // Setting appropriate error status
        if (isQueryError(result)) apiStatus = ApiStatus.INVALID_PARAM;
        else if (isInternetError(result)) apiStatus = ApiStatus.UNREACHABLE;
        else apiStatus = ApiStatus.UNKNOWN;
      
        // Returning error information with headers only
        return {
          headers: { ...commonHeaders, apiStatus },
          data: null, // Or a default DataReturnType value if it exists
        };
      }

    // Overloaded function signatures
    public async fetchData(apiToken: string): Promise<FetchedDataAndHeaders | void>;
    public async fetchData(params: FetchDataParam): Promise<FetchedDataAndHeaders | void>;

    public async fetchData(apiTokenOrParams: string | FetchDataParam): Promise<FetchedDataAndHeaders | void> {

        let params: FetchDataParam;
        let today = getToday();

        if (typeof apiTokenOrParams === "string") {
            params = {
              apiToken: apiTokenOrParams,
              period: { start: today, end: today }, // Default values
              resolutionTime: ResolutionTime.HOUR, // Default value
              restrict_kind: RestrictKind.ACTIVITY,
            };
          } else {
            params = {
              apiToken: apiTokenOrParams.apiToken,
              period: apiTokenOrParams.period || { start: today, end: today },
              resolutionTime: apiTokenOrParams.resolutionTime || ResolutionTime.HOUR,
              restrict_kind: apiTokenOrParams.restrict_kind || RestrictKind.ACTIVITY,
            };
          }
    


        return this.fetchDataInternal(params);

        
    

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

    
    public async testConnection(apiToken: string, period: Period,
        resolutionTime: ResolutionTime = ResolutionTime.HOUR,
        restrict_kind: RestrictKind = RestrictKind.ACTIVITY): Promise<void|Error> {
        try {
            const url: string = this.setURL({apiToken, period, resolutionTime, restrict_kind});
            const result = await fetchDataFromRT(url);
    
            if (isDataReturnType(result)) {
            } else if (isQueryError(result)) {
                this.handleQueryError(result) 
            } else if (isInternetError(result)) {
                this.handleInternetError(result);
            } else if (isOtherError(result)) {
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