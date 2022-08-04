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
  private queryParameters: Record<string, JSONValue> = {};
  private headerParameters: HeaderObject = {};
  private requestBodyArgs: Record<string, any> = {};
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
    await this.setSecurityIfNeeded();
    await this.addParametersToUrlAndHeader(args);
    const urlQuery = jsonParamsToUrlString(this.queryParameters);

    return {
      url: `${this.pathName}${urlQuery.length > 0 ? `?${urlQuery}` : ''}`,
      options: this.constructRequestOptions(options),
    };
  }

  /**
   * Sets the security settings on the header or query parameters object if oAuth or apikey security is set.
   */
  private async setSecurityIfNeeded(): Promise<void> {
    if (this.security && this.security.length > 0) {
      const oAuthSecurity = this.security.find((securityReq: SecurityRequirement): boolean => 'oAuth' in securityReq);
      if (oAuthSecurity && this.configuration.accessToken) {
        await this.setOAuthToHeaderObject(this.headerParameters, 'oAuth', oAuthSecurity.oAuth);
        return;
      }

      const apiKeySecurity = this.security.find((securityReq: SecurityRequirement): boolean => 'apiKey' in securityReq);
      if (apiKeySecurity && this.configuration.apiKey) {
        await this.setApiKeyToHeaderOrQueryObject();
      }
    }
  }

  /**
   * Sets an api key field of an object to the apiKey value in the {@link OpenApiClientConfiguration}.
   */
  private async setApiKeyToHeaderOrQueryObject(): Promise<void> {
    const securityScheme = this.securitySchemes?.apiKey as APIKeySecurityScheme | undefined;
    if (securityScheme) {
      const apiKey = await this.getApiKey(securityScheme.name);
      if (securityScheme.in === PARAMETER_AND_SCHEME_LOCATIONS.header) {
        this.headerParameters[securityScheme.name] = apiKey!;
      } else if (securityScheme.in === PARAMETER_AND_SCHEME_LOCATIONS.query) {
        this.queryParameters[securityScheme.name] = apiKey!;
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
   * @param headerParameters - The header parameter object
   * @param name - The security name used to generate an access token
   * @param scopes - oauth2 scopes used to generate an access token
   */
  private async setOAuthToHeaderObject(
    headerParameters: any,
    name: string,
    scopes: string[],
  ): Promise<void> {
    const localVarAccessTokenValue = typeof this.configuration.accessToken === 'function'
      ? await this.configuration.accessToken(name, scopes)
      : await this.configuration.accessToken;
    headerParameters.Authorization = `Bearer ${localVarAccessTokenValue}`;
  }

  /**
   * Helper adds the supplied args to the header parameter object or to the pathName depending
   * on the operation's "parameters" configuration. See [the spec](https://spec.openapis.org/oas/v3.1.0#parameter-object)
   * for more info.
   *
   * @param args - The operation arguments
   */
  private async addParametersToUrlAndHeader(args: Record<string, any>): Promise<void> {
    if (this.parameters) {
      this.assertAllRequiredParametersArePresent(args);
    }

    for (const [ key, value ] of Object.entries(args)) {
      const parameter = this.parameters?.find((param): boolean => param.name === key);
      if (parameter) {
        const parameterName = parameter.name as string;
        if (parameter.in === PARAMETER_AND_SCHEME_LOCATIONS.query) {
          this.queryParameters[key] = value;
        } else if (parameter.in === PARAMETER_AND_SCHEME_LOCATIONS.path) {
          this.replacePathTemplateInUrlPath(parameterName, value);
        } else if (parameter.in === PARAMETER_AND_SCHEME_LOCATIONS.header) {
          this.addParameterToHeaders(parameterName, value);
        } else {
          throw new Error(`Parameters with "in" set to ${parameter.in} are not supported.`);
        }
      } else {
        // Argument was not used for query, header, or path parameter, should be used in request body.
        this.requestBodyArgs[key] = value;
      }
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

  private addParameterToHeaders(parameterName: string, value: string): void {
    if (!IGNORED_HEADER_PARAMETERS.has(parameterName.toLowerCase())) {
      this.headerParameters[parameterName] = value;
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
   * @returns The request options object
   */
  private constructRequestOptions(options: AxiosRequestConfig): AxiosRequestConfig {
    const { baseOptions } = this.configuration;
    const requestOptions = {
      method: this.pathReqMethod,
      ...baseOptions,
      ...options,
      data: serializeDataIfNeeded(this.requestBodyArgs),
      headers: {
        ...this.headerParameters,
        ...baseOptions?.headers,
        ...options.headers,
      },
    };

    if (requestOptions.data) {
      requestOptions.headers['Content-Type'] = 'application/json';
    }
    return requestOptions;
  }
}
