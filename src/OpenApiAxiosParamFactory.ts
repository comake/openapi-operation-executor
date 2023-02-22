import type { AxiosRequestConfig } from 'axios';
import type { OpenApiClientConfiguration } from './OpenApiClientConfiguration';
import {
  serializeDataAsJsonIfNeeded,
  serializeDataAsFormIfNeeded,
  jsonParamsToUrlString,
  escapeRegExp,
  base64URLEncode,
} from './OpenApiClientUtils';
import type { JSONValue } from './OpenApiClientUtils';
import type { OperationWithPathInfo } from './OpenApiOperationExecutor';
import type {
  SecurityRequirement,
  APIKeySecurityScheme,
  DereferencedComponents,
  Parameter,
  SecurityScheme,
  RequestBody,
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

const SECURITY_TYPES = {
  oauth2: 'oauth2',
  apiKey: 'apiKey',
  http: 'http',
};

const BASIC_SCHEME_TYPE = 'basic';
const BEARER_SCHEME_TYPE = 'bearer';

const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';
const JSON_CONTENT_TYPE = 'application/json';

/**
 * Factory that generates an AxiosRequestParams object for an {@link OpenApiClientAxiosApi}
 * based on the configuration of an OpenApi Operation.
 *
 * Not yet supported:
  * - Operation parameters set through cookies using the `in` field set to `cookies`
  * - Implementation of the `style` and `explode` parameter fields to change the way parameter values are serialized
  * - Security schemes other than those with `type` set to `oAuth`, `apiKey`, or `http` with scheme `basic`.
  *   Eg `mutualTLS` and `openIdConnect` are not supported
  * - Validation of the supplied args used in a `requestBody`
  * - The `callbacks` field on an operation
  * - Supplying an alternate server through the `servers` field
  * - Supplying server variables
  *
 */
export class OpenApiAxiosParamFactory {
  private pathName: string;
  private queryParameters: Record<string, JSONValue> = {};
  private headerParameters: HeaderObject = {};
  private requestBodyArgs: Record<string, any> = {};
  private readonly pathReqMethod: string;
  private readonly security?: readonly SecurityRequirement[];
  private readonly securitySchemes: Required<DereferencedComponents>['securitySchemes'];
  private readonly configuration: OpenApiClientConfiguration;
  private readonly parameters?: readonly Parameter[];
  private readonly requestBody?: RequestBody;

  public constructor(
    operationWithPathInfo: OperationWithPathInfo,
    configuration: OpenApiClientConfiguration,
    securitySchemes: Required<DereferencedComponents>['securitySchemes'],
  ) {
    this.pathName = operationWithPathInfo.pathName;
    this.pathReqMethod = operationWithPathInfo.pathReqMethod;
    this.security = operationWithPathInfo.security;
    this.parameters = operationWithPathInfo.parameters;
    this.requestBody = operationWithPathInfo.requestBody;
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
    const oAuthSecurity = this.findOauthSecurityRequirement();
    if (oAuthSecurity && this.configuration.accessToken) {
      const schemeName = Object.keys(oAuthSecurity)[0];
      await this.setOAuthToHeaderObject(this.headerParameters, schemeName, oAuthSecurity[schemeName]);
      return;
    }

    const bearerSecurity = this.findBearerSecurityRequirement();
    if (bearerSecurity && this.configuration.jwt) {
      await this.setBearerAuthToHeaderObject(this.headerParameters);
      return;
    }

    const basicSecurity = this.findBasicSecurityRequirement();
    if (basicSecurity && this.configuration.username && this.configuration.password) {
      await this.setBasicAuthToHeaderObject(this.headerParameters);
      return;
    }

    const apiKeySecurity = this.findApiKeySecurityRequirement();
    if (apiKeySecurity && this.configuration.apiKey) {
      await this.setApiKeyToHeaderOrQueryObject();
    }
  }

  private findBearerSecurityRequirement(): SecurityRequirement | undefined {
    return this.findSecurityRequirementMatchingScheme(
      (scheme: SecurityScheme): boolean => scheme.type === SECURITY_TYPES.http && scheme.scheme === BEARER_SCHEME_TYPE,
    );
  }

  private findBasicSecurityRequirement(): SecurityRequirement | undefined {
    return this.findSecurityRequirementMatchingScheme(
      (scheme: SecurityScheme): boolean => scheme.type === SECURITY_TYPES.http && scheme.scheme === BASIC_SCHEME_TYPE,
    );
  }

  private findOauthSecurityRequirement(): SecurityRequirement | undefined {
    return this.findSecurityRequirementMatchingScheme(
      (scheme: SecurityScheme): boolean => scheme.type === SECURITY_TYPES.oauth2,
    );
  }

  private findApiKeySecurityRequirement(): SecurityRequirement | undefined {
    return this.findSecurityRequirementMatchingScheme(
      (scheme: SecurityScheme): boolean => scheme.type === SECURITY_TYPES.apiKey,
    );
  }

  private findSecurityRequirementMatchingScheme(
    schemeMatcher: (scheme: SecurityScheme) => boolean,
  ): SecurityRequirement | undefined {
    if (this.security) {
      return this.security.find((securityReq: SecurityRequirement): boolean => {
        const schemeName = Object.keys(securityReq)[0];
        const scheme = this.securitySchemes[schemeName];
        return scheme ? schemeMatcher(scheme) : false;
      });
    }
  }

  /**
   * Sets an api key field of an object to the apiKey value in the {@link OpenApiClientConfiguration}.
   */
  private async setApiKeyToHeaderOrQueryObject(): Promise<void> {
    const securityScheme = this.securitySchemes.apiKey as APIKeySecurityScheme | undefined;
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
   * Helper that sets the Bearer type Authorization field of an object. Generates an access token
   * if the {@link OpenApiClientConfiguration} specifies an access token generation function,
   * uses static the value if not.
   *
   * @param headerParameters - The header parameter object
   * @param name - The security name used to generate an access token
   * @param scopes - oauth2 scopes used to generate an access token
   */
  private async setOAuthToHeaderObject(
    headerParameters: any,
    name: string,
    scopes: readonly string[],
  ): Promise<void> {
    const accessToken = await this.getAccessToken(name, scopes);
    headerParameters.Authorization = `Bearer ${accessToken}`;
  }

  private async getAccessToken(name: string, scopes: readonly string[]): Promise<string | undefined> {
    return typeof this.configuration.accessToken === 'function'
      ? await this.configuration.accessToken(name, scopes)
      : await this.configuration.accessToken;
  }

  /**
   * Helper that sets the Bearer type Authorization field of an object. Generates a jwt token
   * if the {@link OpenApiClientConfiguration} specifies an jwt generation function,
   * uses the static value if not.
   *
   * @param headerParameters - The header parameter object
   */
  private async setBearerAuthToHeaderObject(headerParameters: any): Promise<void> {
    const jwt = await this.getJwt();
    headerParameters.Authorization = `Bearer ${jwt}`;
  }

  private async getJwt(): Promise<string | undefined> {
    return typeof this.configuration.jwt === 'function'
      ? await this.configuration.jwt()
      : await this.configuration.jwt;
  }

  /**
   * Helper that sets the Basic type Authorization field of an object.
   * Encodes the Basic authentication credentials as base64.
   *
   * @param headerParameters - The header parameter object
   */
  private async setBasicAuthToHeaderObject(headerParameters: any): Promise<void> {
    const credentials = `${this.configuration.username}:${this.configuration.password}`;
    const credentialsBuffer = Buffer.from(credentials, 'utf-8');
    const encodedCredentials = base64URLEncode(credentialsBuffer);
    headerParameters.Authorization = `Basic ${encodedCredentials}`;
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
        const parameterName = parameter.name;
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
      parameter.required === true && !Object.prototype.hasOwnProperty.call(args, parameter.name));

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
    const contentType = this.getContentType();
    const data = this.getAndSerializeRequestData(contentType);
    const requestOptions = {
      method: this.pathReqMethod,
      ...baseOptions,
      ...options,
      data,
      headers: {
        ...this.headerParameters,
        ...baseOptions?.headers,
        ...options.headers,
      },
    };

    if (data) {
      requestOptions.headers['Content-Type'] = contentType;
    }
    return requestOptions;
  }

  private getContentType(): string {
    if (this.requestBody?.content?.[FORM_CONTENT_TYPE] && !this.requestBody?.content?.[JSON_CONTENT_TYPE]) {
      return FORM_CONTENT_TYPE;
    }
    return JSON_CONTENT_TYPE;
  }

  private getAndSerializeRequestData(contentType: string): string | undefined {
    if (contentType === FORM_CONTENT_TYPE) {
      return serializeDataAsFormIfNeeded(this.requestBodyArgs);
    }
    return serializeDataAsJsonIfNeeded(this.requestBodyArgs);
  }
}
