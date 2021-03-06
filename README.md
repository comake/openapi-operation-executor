[![npm version](https://badge.fury.io/js/@comake%2Fopenapi-operation-executor.svg)](https://badge.fury.io/js/@comake%2Fopenapi-operation-executor) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# OpenAPI Operation Executor

This library provides a helper method to perform operations (web requests) specified by an [OpenAPI spec](https://www.openapis.org/).

Every operation in an OpenAPI spec has a unique field used to identify it, called an operationId. The `executeOperation` method of this library allows a developer to send properly formatted requests to an API by supplying an OpenAPI spec (as JSON), the operationId of the operation they want to perform, and the proper arguments for that operation. This makes it so that the developer does not have to take the time to generate an SDK out of an OpenAPI spec every time they need to work with a new spec or every time one changes (for example using the [openapi npm package](https://github.com/openapi/openapi)). Not having an SDK installed per API they need to interact with also has the effect of reducing their application's bundle size.

## Installation

```shell
npm install @comake/openapi-operation-executor
```

or
```shell
yarn add @comake/openapi-operation-executor
```

## Usage

Using ECMAScript Modules in Typescript:
```js
import { OpenApiOperationExecutor } from '@comake/openapi-operation-executor';
import type { OpenApi } from '@comake/openapi-operation-executor';

// Import your OpenAPI spec as a JSON module (requires the resolveJsonModule flag in typescript).
// Alternatively, you could read a YAML file uing fs and use the yaml npm module to convert to JSON.
import openApiSpec from './path/to/openapi-spec.json';

// Initialize the OpenAPI Operation Executor
const executor = new OpenApiOperationExecutor();
await executor.setOpenapiSpec(openApiSpec as OpenApi)

// Execute the operation and get the response
const response = await executor.executeOperation(
  'operationId',
  { accessToken: 'YOUR_ACCESS_TOKEN' },
  { arg: 'arg-value' },
);
```

## API

#### executeOperation

The `executeOperation` method of an `OpenApiOperationExecutor` instance sends a properly formatted web request to the API described in the provided OpenAPI spec (as JSON). This library uses [axios](https://github.com/axios/axios) to send web requests.

Requests automatically use the method (GET, POST, etc.) that the OpenAPI operation is nested under in the provided spec.

?????? This library currently only supports sending JSON data in request bodies. It automatically adds the header `Content-Type: application/json` to every request it sends.

**Parameters**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `operationId` | `string` | Required | The operationId of the operation to perform. |
| `configuration` | `object` | Required | An `OpenApiClientConfiguration` object.  |
| `args` |  `any` |   | Data conformant to the specified `requestBody` of the OpenAPI operation being performed to be send to the API as the body of the request. Will be serialized according to the `Content-Type` header which is set to `application/json` right now. |
| `options` | `object` |   | An `AxiosRequestConfig` object. See [the axios API documentation](https://github.com/axios/axios#request-config) for reference. |

**Configuration**

These are the available config options for making requests (in Typescript):

```ts
export interface OpenApiClientConfiguration {
  /**
  * Parameter for apiKey security
  * @param name - security name
  */
  apiKey?: string
  | Promise<string>
  | ((name: string) => string) | ((name: string) => Promise<string>);
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
}
```

?????? This library currently only supports oAuth2 security via an `accessToken` or `apikey` authorization through a header or a query parameter. It automatically adds the header `Authorization: Bearer ACCESS_TOKEN` to requests if an `oAuth` security scheme is specified in the OpenApi spec. It automatically adds the `apikey` as a header or query parameter if an `apiKey` security scheme is specified in the OpenApi spec.

**Return value**

`executeOperation` returns a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) which resolves to an [`AxiosResponse`](https://github.com/axios/axios#response-schema).

Access the response using Promise syntax:
```ts
executor.executeOperation('operationId', { accessToken: 'ACCESS_TOKEN' })
  .then(response => {
    // Do something with the response...
  })
  .catch(error => {
    // Handle an error...
  });
```

Access the response using `async`/ `await` syntax:
```ts
const response = await executor.executeOperation('operationId', { accessToken: 'ACCESS_TOKEN' });
```

These are the fields exepcted in an [`AxiosResponse`](https://github.com/axios/axios#response-schema) (in Typescript):
```ts
export interface AxiosResponse<T = any, D = any>  {
  // The response that was provided by the server
  data: T;
  // The HTTP status code from the server response
  status: number;
  // The HTTP status message from the server response
  statusText: string;
  // `headers` the HTTP headers that the server responded with
  // All header names are lowercase and can be accessed using the bracket notation.
  // Example: `response.headers['content-type']`
  headers: AxiosResponseHeaders;
  // The config that was provided to `axios` for the request
  config: AxiosRequestConfig<D>;
  // `request` is the request that generated this response
  // It is the last ClientRequest instance in node.js (in redirects)
  // and an XMLHttpRequest instance in the browser
  request?: any;
}
```

## TODO
- [ ] Add support for server variables when constructing the basePath.
- [ ] Add support for authentication methods other than oAuth access tokens and header or query param apikeys (eg. username & password, and cookie apikey).
- [ ] Add support for configuring the Content-Type header
- [ ] Add support for constructing FormData for execution environments that do not support the FormData class
- [ ] Add support for cookie parameters
