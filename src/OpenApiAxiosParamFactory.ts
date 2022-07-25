import type { AxiosRequestConfig } from 'axios';
import {
  serializeDataIfNeeded,
  jsonParamsToUrlString,
  escapeRegExp,
} from './OpenApiClientUtils';
import type { JSONValue } from './OpenApiClientUtils';
import type { OperationWithPathInfo, OpenApiClientConfiguration } from './OpenApiOperationExecutor';
import type {
  SecurityRequirement,
  APIKeySecurityScheme,
  DereferencedComponents,
  Parameter,
} from './OpenApiSchemaConfiguration';

export interface AxiosRequestParams {
  url: string;
  options: AxiosRequestConfig;
}

export type HeaderObject = Record<string, string>;

const IGNORED_HEADER_PARAMETERS = new Set([ 'accept', 'content-type', 'authorization' ]);
const PARAMETER_AND_SCHEME_LOCATIONS = {
  path: 'path',
  query: 'query',
  header: 'header',
};

/**
 * Factory that generates an AxiosRequestParams object for an {@link OpenApiClientAxiosApi}
 * based on the configuration of an OpenApi Operation.
 *
 * Note: OAuth security schemes must be titled `oauth` and apiKey security schemes must be titled `apiKey`.
 *
 * Not yet supported:
  * - Operation parameters set through cookies using the `in` field set to `cookies`
  * - Implementation of the `style` and `explode` parameter fields to change the way parameter values are serialized
  * - Security schemes other those with `type` set to `oAuth` or `apiKey`
  * - Validation of the supplied args used in a `requestBody`
  * - The `callbacks` field on an operation
  * - Supplying an alternate server through the `servers` field
  *
 */
export class OpenApiAxiosParamFactory {
  private pathName: string;
  private urlQuery?: string;
  private readonly pathReqMethod: string;
  private readonly security?: SecurityRequirement[];
  private readonly securitySchemes?: DereferencedComponents['securitySchemes'];
  private readonly configuration: OpenApiClientConfiguration;
  private readonly parameters?: Parameter[];

  public constructor(
    operationWithPathInfo: OperationWithPathInfo,
    configuration: OpenApiClientConfiguration,
    securitySchemes?: DereferencedComponents['securitySchemes'],
  ) {
    this.pathName = operationWithPathInfo.pathName;
    this.pathReqMethod = operationWithPathInfo.pathReqMethod;
    this.security = operationWithPathInfo.security;
    this.parameters = operationWithPathInfo.parameters;
    this.configuration = configuration;
    this.securitySchemes = securitySchemes;
  }

  /**
   * Generates an AxiosRequestParams object.
   *
   * @param args - The operation arguments
   * @param options - The request configuration
   * @returns A promise that resolves to request parameters object
   */
  public async createParams(
    args: Record<string, any> = {},
    options: AxiosRequestConfig = {},
  ): Promise<AxiosRequestParams> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headerParameter = { 'Content-Type': 'application/json' };
    await this.setSecurityIfNeeded(headerParameter, args);
    const requestBodyArgs: Record<string, any> = {};
    await this.addParametersToUrlAndHeader(headerParameter, args, requestBodyArgs);

