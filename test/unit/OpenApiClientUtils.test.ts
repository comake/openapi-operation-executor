/* eslint-disable jest/no-commented-out-tests */
import {
  RequiredError,
  isJsonMime,
  serializeDataAsJsonIfNeeded,
  serializeDataAsFormIfNeeded,
  jsonParamsToUrlString,
  escapeRegExp,
} from '../../src/OpenApiClientUtils';

describe('OpenApiClientUtils', (): void => {
  describe('a RequiredError', (): void => {
    it('is an error with name set to RequiredError.', (): void => {
      const error = new RequiredError('exampleField', 'example message');
      expect(error.name).toBe('RequiredError');
      expect(error.field).toBe('exampleField');
      expect(error.message).toBe('example message');
    });
  });

  /**
   * TODO: Add support for username and password security
   */
  // describe('setBasicAuthToObject', (): void => {
  //   let object: any;
  //   beforeEach((): void => {
  //     object = {};
  //   });
  //   it('sets the auth on the object if a username or password is in the configuration.', async(): Promise<void> => {
  //     setBasicAuthToObject(object, { username: 'adlerfaulkner' });
  //     expect(object.auth).toEqual({ username: 'adlerfaulkner', password: undefined });
  //     object = {};
  //     setBasicAuthToObject(object, { password: 'abc123' });
  //     expect(object.auth).toEqual({ username: undefined, password: 'abc123' });
  //     object = {};
  //     setBasicAuthToObject(object, { username: 'adlerfaulkner', password: 'abc123' });
  //     expect(object.auth).toEqual({ username: 'adlerfaulkner', password: 'abc123' });
  //   });
  //   it('does not set the auth on the object if no username or password field exists in the configuration.',
  //     async(): Promise<void> => {
  //       setBasicAuthToObject(object, {});
  //       expect(object.auth).toBeUndefined();
  //     });
  // });

  describe('isJsonMime', (): void => {
    it('returns true if the provided mime conforms to a json mime type, false otherwise.', (): void => {
      expect(isJsonMime('application/json')).toBe(true);
      expect(isJsonMime('application/json; charset=UTF8')).toBe(true);
      expect(isJsonMime('APPLICATION/JSON')).toBe(true);
      expect(isJsonMime('application/vnd.company+json')).toBe(true);
      expect(isJsonMime('application/json-patch+json')).toBe(true);
      expect(isJsonMime('image/jpeg')).toBe(false);
      expect(isJsonMime('text/plain')).toBe(false);
      expect(isJsonMime('json')).toBe(false);
      expect(isJsonMime('foobar')).toBe(false);
    });
  });

  describe('serializeDataAsJsonIfNeeded', (): void => {
    it('returns undefined if no value is supplied.', (): void => {
      expect(serializeDataAsJsonIfNeeded(undefined)).toBeUndefined();
    });
    it('returns undefined if the value is an empty string.', (): void => {
      expect(serializeDataAsJsonIfNeeded('')).toBeUndefined();
    });
    it('returns the value if it is already a string.', (): void => {
      expect(serializeDataAsJsonIfNeeded('already a string')).toBe('already a string');
    });
    it('returns undefined if the value is an empty object.', (): void => {
      expect(serializeDataAsJsonIfNeeded({})).toBeUndefined();
    });
    it('returns a stringified version of the value if it is a non empty object.', (): void => {
      expect(serializeDataAsJsonIfNeeded({ alpha: 'bet' })).toBe('{"alpha":"bet"}');
    });
  });

  describe('serializeDataAsFormIfNeeded', (): void => {
    it('returns undefined if no value is supplied.', (): void => {
      expect(serializeDataAsFormIfNeeded(undefined)).toBeUndefined();
    });
    it('returns undefined if the value is an empty string.', (): void => {
      expect(serializeDataAsFormIfNeeded('')).toBeUndefined();
    });
    it('returns the value if it is already a string.', (): void => {
      expect(serializeDataAsFormIfNeeded('already a string')).toBe('already a string');
    });
    it('returns undefined if the value is an empty object.', (): void => {
      expect(serializeDataAsFormIfNeeded({})).toBeUndefined();
    });
    it('returns the data as FormData if it is a non empty object.', (): void => {
      expect(serializeDataAsFormIfNeeded({ alpha: 'bet' })).toBe('alpha=bet');
    });
  });

  describe('jsonParamsToUrlString', (): void => {
    it('serializes a JSON object into a query parameters string.', (): void => {
      const params = {
        param1: 'value1',
        param2: [ 1, 2 ],
        param3: {
          param4: true,
        },
        param5: [
          { param6: 'value6' },
        ],
      };
      expect(jsonParamsToUrlString(params)).toBe(
        'param1=value1&param2[]=1&param2[]=2&param3[param4]=true&param5[0][param6]=value6',
      );
    });
  });

  describe('escapeRegExp', (): void => {
    it('escapes restricted characters in a string.', (): void => {
      expect(escapeRegExp('[')).toBe('\\[');
      expect(escapeRegExp(']')).toBe('\\]');
      expect(escapeRegExp('.')).toBe('\\.');
      expect(escapeRegExp('*')).toBe('\\*');
      expect(escapeRegExp('+')).toBe('\\+');
      expect(escapeRegExp('?')).toBe('\\?');
      expect(escapeRegExp('^')).toBe('\\^');
      expect(escapeRegExp('$')).toBe('\\$');
      expect(escapeRegExp('{')).toBe('\\{');
      expect(escapeRegExp('}')).toBe('\\}');
      expect(escapeRegExp('(')).toBe('\\(');
      expect(escapeRegExp(')')).toBe('\\)');
      expect(escapeRegExp('|')).toBe('\\|');
    });
  });
});
