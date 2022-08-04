/* eslint-disable @typescript-eslint/naming-convention */
import axios from 'axios';
import { OpenApiOperationExecutor } from '../../src/OpenApiOperationExecutor';
import type { OpenApi } from '../../src/OpenApiSchemaConfiguration';
import openApiSpec from '../assets/openapi-spec.json';

jest.mock('axios');

describe('Operation execution', (): void => {
  const config = { accessToken: 'token' };
  const mockResponse = {
    data: 'response',
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  };

  let executor: OpenApiOperationExecutor;

  beforeAll(async(): Promise<void> => {
    (axios.request as jest.Mock).mockResolvedValue(mockResponse);
    executor = new OpenApiOperationExecutor();
    await executor.setOpenapiSpec(openApiSpec as OpenApi);
  });

  it('sends a web request via axios.', async(): Promise<void> => {
    const response = await executor.executeOperation('FilesGetMetadata', config);
    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(axios.request).toHaveBeenCalledWith({
      url: 'https://api.dropboxapi.com/2/files/get_metadata',
      method: 'post',
      headers: {
        Authorization: 'Bearer token',
      },
    });
    expect(response).toEqual(mockResponse);
  });
});
