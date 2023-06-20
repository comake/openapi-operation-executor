export interface OpenApiClientConfiguration {
  /**
  * Parameter for HTTP authentication with the Bearer security scheme
  */
  bearerToken?: string
  | Promise<string>
  | (() => string) | (() => Promise<string>);
  /**
  * Parameter for apiKey security where the key is the name
  * of the api key to be added to the header or query. Multiple api keys
  * may be provided by name.
  * @param name - security name
  */
  [key: string]: undefined
  | string
  | Promise<string>
  | ((name: string) => string) | ((name: string) => Promise<string>);
  /**
  * Parameter for apiKey security which will be used if no named api key
  * matching the required security scheme is supplied.
  * @param name - security name
  */
  apiKey?: string
  | Promise<string>
  | ((name: string) => string) | ((name: string) => Promise<string>);
  /**
  * Parameter for HTTP authentication with the Basic security scheme
  */
  username?: string;
  /**
  * Parameter for HTTP authentication with the Basic security scheme
  */
  password?: string;
  /**
  * Parameter for oauth2 security
  * @param name - security name
  * @param scopes - oauth2 scope
  */
  accessToken?: string | Promise<string>
  | ((name?: string, scopes?: readonly string[]) => string)
  | ((name?: string, scopes?: readonly string[]) => Promise<string>);
  /**
  * Override base path
  */
  basePath?: string;
  /**
  * Base options for axios calls
  */
  baseOptions?: any;
  /**
  * TODO: Add support for formDataCtor.
  * The FormData constructor that will be used to create multipart form data
  * requests. You can inject this here so that execution environments that
  * do not support the FormData class can still run the generated client.
  */
  // formDataCtor?: new () => any;
}
