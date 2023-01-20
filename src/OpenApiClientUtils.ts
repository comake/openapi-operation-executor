/* eslint-disable require-unicode-regexp, no-div-regex, @typescript-eslint/naming-convention */
import crypto from 'crypto';
import type {
  DereferencedParameter,
  DereferencedResponses,
  DereferencedJSONSchema,
} from './OpenApiSchemaConfiguration';

export type PrimitiveJSONValue =
| string
| number
| boolean;

export type NestedJSONValue =
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
| {[x: string]: JSONValue }
| JSONValue[];

export type JSONValue =
  | PrimitiveJSONValue
  | NestedJSONValue;

/**
 * Defines a new error type signifying that a field is required.
 */
export class RequiredError extends Error {
  public readonly name: 'RequiredError' = 'RequiredError';

  public constructor(public field: string, msg?: string) {
    super(msg);
  }
}

/**
 * TODO: Add support for username and password security
 * Sets the auth field of an object to the auth information of an {@link OpenApiClientConfiguration}.
 *
 * @param object - The object
 * @param configuration - The OpenApiClientConfiguration
 */
// export function setBasicAuthToObject(object: any, configuration?: OpenApiClientConfiguration): void {
//   if (configuration && (configuration.username ?? configuration.password)) {
//     object.auth = { username: configuration.username, password: configuration.password };
//   }
// }

/**
 * Check if the given MIME is a JSON MIME.
 * JSON MIME examples:
 *   application/json
 *   application/json; charset=UTF8
 *   APPLICATION/JSON
 *   application/vnd.company+json
 * @param mime - MIME (Multipurpose Internet Mail Extensions)
 * @returns True if the given MIME is JSON, false otherwise.
 */
export function isJsonMime(mime: string): boolean {
  const jsonMime = /^(application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(;.*)?$/iu;
  return mime !== null && (jsonMime.test(mime) || mime.toLowerCase() === 'application/json-patch+json');
}

function arrayOrObjectParamToUrlString(
  paramName: string,
  paramValue: NestedJSONValue,
  paramIndex: number,
  parentIsArray: boolean,
  parentKeys: (string | number)[],
): string {
  if (parentIsArray) {
    parentKeys.push(paramIndex);
  } else {
    parentKeys.push(paramName);
  }
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return jsonParamsToUrlString(paramValue, parentKeys);
}

function nonArrayOrObjectParamToUrlString(
  paramName: string,
  paramValue: PrimitiveJSONValue,
  paramsIsArray: boolean,
  parentKeys: (string | number)[],
): string {
  let paramKey;
  if (parentKeys.length > 0) {
    const keys = paramsIsArray ? parentKeys : [ ...parentKeys, paramName ];
    paramKey = `${keys[0]}${keys.slice(1).map((key): string => `[${key}]`).join('')}`;
  } else {
    paramKey = paramName;
  }

  const encodedParamValue = encodeURIComponent(paramValue);
  if (paramsIsArray) {
    return `${paramKey}[]=${encodedParamValue}`;
  }
  return `${paramKey}=${encodedParamValue}`;
}

export function jsonParamsToUrlString(params: NestedJSONValue, parentKeys: (string | number)[] = []): string {
  const paramsIsArray = Array.isArray(params);
  const paramStrings = Object.keys(params).map((paramName, i): string => {
    const paramValue = (params as Record<string, JSONValue>)[paramName];
    if (typeof paramValue === 'object') {
      return arrayOrObjectParamToUrlString(paramName, paramValue, i, paramsIsArray, parentKeys);
    }
    return nonArrayOrObjectParamToUrlString(
      paramName,
      paramValue,
      paramsIsArray,
      parentKeys,
    );
  });

  parentKeys.pop();
  return paramStrings.join('&');
}

/**
 * Helper that serializes data into a JSON encoded string if necessary.
 * @param value - The value to be serialized
 * @returns value or a serialized representation of value
 */
export function serializeDataAsJsonIfNeeded(value: any): string | undefined {
  const isString = typeof value === 'string';
  if (isString && value.length > 0) {
    return value;
  }
  if (!isString && !(typeof value === 'object' && Object.keys(value).length === 0)) {
    return JSON.stringify(value);
  }
}

/**
 * Helper that serializes data into a url encoded string if necessary.
 * @param value - The value to be serialized
 * @returns value or a serialized representation of value
 */
export function serializeDataAsFormIfNeeded(data: any): string | undefined {
  const isString = typeof data === 'string';
  if (isString && data.length > 0) {
    return data;
  }
  if (data && !isString && !(typeof data === 'object' && Object.keys(data).length === 0)) {
    return jsonParamsToUrlString(data);
  }
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function base64URLEncode(str: Buffer): string {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function sha256(buffer: string): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}

export const securityStageOperationSecuritySchemes = {
  basic: {
    type: 'http',
    scheme: 'basic',
  },
};

export const clientCredentialsTokenOperationAndPathInfo = {
  pathReqMethod: 'POST',
  operationId: 'ClientCredentialsOperation',
  security: [{ basic: []}],
  requestBody: {
    content: {
      'application/x-www-form-urlencoded': {
        schema: {
          type: 'object',
          properties: {
            grant_type: {
              type: 'string',
              description: 'The grant type.',
            },
            scope: {
              description: 'The Oauth scopes requested from the provider',
            },
          },
        } as DereferencedJSONSchema,
      },
    },
  },
  responses: {
    200: {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              scope: { type: 'string' },
              expires_in: { type: 'integer' },
              token_type: {
                type: 'string',
                enum: [ 'Bearer', 'DPoP', 'N_A' ],
              },
            },
          },
        },
      },
    },
  } as DereferencedResponses,
};

