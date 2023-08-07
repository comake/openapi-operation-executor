/* eslint-disable @typescript-eslint/naming-convention */
import crypto from 'crypto';
import RefParser from '@apidevtools/json-schema-ref-parser';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { OpenApiAxiosParamFactory } from './OpenApiAxiosParamFactory';
import { OpenApiClientAxiosApi } from './OpenApiClientAxiosApi';
import type { OpenApiClientConfiguration } from './OpenApiClientConfiguration';
import {
  base64URLEncode,
  jsonParamsToUrlString,
  pkceOauthOperationAndPathInfo,
  clientCredentialsTokenOperationAndPathInfo,
  securityStageOperationSecuritySchemes,
  sha256,
} from './OpenApiClientUtils';
import type {
  OpenApi,
  DereferencedOpenApi,
  OAuth2SecurityScheme,
  SecurityScheme,
  DereferencedOperation,
  DereferencedParameter,
  Server,
  ServerVariable,
} from './OpenApiSchemaConfiguration';

export interface CodeAuthorizationUrlResponse {
  codeVerifier: string;
  authorizationUrl: string;
}

export type RequireFields<T, TFields extends string> =
Omit<T, TFields> & Required<Pick<T, TFields & keyof T>>;

export type OpenApiClientConfigurationWithBasePath = RequireFields<OpenApiClientConfiguration, 'basePath'>;

export interface PathInfo {
  pathName: string;
  pathReqMethod: string;
  overrideBasePath?: string;
}

export type OperationWithPathInfo = DereferencedOperation & PathInfo;

const AUTHORIZATION_URL_STAGE = 'authorizationUrl';
const SUPPORTED_SECURITY_OPERATION_STAGES = new Set([ 'tokenUrl' ]);
const CLIENT_CREDENTIALS_FLOW = 'clientCredentials';

export class OpenApiOperationExecutor {
  private openApiDescription?: DereferencedOpenApi;

  public async setOpenapiSpec(openApiDescription: OpenApi): Promise<void> {
    this.openApiDescription = await RefParser.dereference(openApiDescription) as DereferencedOpenApi;
  }

  public async executeOperation(
    operationId: string,
    configuration: OpenApiClientConfiguration = {},
    args?: Record<string, any>,
    options?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    this.assertOpenApiDescriptionHasBeenSet();
    const operationAndPathInfo = this.getOperationWithPathInfoMatchingOperationId(operationId);
    configuration.basePath ||= operationAndPathInfo.overrideBasePath ?? this.constructBasePathFromGlobalServers();
    return this.sendOperationRequest(
      operationAndPathInfo,
      configuration,
      this.openApiDescription!.components?.securitySchemes ?? {},
      args,
      options,
    );
  }

  private async sendOperationRequest(
    operationAndPathInfo: OperationWithPathInfo,
    configuration: OpenApiClientConfiguration,
    securitySchemes: Record<string, SecurityScheme>,
    args?: Record<string, any>,
    options?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    const paramFactory = new OpenApiAxiosParamFactory(
      operationAndPathInfo,
      configuration,
      securitySchemes,
    );
    const openApiClientApi = new OpenApiClientAxiosApi(paramFactory, configuration.basePath);
    return openApiClientApi.sendRequest(args, options);
  }

  public async executeSecuritySchemeStage(
    scheme: string,
    flow: string,
    stage: string,
    configuration: OpenApiClientConfiguration,
    args: Record<string, any>,
  ): Promise<CodeAuthorizationUrlResponse | AxiosResponse> {
    this.assertOpenApiDescriptionHasBeenSet();

    const schemeConfig = this.openApiDescription!.components?.securitySchemes?.[scheme];
    if (!schemeConfig) {
      throw new Error(`No security scheme called ${scheme} found.`);
    }
    if (schemeConfig.type !== 'oauth2') {
      throw new Error(`Execution of ${schemeConfig.type} security schemes is not supported.`);
    }

    const flowConfig = (schemeConfig as OAuth2SecurityScheme).flows[flow] as Record<string, any>;
    if (!flowConfig) {
      throw new Error(`No flow called ${flow} found in the ${scheme} security scheme.`);
    }

    if (!flowConfig[stage] || typeof flowConfig[stage] !== 'string') {
      throw new Error(`No stage called ${stage} found in ${flow} flow of the ${scheme} security scheme.`);
    }

    if (stage === AUTHORIZATION_URL_STAGE) {
      return this.constructAuthorizationUrlStageInfo(flowConfig.authorizationUrl, args, flowConfig.scopes);
    }

    if (SUPPORTED_SECURITY_OPERATION_STAGES.has(stage)) {
      const flowOperationInfo = this.getOperationInfoForFlow(flow);
      const operationAndPathInfo = { ...flowOperationInfo, pathName: flowConfig[stage] };
      return this.sendOperationRequest(
        operationAndPathInfo,
        configuration,
        securityStageOperationSecuritySchemes,
        args,
      );
    }

    throw new Error(`${stage} stage found in ${flow} flow of the ${scheme} security scheme is not supported.`);
  }

