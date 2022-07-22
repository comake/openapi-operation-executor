/* eslint-disable @typescript-eslint/naming-convention */
import { OpenApiAxiosParamFactory } from '../../src/OpenApiAxiosParamFactory';
import { OpenApiClientAxiosApi } from '../../src/OpenApiClientAxiosApi';
import { OpenApiOperationExecutor } from '../../src/OpenApiOperationExecutor';
import type { OpenApi } from '../../src/OpenApiSchemaConfiguration';

jest.mock('../../src/OpenApiAxiosParamFactory');
jest.mock('../../src/OpenApiClientAxiosApi');

describe('An OpenApiOperationExecutor', (): void => {
  const openApiDescription: OpenApi = {
    openapi: '3.0.3',
    info: {
      title: 'Dropbox v2 REST API',
      version: '1.0.0',
    },
    paths: {
      '/path/to/example': {
        post: {
          summary: 'Files - Get Metadata',
          description: 'Returns the metadata for a file or folder.\nNote: Metadata for the root folder is unsupported.',
          operationId: 'FilesGetMetadata',
          security: [{ oAuth: [ 'files.metadata.read' ]}],
          responses: {},
        },
      },
    },
  };

  let configuration: any;
  let executor: any;
  let paramFactory: any;
  let sendRequest: any;

  beforeEach(async(): Promise<void> => {
    configuration = {};
    paramFactory = {};
    sendRequest = jest.fn().mockResolvedValue('request response');
    (OpenApiAxiosParamFactory as jest.Mock).mockReturnValue(paramFactory);
    (OpenApiClientAxiosApi as jest.Mock).mockReturnValue({ sendRequest });
  });

  it('throws an error if no openapi spec has been set.', async(): Promise<void> => {
    executor = new OpenApiOperationExecutor();
    await expect(executor.executeOperation(
      'FilesGetMetadata',
      configuration,
      { arg: 'abc' },
      { option: 123 },
    ))
      .rejects.toThrow(Error);
    await expect(executor.executeOperation(
      'FilesGetMetadata',
      configuration,
      { arg: 'abc' },
      { option: 123 },
    ))
      .rejects.toThrow('No Openapi description supplied.');
  });

  it('executes the operation with the operationId in the configuration.', async(): Promise<void> => {
    configuration.basePath = '/example/base/path';
    executor = new OpenApiOperationExecutor();
    await executor.setOpenapiSpec(openApiDescription);
    const response = await executor.executeOperation(
      'FilesGetMetadata',
      configuration,
      { arg: 'abc' },
      { option: 123 },
    );
    expect(response).toBe('request response');
    expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/example/base/path');
    expect(sendRequest).toHaveBeenCalledWith({ arg: 'abc' }, { option: 123 });
  });

  it(`uses the openApiDescription server url with any slashes removed from the
    end if no basePath is specified in the configuration.`,
  async(): Promise<void> => {
    openApiDescription.servers = [{ url: '/default/server/url/' }];
    executor = new OpenApiOperationExecutor();
    await executor.setOpenapiSpec(openApiDescription);
    const response = await executor.executeOperation('FilesGetMetadata', configuration);
    expect(response).toBe('request response');
    expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/default/server/url');
  });

  it('throws an error if the operation cannot be found.', async(): Promise<void> => {
    executor = new OpenApiOperationExecutor();
    await executor.setOpenapiSpec(openApiDescription);
    await expect(executor.executeOperation('NonExistentOperationId', configuration))
      .rejects.toThrow(Error);
    await expect(executor.executeOperation('NonExistentOperationId', configuration))
      .rejects.toThrow('No OpenApi operation with operationId NonExistentOperationId was found in the spec.');
  });

  it('uses the globally defined security setting if the operation does not specify one.', async(): Promise<void> => {
    configuration.basePath = '/example/base/path';
    configuration.accessToken = '12345';
    delete openApiDescription.paths['/path/to/example'].post!.security;
    openApiDescription.security = [{ oAuth: [ 'files.metadata.read' ]}];
    executor = new OpenApiOperationExecutor();
    await executor.setOpenapiSpec(openApiDescription);
    const response = await executor.executeOperation(
      'FilesGetMetadata',
      configuration,
      { arg: 'abc' },
      { option: 123 },
    );
    expect(response).toBe('request response');
    expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
      {
        ...openApiDescription.paths['/path/to/example'].post,
        security: [{ oAuth: [ 'files.metadata.read' ]}],
        pathName: '/path/to/example',
        pathReqMethod: 'post',
      },
      configuration,
      undefined,
    );
    expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/example/base/path');
    expect(sendRequest).toHaveBeenCalledWith({ arg: 'abc' }, { option: 123 });
  });
});
