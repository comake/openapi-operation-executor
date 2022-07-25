/* eslint-disable @typescript-eslint/naming-convention */
import { OpenApiAxiosParamFactory } from '../../src/OpenApiAxiosParamFactory';
import type { Parameter } from '../../src/OpenApiSchemaConfiguration';

describe('An OpenApiAxiosParamFactory', (): void => {
  const pathReqMethod = 'GET';
  let pathName: string;
  let parameters: Parameter[];
  let operation: any;
  let configuration: any;
  let openApiAxiosParamFactory: OpenApiAxiosParamFactory;

  beforeEach(async(): Promise<void> => {
    pathName = '/example/api/path';
    operation = {
      responses: {},
      operationId: 'testOperation',
    };
    configuration = {};
    parameters = [];
  });

  it('creates an AxiosRequestParams object.', async(): Promise<void> => {
    configuration.baseOptions = {
      responseType: 'json',
      headers: { token: 'abcd' },
    };
    openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
      { ...operation, pathName, pathReqMethod, parameters },
      configuration,
    );
    const response = await openApiAxiosParamFactory.createParams({ foo: 'bar' });
    expect(response).toBeInstanceOf(Object);
    expect(response.url).not.toBeNull();
    expect(response.url).toBe(pathName);
    expect(response.options).not.toBeNull();
    expect(response.options).toEqual({
      method: pathReqMethod,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/json',
        token: 'abcd',
      },
      data: '{"foo":"bar"}',
    });
  });

  describe('oAuth security', (): void => {
    it('does not add the Authorization header if oAuth security scopes or an accessToken are not specified.',
      async(): Promise<void> => {
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
        );
        const response = await openApiAxiosParamFactory.createParams();
        expect(response.options.headers?.Authorization).toBeUndefined();
      });

    it('adds the Authorization header if oAuth security scopes and an accessToken are specified.',
      async(): Promise<void> => {
        operation.security = [{ oAuth: [ 'example/scope' ]}];
        configuration.accessToken = '12345';
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
        );
        const response = await openApiAxiosParamFactory.createParams();
        expect(response.options.headers?.Authorization).toBe('Bearer 12345');
      });

    it('adds the Authorization header if oAuth security scopes and an accessToken function are specified.',
      async(): Promise<void> => {
        operation.security = [{ oAuth: [ 'example/scope' ]}];
        configuration.accessToken = (): string => '12345';
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
        );
        const response = await openApiAxiosParamFactory.createParams();
        expect(response.options.headers?.Authorization).toBe('Bearer 12345');
      });
  });

  describe('apiKey security', (): void => {
    beforeEach(async(): Promise<void> => {
      operation.security = [{ apiKey: []}];
    });

    it('adds the apikey header if apiKey security, an apiKey security scheme, and an apikey are specified.',
      async(): Promise<void> => {
        configuration.apiKey = '12345';
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
          { apiKey: { in: 'header', name: 'X-API-KEY' }},
        );
        const response = await openApiAxiosParamFactory.createParams();
        expect(response.options.headers?.['X-API-KEY']).toBe('12345');
      });

    it('adds the apikey header if apiKey security, an apiKey security scheme, and an apikey function are specified.',
      async(): Promise<void> => {
        configuration.apiKey = (): string => '12345';
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
          { apiKey: { in: 'header', name: 'X-API-KEY' }},
        );
        const response = await openApiAxiosParamFactory.createParams();
        expect(response.url).toBe('/example/api/path');
        expect(response.options.headers?.['X-API-KEY']).toBe('12345');
      });

    it('adds the apikey query parameter if apiKey security, an apiKey security scheme, and an apikey are specified.',
      async(): Promise<void> => {
        configuration.apiKey = '12345';
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
          { apiKey: { in: 'query', name: 'apikey' }},
        );
        const response = await openApiAxiosParamFactory.createParams();
        expect(response.url).toBe('/example/api/path?apikey=12345');
        expect(response.options.data).toBe('{}');
      });

    it(`adds the apikey query parameter if apiKey security,
      an apiKey security scheme, and an apikey function are specified.`,
    async(): Promise<void> => {
      configuration.apiKey = (): string => '12345';
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod, parameters },
        configuration,
        { apiKey: { in: 'query', name: 'apikey' }},
      );
      const response = await openApiAxiosParamFactory.createParams();
      expect(response.url).toBe('/example/api/path?apikey=12345');
      expect(response.options.data).toBe('{}');
    });

    it('errors when an apiKey is specified with a security scheme set to a value that is not supported.',
      async(): Promise<void> => {
        configuration.apiKey = '12345';
        openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
          { ...operation, pathName, pathReqMethod, parameters },
          configuration,
          { apiKey: { in: 'cookie', name: 'apikey' }},
        );
        await expect(openApiAxiosParamFactory.createParams())
          .rejects.toThrow(Error);
        await expect(openApiAxiosParamFactory.createParams())
          .rejects.toThrow('apiKey security scheme in cookie is not supported.');
      });
  });

  it('adds header parameters to the headers if parameters are specified with the "header" location.',
    async(): Promise<void> => {
      parameters = [{
        name: 'X-SOME-HEADER',
        in: 'header',
      }];
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod, parameters },
        configuration,
      );
      const response = await openApiAxiosParamFactory.createParams({ 'X-SOME-HEADER': 'value' });
      expect(response.url).toBe('/example/api/path');
      expect(response.options.headers!['X-SOME-HEADER']).toBe('value');
    });

  it('ignores Accept, Content-Type, and Authorization headers supplied as parameters.',
    async(): Promise<void> => {
      parameters = [
        {
          name: 'Accept',
          in: 'header',
        },
        {
          name: 'Content-Type',
          in: 'header',
        },
        {
          name: 'Authorization',
          in: 'header',
        },
      ];
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod, parameters },
        configuration,
      );
      const response = await openApiAxiosParamFactory.createParams({
        Accept: 'value1',
        'Content-Type': 'value2',
        Authorization: 'value3',
      });
      expect(response.url).toBe('/example/api/path');
      expect(response.options.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(response.options.data).toBe('{}');
    });

  it('adds query parameters to the url if parameters are specified with the "query" location.',
    async(): Promise<void> => {
      parameters = [{
        name: 'param1',
        in: 'query',
      }];
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod, parameters },
        configuration,
      );
      const response = await openApiAxiosParamFactory.createParams({ param1: 'value' });
      expect(response.options.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(response.url).toBe('/example/api/path?param1=value');
      expect(response.options.data).toBe('{}');
    });

  it('replaces path templating in the url if parameters are specified with the "path" location.',
    async(): Promise<void> => {
      pathName = '/example/api/path/{id}';
      parameters = [{
        name: 'id',
        in: 'path',
        required: true,
      }];
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod, parameters },
        configuration,
      );
      const response = await openApiAxiosParamFactory.createParams({ id: 'value' });
      expect(response.options.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(response.url).toBe('/example/api/path/value');
      expect(response.options.data).toBe('{}');
    });

  it('errors when required parameters are not supplied.', async(): Promise<void> => {
    parameters = [{
      name: 'param1',
      in: 'query',
      required: true,
    }];
    openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
      { ...operation, pathName, pathReqMethod, parameters },
      configuration,
    );
    await expect(openApiAxiosParamFactory.createParams({}))
      .rejects.toThrow(Error);
    await expect(openApiAxiosParamFactory.createParams({}))
      .rejects.toThrow('Parameter param1 is required for this operation.');
  });

  it('errors when parameters are used which specify a non supported location.', async(): Promise<void> => {
    parameters = [{
      name: 'param1',
      in: 'cookie',
    }];
    openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
      { ...operation, pathName, pathReqMethod, parameters },
      configuration,
    );
    await expect(openApiAxiosParamFactory.createParams({ param1: 'value' }))
      .rejects.toThrow(Error);
    await expect(openApiAxiosParamFactory.createParams({ param1: 'value' }))
      .rejects.toThrow('Parameters with "in" set to cookie are not supported.');
  });

  it('overrides the configuration\'s baseOptions with the supplied options.',
    async(): Promise<void> => {
      configuration.baseOptions = {
        responseType: 'json',
        headers: { token: 'abcd' },
      };
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod, parameters },
        configuration,
      );
      const response = await openApiAxiosParamFactory.createParams(
        {},
        { responseType: 'blob', headers: { token: 'fghi' }},
      );
      expect(response.options.responseType).toBe('blob');
      expect(response.options.headers?.token).toBe('fghi');
    });

  it('adds a serialized representation of the args in the data field if the operation does not use parameters.',
    async(): Promise<void> => {
      openApiAxiosParamFactory = new OpenApiAxiosParamFactory(
        { ...operation, pathName, pathReqMethod },
        configuration,
      );
      const response = await openApiAxiosParamFactory.createParams({ foo: 'bar' });
      expect(response.options.data).toBe('{"foo":"bar"}');
    });
});
