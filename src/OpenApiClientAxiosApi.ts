import globalAxios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { OpenApiAxiosParamFactory } from './OpenApiAxiosParamFactory';

/**
 * Sends Axios requests for OpenApi operations.
 */
export class OpenApiClientAxiosApi {
  private readonly paramFactory: OpenApiAxiosParamFactory;
  private readonly axios: AxiosInstance;
  private readonly basePath: string;

  public constructor(
    paramFactory: OpenApiAxiosParamFactory,
    basePath?: string,
    axios?: AxiosInstance,
  ) {
    this.paramFactory = paramFactory;
    this.basePath = basePath ?? '';
    this.axios = axios ?? globalAxios;
  }

  public async sendRequest(args?: Record<string, any>, options?: AxiosRequestConfig): Promise<AxiosResponse> {
    const axiosRequestParams = await this.paramFactory.createParams(args, options);
    const axiosRequestParamsWithBasePath = {
      ...axiosRequestParams.options,
      url: `${this.basePath}${axiosRequestParams.url}`,
    };
    return this.axios.request(axiosRequestParamsWithBasePath);
  }
}
