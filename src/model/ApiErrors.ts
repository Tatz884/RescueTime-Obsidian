export type QueryError = { type: 'QueryError', message: string };

export type InternetError = { type: 'InternetError', message: string };
export type OtherError = { type: 'OtherError', message: string };

export type Errors = QueryError | InternetError | OtherError