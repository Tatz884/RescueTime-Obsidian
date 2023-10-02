import { getFetchedDataByPeriodAndResolution, setFetchedData } from "../store/DataStore";
import { ResolutionTime, RestrictKind, FetchedDataAndHeaders, Period } from "../model/DataStore";
import { isFetchedDataAndHeaders, isApiStatus } from "../util/TypeGuards";
import RescueTimePlugin from "../../main";

export class DataService {
    private plugin: RescueTimePlugin;
    
    constructor(plugin: RescueTimePlugin) {
        this.plugin = plugin;
    }

    public async fetchAndSetData(period: Period, resolution: ResolutionTime, restrict_kind: RestrictKind): Promise<FetchedDataAndHeaders | void> {
        const response = await this.plugin.api.fetchData({
            apiToken: this.plugin.settings.apiToken,
            period: period,
            resolutionTime: resolution,
            restrict_kind: restrict_kind,
        });

        if (!response) throw new Error("Failed to fetch data.");
        
        await setFetchedData(response);
        return response;
    }
    
    public async fetchAndProcessData(period: Period, resolution: ResolutionTime, restrict_kind: RestrictKind, attempt = 1): Promise<FetchedDataAndHeaders | void> {
        let dataAndHeaders = await getFetchedDataByPeriodAndResolution(period, resolution, restrict_kind);
        
        if (!dataAndHeaders || isApiStatus(dataAndHeaders)) {
            if (attempt <= 1) {
                await this.fetchAndSetData(period, resolution, restrict_kind);
                return await this.fetchAndProcessData(period, resolution, restrict_kind, attempt + 1);
            }
            console.error(isApiStatus(dataAndHeaders) ? dataAndHeaders : "error: data could not be obtained");
        } else if (isFetchedDataAndHeaders(dataAndHeaders) && dataAndHeaders.data && dataAndHeaders.data.convertedRows) {
            return dataAndHeaders;
        } else {
            console.error("Uncaught error: check the logic in DataService");
        }
    }
}