    return {
      url: `${this.pathName}${this.urlQuery ? `?${this.urlQuery}` : ''}`,
      options: this.constructRequestOptions(options, headerParameter, requestBodyArgs),
    };
  }

  /**
   * Sets the security settings on the headerParameters object or args object if oAuth or apikey security is set.
   *
   * @param headerParameter - The header parameter object
   * @param args - The operation arguments
   */
  private async setSecurityIfNeeded(headerParameter: HeaderObject, args: Record<string, any>): Promise<void> {
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
   * @param headerParameter - The header parameter object
   * @param args - The operation arguments
   */
  private async setApiKeyToHeaderOrArgsObject(
    headerParameter: HeaderObject,
    args: Record<string, any>,
  ): Promise<void> {
    const securityScheme = this.securitySchemes?.apiKey as APIKeySecurityScheme | undefined;
    if (securityScheme) {
      const apiKey = await this.getApiKey(securityScheme.name);
      if (securityScheme.in === PARAMETER_AND_SCHEME_LOCATIONS.header) {
        headerParameter[securityScheme.name] = apiKey!;
      } else if (securityScheme.in === PARAMETER_AND_SCHEME_LOCATIONS.query) {
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
   * @param headerParameter - The header parameter object
   * @param name - The security name used to generate an access token
   * @param scopes - oauth2 scopes used to generate an access token
   */
  private async setOAuthToHeaderObject(
    headerParameter: any,
    name: string,
    scopes: string[],
  ): Promise<void> {
    const localVarAccessTokenValue = typeof this.configuration.accessToken === 'function'
      ? await this.configuration.accessToken(name, scopes)
      : await this.configuration.accessToken;
    headerParameter.Authorization = `Bearer ${localVarAccessTokenValue}`;
  }

  /**
   * Helper adds the supplied args to the header parameter object or to the pathName depending
   * on the operation's "parameters" configuration. See [the spec](https://spec.openapis.org/oas/v3.1.0#parameter-object)
   * for more info.
   *
   * @param headerParameter - The header parameter object
   * @param args - The operation arguments
   */
  private async addParametersToUrlAndHeader(
    headerParameter: HeaderObject,
    args: Record<string, any>,
    requestBodyArgs: Record<string, any>,
  ): Promise<void> {
    if (this.parameters) {
      this.assertAllRequiredParametersArePresent(args);

      const queryParameters: Record<string, JSONValue> = {};
      for (const [ key, value ] of Object.entries(args)) {
        const parameter = this.parameters.find((param): boolean => param.name === key);
        if (parameter) {
          const parameterName = parameter.name as string;
          if (parameter.in === PARAMETER_AND_SCHEME_LOCATIONS.query) {
            queryParameters[key] = value;
          } else if (parameter.in === PARAMETER_AND_SCHEME_LOCATIONS.path) {
            this.replacePathTemplateInUrlPath(parameterName, value);
          } else if (parameter.in === PARAMETER_AND_SCHEME_LOCATIONS.header) {
            this.addParameterToHeaders(headerParameter, parameterName, value);
          } else {
            throw new Error(`Parameters with "in" set to ${parameter.in} are not supported.`);
          }
          break;
        }
        // Argument was not used for query, header, or path, likely used in request body.
        requestBodyArgs[key] = value;
      }

      this.urlQuery = jsonParamsToUrlString(queryParameters);
    }
  }

  /**
   * Helper that validates that all required parameters have been supplied.
   *
   * @param args - The operation arguments
   */
  private assertAllRequiredParametersArePresent(args: Record<string, any>): void {
    const unsetRequiredParameter = this.parameters!.find((parameter): boolean =>
      // eslint-disable-next-line unicorn/prefer-object-has-own
      parameter.required === true && !Object.prototype.hasOwnProperty.call(args, parameter.name as string));

    if (unsetRequiredParameter) {
      throw new Error(`Parameter ${unsetRequiredParameter.name} is required for this operation.`);
    }
  }

  private addParameterToHeaders(headerParameter: HeaderObject, parameterName: string, value: string): void {
    if (!IGNORED_HEADER_PARAMETERS.has(parameterName.toLowerCase())) {
      headerParameter[parameterName] = value;
    }
  }

  private replacePathTemplateInUrlPath(parameterName: string, value: string): void {
    const pathVariableRegex = new RegExp(escapeRegExp(`{${parameterName}}`), 'gu');
    this.pathName = this.pathName.replace(pathVariableRegex, value);
  }

  /**
   * Helper that constructs the request options.
   *
   * @param options - The AxiosRequestConfig options object
   * @param headerParameter - The header parameter object
   * @param requestBodyArgs - The request body arguments
   * @returns The request options object
   */
  private constructRequestOptions(
    options: AxiosRequestConfig,
    headerParameter: HeaderObject,
    requestBodyArgs?: Record<string, any>,
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
    requestOptions.data = serializeDataIfNeeded(requestBodyArgs, requestOptions.headers['Content-Type']);
    return requestOptions;
  }
}