  private assertOpenApiDescriptionHasBeenSet(): void {
    if (!this.openApiDescription) {
      throw new Error('No Openapi description supplied.');
    }
  }

  private constructAuthorizationUrlStageInfo(
    authorizationUrlBase: string,
    args: Record<string, any>,
    scopes?: string[],
  ): CodeAuthorizationUrlResponse {
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const authorizationUrl = this.constructAuthorizationUrl(
      authorizationUrlBase,
      codeVerifier,
      args,
      scopes,
    );
    return { codeVerifier, authorizationUrl };
  }

  private constructAuthorizationUrl(
    authorizationUrlBase: string,
    codeVerifier: string,
    args: Record<string, any>,
    scopes?: string[],
  ): string {
    const params = {
      redirect_uri: args.redirect_uri,
      client_id: args.client_id,
      response_type: args.response_type,
    } as any;
    if (params.response_type === 'code') {
      params.code_challenge_method = 'S256';
      params.code_challenge = base64URLEncode(sha256(codeVerifier));
    }
    if (scopes) {
      params.scope = Object.keys(scopes).join(' ');
    }
    return `${authorizationUrlBase}?${jsonParamsToUrlString(params)}`;
  }

  private getOperationInfoForFlow(flow: string): DereferencedOperation & Pick<OperationWithPathInfo, 'pathReqMethod'> {
    return flow === CLIENT_CREDENTIALS_FLOW
      ? clientCredentialsTokenOperationAndPathInfo
      : pkceOauthOperationAndPathInfo;
  }

  private constructBasePathFromGlobalServers(): string {
    if (this.openApiDescription!.servers && this.openApiDescription!.servers.length > 0) {
      return this.constructBasePath(this.openApiDescription!.servers);
    }
    return '';
  }

  private constructServerPathForOperation(hasServers: { servers?: readonly Server[] }): string | undefined {
    if (hasServers.servers && hasServers.servers.length > 0) {
      return this.constructBasePath(hasServers.servers);
    }
    return undefined;
  }

  private constructBasePath(servers: readonly Server[]): string {
    const firstServer = servers[0];
    const withoutTrailingSlashes = firstServer.url.replace(/\/+$/u, '');
    if (firstServer.variables) {
      return this.replaceServerVariablesWithDefaults(withoutTrailingSlashes, firstServer.variables);
    }
    return withoutTrailingSlashes;
  }

  private replaceServerVariablesWithDefaults(url: string, serverVariables: Record<string, ServerVariable>): string {
    // eslint-disable-next-line unicorn/expiring-todo-comments
    // TODO support setting server variables to values other than defaults
    return Object.entries(serverVariables)
      .reduce((result: string, [ variable, value ]): string =>
        result.replaceAll(`{${variable}}`, value.default), url);
  }

  private getOperationWithPathInfoMatchingOperationId(operationId: string): OperationWithPathInfo {
    for (const pathName in this.openApiDescription!.paths) {
      /* eslint-disable-next-line unicorn/prefer-object-has-own */
      if (Object.prototype.hasOwnProperty.call(this.openApiDescription!.paths, pathName)) {
        const pathItem = this.openApiDescription!.paths[pathName];
        for (const pathReqMethod in pathItem) {
          /* eslint-disable-next-line unicorn/prefer-object-has-own */
          if (Object.prototype.hasOwnProperty.call(pathItem, pathReqMethod)) {
            const operation = (pathItem as any)[pathReqMethod] as DereferencedOperation;
            if (operation?.operationId === operationId) {
              return {
                ...operation,
                parameters: this.addParametersIfNotDefined(operation.parameters ?? [], pathItem.parameters ?? []),
                security: operation.security ?? this.openApiDescription!.security,
                pathName,
                pathReqMethod,
                overrideBasePath: this.constructServerPathForOperation(operation) ??
                  this.constructServerPathForOperation(pathItem),
              };
            }
          }
        }
      }
    }

    throw new Error(`No OpenApi operation with operationId ${operationId} was found in the spec.`);
  }

  private addParametersIfNotDefined(
    parameters: readonly DereferencedParameter[],
    additionalParameters: readonly DereferencedParameter[],
  ): DereferencedParameter[] {
    const newParameters = [ ...parameters ];
    for (const additionalParameter of additionalParameters) {
      const alreadyExistsInParameters = parameters
        .some((param): boolean => param.name === additionalParameter.name && param.in === additionalParameter.in);
      if (!alreadyExistsInParameters) {
        newParameters.push(additionalParameter);
      }
    }
    return newParameters;
  }
}
