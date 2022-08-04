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
 * Throws a RequiredError if paramName or paramValue are not set.
 *
 * @param functionName - The name of the function who's parameters are being validated
 * @param paramName - The name of the parameter
 * @param paramValue - The value of the parameter
 */
export function assertParamExists(functionName: string, paramName: string, paramValue: unknown): void {
  if (paramValue === null || paramValue === undefined) {
    throw new RequiredError(
      paramName,
      `Required parameter ${paramName} was null or undefined when calling ${functionName}.`,
    );
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

/**
 * Helper that serializes data into a string if necessary.
 * @param value - The value to be serialized
 * @returns value or a serialized representation of value
 */
export function serializeDataIfNeeded(value: any): string | undefined {
  const isString = typeof value === 'string';
  if (isString && value.length > 0) {
    return value;
  }
  if (!isString && !(typeof value === 'object' && Object.keys(value).length === 0)) {
    return JSON.stringify(value);
  }
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

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
