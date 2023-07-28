/* eslint-disable @typescript-eslint/naming-convention */
import { OpenApiAxiosParamFactory } from '../../src/OpenApiAxiosParamFactory';
import { OpenApiClientAxiosApi } from '../../src/OpenApiClientAxiosApi';
import {
  clientCredentialsTokenOperationAndPathInfo,
  pkceOauthOperationAndPathInfo,
  securityStageOperationSecuritySchemes,
} from '../../src/OpenApiClientUtils';
import { OpenApiOperationExecutor } from '../../src/OpenApiOperationExecutor';
import type { OpenApi } from '../../src/OpenApiSchemaConfiguration';

jest.mock('../../src/OpenApiAxiosParamFactory');
jest.mock('../../src/OpenApiClientAxiosApi');

describe('An OpenApiOperationExecutor', (): void => {
  describe('executing operations', (): void => {
    let openApiDescription: OpenApi;
    let configuration: any;
    let executor: any;
    let paramFactory: any;
    let sendRequest: any;

    beforeEach(async(): Promise<void> => {
      jest.clearAllMocks();
      openApiDescription = {
        openapi: '3.0.3',
        info: {
          title: 'Dropbox v2 REST API',
          version: '1.0.0',
        },
        paths: {
          '/path/to/example': {
            post: {
              summary: 'Files - Get Metadata',
              description: `Returns the metadata for a file or folder.
                Note: Metadata for the root folder is unsupported.`,
              operationId: 'FilesGetMetadata',
              security: [{ oAuth: [ 'files.metadata.read' ]}],
              responses: {},
            },
          },
        },
      };
      configuration = undefined;
      paramFactory = {};
      sendRequest = jest.fn().mockResolvedValue('request response');
      (OpenApiAxiosParamFactory as jest.Mock).mockReturnValue(paramFactory);
      (OpenApiClientAxiosApi as jest.Mock).mockReturnValue({ sendRequest });
      executor = new OpenApiOperationExecutor();
    });

    it('throws an error if no openapi spec has been set.', async(): Promise<void> => {
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
      configuration = { basePath: '/example/base/path' };
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
          pathName: '/path/to/example',
          pathReqMethod: 'post',
          parameters: [],
        },
        { basePath: '/example/base/path' },
        {},
      );
      expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/example/base/path');
      expect(sendRequest).toHaveBeenCalledWith({ arg: 'abc' }, { option: 123 });
    });

    it(`uses the global server url with any slashes removed from the end and default variables replaced
      if no basePath is specified in the configuration and the Path Item and Operation do not specify servers.`,
    async(): Promise<void> => {
      openApiDescription = {
        ...openApiDescription,
        servers: [{
          url: '/default/{serverName}/url/',
          variables: {
            serverName: {
              default: 'beta',
            },
          },
        }],
      };
      await executor.setOpenapiSpec(openApiDescription);
      const response = await executor.executeOperation('FilesGetMetadata', configuration);
      expect(response).toBe('request response');
      expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
        {
          ...openApiDescription.paths['/path/to/example'].post,
          pathName: '/path/to/example',
          pathReqMethod: 'post',
          parameters: [],
        },
        {},
        {},
      );
      expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/default/beta/url');
    });

    it(`uses the Operation's server url with any slashes removed from the end and default variables replaced
      if no basePath is specified in the configuration.`,
    async(): Promise<void> => {
      openApiDescription = {
        ...openApiDescription,
        paths: {
          '/path/to/example': {
            post: {
              servers: [{
                url: '/default/{serverName}/url/',
                variables: {
                  serverName: {
                    default: 'beta',
                  },
                },
              }],
              summary: 'Files - Get Metadata',
              description: `Returns the metadata for a file or folder.
                Note: Metadata for the root folder is unsupported.`,
              operationId: 'FilesGetMetadata',
              security: [{ oAuth: [ 'files.metadata.read' ]}],
              responses: {},
            },
          },
        },
      };
      await executor.setOpenapiSpec(openApiDescription);
      const response = await executor.executeOperation('FilesGetMetadata', configuration);
      expect(response).toBe('request response');
      expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
        {
          ...openApiDescription.paths['/path/to/example'].post,
          pathName: '/path/to/example',
          pathReqMethod: 'post',
          parameters: [],
          overrideBasePath: '/default/beta/url',
        },
        {},
        {},
      );
      expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/default/beta/url');
    });

    it(`uses the Path Item's server url with any slashes removed from the end and default variables replaced
      if no basePath is specified in the configuration and the operation does nor specify servers.`,
    async(): Promise<void> => {
      openApiDescription = {
        ...openApiDescription,
        paths: {
          '/path/to/example': {
            post: {
              servers: [{
                url: '/default/{serverName}/url/',
                variables: {
                  serverName: {
                    default: 'beta',
                  },
                },
              }],
              summary: 'Files - Get Metadata',
              description: `Returns the metadata for a file or folder.
                Note: Metadata for the root folder is unsupported.`,
              operationId: 'FilesGetMetadata',
              security: [{ oAuth: [ 'files.metadata.read' ]}],
              responses: {},
            },
          },
        },
      };
      await executor.setOpenapiSpec(openApiDescription);
      const response = await executor.executeOperation('FilesGetMetadata', configuration);
      expect(response).toBe('request response');
      expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
        {
          ...openApiDescription.paths['/path/to/example'].post,
          pathName: '/path/to/example',
          pathReqMethod: 'post',
          parameters: [],
          overrideBasePath: '/default/beta/url',
        },
        {},
        {},
      );
      expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/default/beta/url');
    });

    it(`uses an empty basePath if no basePath is supplied and no server urls are in the spec.`,
      async(): Promise<void> => {
        await executor.setOpenapiSpec(openApiDescription);
        const response = await executor.executeOperation('FilesGetMetadata', configuration);
        expect(response).toBe('request response');
        expect(OpenApiAxiosParamFactory).toHaveBeenCalledTimes(1);
        expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
          {
            ...openApiDescription.paths['/path/to/example'].post,
            pathName: '/path/to/example',
            pathReqMethod: 'post',
            parameters: [],
          },
          {},
          {},
        );
        expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '');
      });

    it('throws an error if the operation cannot be found.', async(): Promise<void> => {
      await executor.setOpenapiSpec(openApiDescription);
      await expect(executor.executeOperation('NonExistentOperationId', configuration))
        .rejects.toThrow(Error);
      await expect(executor.executeOperation('NonExistentOperationId', configuration))
        .rejects.toThrow('No OpenApi operation with operationId NonExistentOperationId was found in the spec.');
    });

    it('uses the globally defined security setting if the operation does not specify one.', async(): Promise<void> => {
      configuration = { basePath: '/example/base/path' };
      configuration.accessToken = '12345';
      openApiDescription = {
        ...openApiDescription,
        security: [{ oAuth: [ 'files.metadata.read' ]}],
        paths: {
          ...openApiDescription.paths,
          '/path/to/example': {
            post: {
              summary: 'Files - Get Metadata',
              description: `Returns the metadata for a file or folder.
                Note: Metadata for the root folder is unsupported.`,
              operationId: 'FilesGetMetadata',
              responses: {},
            },
          },
        },
      };
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
          parameters: [],
        },
        configuration,
        {},
      );
      expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/example/base/path');
      expect(sendRequest).toHaveBeenCalledWith({ arg: 'abc' }, { option: 123 });
    });

    it(`uses parameters defined in the operation and it's containing pathItem, 
      deferring to the operation specific ones if duplicated.`,
    async(): Promise<void> => {
      configuration = { basePath: '/example/base/path' };
      openApiDescription = {
        ...openApiDescription,
        paths: {
          ...openApiDescription.paths,
          '/path/to/example': {
            parameters: [
              {
                name: 'param1',
                in: 'query',
              },
              {
                name: 'param2',
                in: 'query',
              },
            ],
            post: {
              ...openApiDescription.paths['/path/to/example'].post!,
              parameters: [{
                name: 'param2',
                in: 'query',
                schema: {
                  type: 'string',
                },
              }],
            },
          },
        },
      };
      await executor.setOpenapiSpec(openApiDescription);
      const response = await executor.executeOperation(
        'FilesGetMetadata',
        configuration,
        { param1: 'abc', param2: 123 },
      );
      expect(response).toBe('request response');
      expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
        {
          ...openApiDescription.paths['/path/to/example'].post,
          security: [{ oAuth: [ 'files.metadata.read' ]}],
          pathName: '/path/to/example',
          pathReqMethod: 'post',
          parameters: [
            {
              name: 'param2',
              in: 'query',
              schema: {
                type: 'string',
              },
            },
            {
              name: 'param1',
              in: 'query',
            },
          ],
        },
        configuration,
        {},
      );
      expect(OpenApiClientAxiosApi).toHaveBeenCalledWith(paramFactory, '/example/base/path');
      expect(sendRequest).toHaveBeenCalledWith({ param1: 'abc', param2: 123 }, undefined);
    });
  });

  describe('executing security schemes', (): void => {
    const openApiDescription: OpenApi = {
      openapi: '3.0.3',
      info: {
        title: 'Dropbox v2 REST API',
        version: '1.0.0',
      },
      paths: {},
      components: {
        securitySchemes: {
          oAuth: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'https://www.dropbox.com/oauth2/authorize',
                tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
                refreshUrl: 'https://api.dropboxapi.com/oauth2/token',
                scopes: {
                  'files.metadata.read': 'Read files',
                },
              },
              clientCredentials: {
                tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
                refreshUrl: 'https://api.dropboxapi.com/oauth2/token',
                scopes: {},
              },
            },
          },
          wrongType: {
            type: 'oidc',
          },
        },
      },
    };

    let executor: any;
    let paramFactory: any;
    let sendRequest: any;

    beforeEach(async(): Promise<void> => {
      jest.resetAllMocks();
      paramFactory = {};
      sendRequest = jest.fn().mockResolvedValue('request response');
      (OpenApiAxiosParamFactory as jest.Mock).mockReturnValue(paramFactory);
      (OpenApiClientAxiosApi as jest.Mock).mockReturnValue({ sendRequest });
      executor = new OpenApiOperationExecutor();
    });

    it('throws an error if no openapi spec has been set.', async(): Promise<void> => {
      await expect(executor.executeSecuritySchemeStage(
        'oAuth',
        'authorizationCode',
        'authorizationUrl',
        { clientId: 'abc123' },
      )).rejects.toThrow('No Openapi description supplied.');
    });

    it('throws an error if the security scheme does not exist.', async(): Promise<void> => {
      await executor.setOpenapiSpec(openApiDescription);
      await expect(executor.executeSecuritySchemeStage(
        'bad-scheme',
        'authorizationCode',
        'authorizationUrl',
        { clientId: 'abc123' },
      )).rejects.toThrow('No security scheme called bad-scheme found.');
    });

    it('throws an error if the scheme is not the oauth2 type.', async(): Promise<void> => {
      await executor.setOpenapiSpec(openApiDescription);
      await expect(executor.executeSecuritySchemeStage(
        'wrongType',
        'authorizationCode',
        'authorizationUrl',
        { clientId: 'abc123' },
      )).rejects.toThrow('Execution of oidc security schemes is not supported.');
    });

    it('throws an error if the oauth flow type does not exist.', async(): Promise<void> => {
      await executor.setOpenapiSpec(openApiDescription);
      await expect(executor.executeSecuritySchemeStage(
        'oAuth',
        'pkce',
        'authorizationUrl',
        { clientId: 'abc123' },
      )).rejects.toThrow('No flow called pkce found in the oAuth security scheme.');
    });

    describe('client credentials code flow', (): void => {
      it('throws an error if the stage does not exist.', async(): Promise<void> => {
        await executor.setOpenapiSpec(openApiDescription);
        await expect(executor.executeSecuritySchemeStage(
          'oAuth',
          'clientCredentials',
          'redirectUrl',
          { username: 'adlerfaulkner', password: 'abc123' },
          { grant_type: 'client_credentials', scope: 'files.read' },
        )).rejects.toThrow('No stage called redirectUrl found in clientCredentials flow of the oAuth security scheme.');
      });

      it('throws an error if the stage is not supported.', async(): Promise<void> => {
        await executor.setOpenapiSpec(openApiDescription);
        await expect(executor.executeSecuritySchemeStage(
          'oAuth',
          'clientCredentials',
          'refreshUrl',
          { username: 'adlerfaulkner', password: 'abc123' },
          { grant_type: 'client_credentials', scope: 'files.read' },
        )).rejects.toThrow(
          'refreshUrl stage found in clientCredentials flow of the oAuth security scheme is not supported.',
        );
      });

      it('returns an access token from the clientCredentials flow.',
        async(): Promise<void> => {
          await executor.setOpenapiSpec(openApiDescription);
          const response = await executor.executeSecuritySchemeStage(
            'oAuth',
            'clientCredentials',
            'tokenUrl',
            { username: 'adlerfaulkner', password: 'abc123' },
            { grant_type: 'client_credentials', scope: 'files.read' },
          );
          expect(response).toBe('request response');
          expect(sendRequest).toHaveBeenCalledTimes(1);
          expect(sendRequest).toHaveBeenCalledWith(
            {
              grant_type: 'client_credentials',
              scope: 'files.read',
            },
            undefined,
          );
          expect(OpenApiAxiosParamFactory).toHaveBeenCalledTimes(1);
          expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
            {
              ...clientCredentialsTokenOperationAndPathInfo,
              pathName: 'https://api.dropboxapi.com/oauth2/token',
            },
            { username: 'adlerfaulkner', password: 'abc123' },
            securityStageOperationSecuritySchemes,
          );
        });
    });

    describe('authorization code flow', (): void => {
      it('throws an error if the stage does not exist.', async(): Promise<void> => {
        await executor.setOpenapiSpec(openApiDescription);
        await expect(executor.executeSecuritySchemeStage(
          'oAuth',
          'authorizationCode',
          'redirectUrl',
          {},
          { clientId: 'abc123' },
        )).rejects.toThrow('No stage called redirectUrl found in authorizationCode flow of the oAuth security scheme.');
      });

      it('throws an error if the stage is not supported.', async(): Promise<void> => {
        await executor.setOpenapiSpec(openApiDescription);
        await expect(executor.executeSecuritySchemeStage(
          'oAuth',
          'authorizationCode',
          'refreshUrl',
          {},
          { clientId: 'abc123' },
        )).rejects.toThrow(
          'refreshUrl stage found in authorizationCode flow of the oAuth security scheme is not supported.',
        );
      });

      it('returns an authorization url and codeVerifier for the authorizationCode flow with PKCE.',
        async(): Promise<void> => {
          await executor.setOpenapiSpec(openApiDescription);
          const response = await executor.executeSecuritySchemeStage(
            'oAuth',
            'authorizationCode',
            'authorizationUrl',
            {},
            { client_id: 'abc123', redirect_uri: 'https://example.com/redirect', response_type: 'code' },
          );
          expect(response.codeVerifier).toMatch(/[\d+-_/A-Za-z%]+/u);
          expect(response.authorizationUrl).toMatch(
            // eslint-disable-next-line max-len
            /https:\/\/www.dropbox.com\/oauth2\/authorize\?redirect_uri=https%3A%2F%2Fexample.com%2Fredirect&client_id=abc123&response_type=code&code_challenge_method=S256&code_challenge=[\d+-_/A-Za-z%]+&scope=files.metadata.read$/u,
          );
        });

      it('sends a token request to the oauth provider for the authorizationCode flow with PKCE.',
        async(): Promise<void> => {
          executor = new OpenApiOperationExecutor();
          await executor.setOpenapiSpec(openApiDescription);
          await expect(executor.executeSecuritySchemeStage(
            'oAuth',
            'authorizationCode',
            'tokenUrl',
            {},
            {
              code: 'dummy_code',
              grant_type: 'authorization_code',
              code_verifier: 'something',
            },
          )).resolves.toBe('request response');
          expect(OpenApiAxiosParamFactory).toHaveBeenCalledTimes(1);
          expect(OpenApiAxiosParamFactory).toHaveBeenCalledWith(
            {
              ...pkceOauthOperationAndPathInfo,
              pathName: 'https://api.dropboxapi.com/oauth2/token',
            },
            {},
            securityStageOperationSecuritySchemes,
          );
        });
    });
  });
});
