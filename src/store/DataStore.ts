import { DataHeaders, FetchedDataAndHeaders, Period, ResolutionTime, ApiStatus, RestrictKind } from '../model/DataStore';

type ArrayFetchedDataAndHeaders = FetchedDataAndHeaders[]
let fetchedDataArray: ArrayFetchedDataAndHeaders = [];

// Helper function to find the index of a matching FetchedDataAndHeaders
function findMatchingIndex(period: Period, resolutionTime: ResolutionTime, restrict_kind: RestrictKind): number {
    return fetchedDataArray.findIndex(item => 
        item.headers.period.start === period.start &&
        item.headers.period.end === period.end &&
        item.headers.resolutionTime === resolutionTime
    );
}

export async function setFetchedData(fetchedItem: FetchedDataAndHeaders): Promise<void> {
    const { headers, data } = fetchedItem;
    const matchingIndex = findMatchingIndex({start: headers.period.start, end: headers.period.end},
    headers.resolutionTime, headers.restrict_kind);

    // If headers.period and headers.resolutionTime do not match existing fetchedDataAndHeaders, then just push fetchedDataAndHeaders
    if (matchingIndex === -1) {
        fetchedDataArray.push(fetchedItem);
        return;
    }

    const existingApiStatus = fetchedDataArray[matchingIndex].headers.apiStatus;

    // Firstly, if headers.apiStatus is not AVAILABLE, execute console.error with apiStatus
    if (headers.apiStatus !== ApiStatus.AVAILABLE) {
        console.error(headers.apiStatus);
    }

    // Secondly, check for the position of the ApiStatus in the enum to determine the update logic
    if (Object.values(ApiStatus).indexOf(headers.apiStatus) <= Object.values(ApiStatus).indexOf(existingApiStatus)) {
        fetchedDataArray[matchingIndex] = fetchedItem;
    }
}

export async function getFetchedDataByPeriodAndResolution(
    targetPeriod: Period, 
    targetResolutionTime: ResolutionTime,
    targetRestrictKind: RestrictKind
): Promise<FetchedDataAndHeaders | ApiStatus | null> {
    const matchingIndex = findMatchingIndex(targetPeriod, targetResolutionTime, targetRestrictKind);

    // If no match found
    if (matchingIndex === -1) {
        console.warn("Matching FetchedDataAndHeaders not found.");
        return null;
    }

    const matchedData = fetchedDataArray[matchingIndex];
    if (matchedData.headers.apiStatus === ApiStatus.AVAILABLE) {
        return matchedData;
    } else {
        console.warn(`API status: ${matchedData.headers.apiStatus}`);
        return matchedData.headers.apiStatus;
    }
}