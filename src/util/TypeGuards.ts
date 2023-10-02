import { FetchedDataAndHeaders } from "../model/DataStore";
import { ApiStatus } from "../model/DataStore";
import { QueryError, InternetError, OtherError } from "../model/ApiErrors";
import { DataReturnType } from "../model/FetchedData";


    // test connection + error handling
    export function isQueryError(object: any): object is QueryError {
        return 'type' in object && object.type === 'QueryError';
    }

    export function isDataReturnType(object: any): object is DataReturnType {
        return 'notes' in object && 'row_headers' in object && 'rows' in object;
    }

    export function isInternetError(object: any): object is InternetError {
        return 'type' in object && object.type === 'InternetError';
    }
    
    export function isOtherError(object: any): object is OtherError {
        return 'type' in object && object.type === 'OtherError';
    }



export function isFetchedDataAndHeaders(variable: any): variable is FetchedDataAndHeaders {
    return variable && 
          typeof variable === 'object' && 
          'headers' in variable && 
          'data' in variable;
  }

export function isApiStatus(value: any): value is ApiStatus {
    return Object.values(ApiStatus).includes(value);
}