export const pkceOauthOperationAndPathInfo = {
  pathReqMethod: 'POST',
  operationId: 'PkcaOauth',
  parameters: [
    {
      description: 'The code acquired by directing users to the authorizationUrl',
      in: 'query',
      name: 'code',
      required: true,
      schema: {
        type: 'string',
      },
    },
    {
      description: `The grant type, which must be authorization_code for completing
      a code flow or refresh_token for using a refresh token to get a new access token.`,
      in: 'query',
      name: 'grant_type',
      required: true,
      schema: {
        type: 'string',
      },
    },
    {
      description: `A unique, long-lived token that can be used to request new
      short-lived access tokens without direct interaction from a user in your app.`,
      in: 'query',
      name: 'refresh_token',
      required: false,
      schema: {
        type: 'string',
      },
    },
    {
      description: `If credentials are passed in POST parameters, this parameter
      should be present and should be the app's client_id.`,
      in: 'query',
      name: 'client_id',
      required: false,
      schema: {
        type: 'string',
      },
    },
    {
      description: `If credentials are passed in POST parameters, this parameter
      should be present and should be the app's secret.`,
      in: 'query',
      name: 'client_secret',
      required: false,
      schema: {
        type: 'string',
      },
    },
    {
      description: `The redirect URI used to receive the authorization code from
      the authorizationUrl, if provided. Only used to validate it matches the redirect
      URI supplied to the authorizationUrl for the current authorization code.
      It is not used to redirect again.`,
      in: 'query',
      name: 'redirect_uri',
      required: false,
      schema: {
        type: 'string',
      },
    },
    {
      description: 'The client-generated string used to verify the encrypted code_challenge.',
      in: 'query',
      name: 'code_verifier',
      required: false,
      schema: {
        minLength: 43,
        maxLength: 128,
        type: 'string',
      },
    },
  ] as DereferencedParameter[],
  responses: {
    200: {
      description: 'Successful operation',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              access_token: { type: 'string' },
              scope: { type: 'string' },
              expires_in: { type: 'integer' },
              token_type: {
                type: 'string',
                enum: [ 'Bearer', 'DPoP', 'N_A' ],
              },
              id_token: { type: 'string' },
            },
          },
        },
      },
    },
  } as DereferencedResponses,
};

