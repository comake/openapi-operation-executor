import RefParser from '@apidevtools/json-schema-ref-parser';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { OpenApiAxiosParamFactory } from './OpenApiAxiosParamFactory';
import { OpenApiClientAxiosApi } from './OpenApiClientAxiosApi';
import type { Operation, OpenApi, DereferencedOpenApi } from './OpenApiSchemaConfiguration';

export interface OpenApiClientConfiguration {
  /**
  * Parameter for apiKey security
  * @param name - security name
  */
  apiKey?: string
  | Promise<string>
  | ((name: string) => string) | ((name: string) => Promise<string>);
  /**
  * TODO: Add support for username and password security.
  * Parameter for basic security
  */
  // username?: string;
  /**
  * Parameter for basic security
  */
  // password?: string;
  /**
  * Parameter for oauth2 security
  * @param name - security name
  * @param scopes - oauth2 scope
  */
  accessToken?: string | Promise<string>
  | ((name?: string, scopes?: string[]) => string)
  | ((name?: string, scopes?: string[]) => Promise<string>);
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

export interface PathInfo {
  pathName: string;
  pathReqMethod: string;
}

export type OperationWithPathInfo = Operation & PathInfo;

export class OpenApiOperationExecutor {
  private openApiDescription?: DereferencedOpenApi;

  public async setOpenapiSpec(openApiDescription: OpenApi): Promise<void> {
    this.openApiDescription = await RefParser.dereference(openApiDescription) as DereferencedOpenApi;
  }

  public async executeOperation(
    operationId: string,
    configuration: OpenApiClientConfiguration,
    args?: any,
    options?: AxiosRequestConfig,
  ): Promise<AxiosResponse> {
    if (!this.openApiDescription) {
      throw new Error('No Openapi description supplied.');
    }

    const basePath = this.constructBasePath();
    const operationAndPathInfo = this.getOperationWithPathInfoMatchingOperationId(operationId);
    const paramFactory = new OpenApiAxiosParamFactory(
      operationAndPathInfo,
      configuration,
      this.openApiDescription.components?.securitySchemes,
    );
    const openApiClientApi = new OpenApiClientAxiosApi(paramFactory, configuration.basePath ?? basePath);
    return openApiClientApi.sendRequest(args, options);
  }

  private constructBasePath(): string {
    // eslint-disable-next-line unicorn/expiring-todo-comments
    // TODO support server variables in url
    if (this.openApiDescription!.servers && this.openApiDescription!.servers.length > 0) {
      return this.openApiDescription!.servers[0].url.replace(/\/+$/u, '');
    }
    return '';
  }

  private getOperationWithPathInfoMatchingOperationId(operationId: string): OperationWithPathInfo {
    for (const pathName in this.openApiDescription!.paths) {
      /* eslint-disable-next-line unicorn/prefer-object-has-own */
      if (Object.prototype.hasOwnProperty.call(this.openApiDescription!.paths, pathName)) {
        const pathItem = this.openApiDescription!.paths[pathName];
        for (const pathReqMethod in pathItem) {
          /* eslint-disable-next-line unicorn/prefer-object-has-own */
          if (Object.prototype.hasOwnProperty.call(pathItem, pathReqMethod)) {
            const operation = (pathItem as any)[pathReqMethod];
            if (operation?.operationId === operationId) {
              return {
                ...operation,
                security: operation.security || this.openApiDescription!.security,
                pathName,
                pathReqMethod,
              };
            }
          }
        }
      }
    }

    throw new Error(`No OpenApi operation with operationId ${operationId} was found in the spec.`);
  }
}
