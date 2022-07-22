import type { AxiosRequestConfig } from 'axios';
import { DUMMY_BASE_URL, toPathString, serializeDataIfNeeded } from './OpenApiClientUtils';
import type { OperationWithPathInfo, OpenApiClientConfiguration } from './OpenApiOperationExecutor';
import type { SecurityRequirement, APIKeySecurityScheme, DereferencedComponents } from './OpenApiSchemaConfiguration';

export interface AxiosRequestParams {
  url: string;
  options: AxiosRequestConfig;
}

/**
 * Factory that generates a RequestParams object for an {@link OpenApiAxiosRequestFactory}
 */
export class OpenApiAxiosParamFactory {
  private readonly pathName: string;
  private readonly pathReqMethod: string;
  private readonly security?: SecurityRequirement[];
  private readonly securitySchemes?: DereferencedComponents['securitySchemes'];
  private readonly configuration: OpenApiClientConfiguration;

  public constructor(
    operationWithPathInfo: OperationWithPathInfo,
    configuration: OpenApiClientConfiguration,
    securitySchemes?: DereferencedComponents['securitySchemes'],
  ) {
    this.pathName = operationWithPathInfo.pathName;
    this.pathReqMethod = operationWithPathInfo.pathReqMethod;
    this.security = operationWithPathInfo.security;
    this.configuration = configuration;
    this.securitySchemes = securitySchemes;
  }

  public async createParams(args: any = {}, options: AxiosRequestConfig = {}): Promise<AxiosRequestParams> {
    // Use dummy base URL string because the URL constructor only accepts absolute URLs.
    const urlObj = new URL(this.pathName, DUMMY_BASE_URL);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headerParameter = { 'Content-Type': 'application/json' };
    await this.setSecurityIfNeeded(headerParameter, args);

    return {
      url: toPathString(urlObj),
      options: this.constructRequestOptions(options, headerParameter, args),
    };
  }

  /**
   * Sets the security settings on the headerParameters object or args object if oAuth or apikey security is set.
   */
  private async setSecurityIfNeeded(headerParameter: Record<string, string>, args: any): Promise<void> {
    if (this.security && this.security.length > 0) {
      const oAuthSecurity = this.security.find((securityReq: SecurityRequirement): boolean => 'oAuth' in securityReq);
      if (oAuthSecurity && this.configuration.accessToken) {
        await this.setOAuthToHeaderObject(headerParameter, 'oAuth', oAuthSecurity.oAuth);
        return;
      }

      const apiKeySecurity = this.security.find((securityReq: SecurityRequirement): boolean => 'apiKey' in securityReq);
      if (apiKeySecurity && this.configuration.apiKey) {
        await this.setApiKeyToHeaderOrArgsObject(headerParameter, args);
      }
    }
  }

  /**
   * Sets an api key field of an object to the apiKey value in the {@link OpenApiClientConfiguration}.
   *
   * @param headerObject - The header object
   * @param args - The query parameters object
   */
  private async setApiKeyToHeaderOrArgsObject(
    headerObject: any,
    args: any,
  ): Promise<void> {
    const securityScheme = this.securitySchemes?.apiKey as APIKeySecurityScheme | undefined;
    if (securityScheme) {
      const apiKey = await this.getApiKey(securityScheme.name);
      if (securityScheme.in === 'header') {
        headerObject[securityScheme.name] = apiKey;
      } else if (securityScheme.in === 'query') {
        args[securityScheme.name] = apiKey;
      } else {
        throw new Error(`apiKey security scheme in ${securityScheme.in} is not supported.`);
      }
    }
  }

  private async getApiKey(apiKeyName: string): Promise<string | undefined> {
    return typeof this.configuration.apiKey === 'function'
      ? await this.configuration.apiKey(apiKeyName)
      : await this.configuration.apiKey;
  }

  /**
   * Helper that sets the Authorization field of an object. Generates an access token
   * if the configuration specifies an access token generation function, just uses the value if not.
   *
   * @param headerObject - The header object
   * @param name - The security name used to generate an access token
   * @param scopes - oauth2 scopes used to generate an access token
   */
  private async setOAuthToHeaderObject(
    headerObject: any,
    name: string,
    scopes: string[],
  ): Promise<void> {
    const localVarAccessTokenValue = typeof this.configuration.accessToken === 'function'
      ? await this.configuration.accessToken(name, scopes)
      : await this.configuration.accessToken;
    headerObject.Authorization = `Bearer ${localVarAccessTokenValue}`;
  }

  /**
   * Helper that constructs the request options.
   *
   * @param options - The AxiosRequestConfig options object
   * @param headerParameter - The header parameter object
   * @param args - The operation arguments
   * @returns The request options object
   */
  private constructRequestOptions(
    options: AxiosRequestConfig,
    headerParameter: any,
    args: any,
  ): AxiosRequestConfig {
    const { baseOptions } = this.configuration;
    const requestOptions = {
      method: this.pathReqMethod,
      ...baseOptions,
      ...options,
      headers: {
        ...headerParameter,
        ...baseOptions?.headers,
        ...options.headers,
      },
    };
    requestOptions.data = serializeDataIfNeeded(args, requestOptions.headers['Content-Type']);
    return requestOptions;
  }
}
