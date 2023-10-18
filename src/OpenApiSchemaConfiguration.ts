export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie';

export type BaseParameter = {
  readonly name: string;
  readonly in: ParameterLocation;
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly explode?: boolean;
  readonly schema?: JSONSchema;
  readonly example?: any;
  readonly examples?: Record<string, Reference | Example>;
  readonly content?: Record<string, MediaType>;
  readonly [k: string]: unknown;
};

export interface DereferencedBaseParameter extends BaseParameter {
  readonly schema?: DereferencedJSONSchema;
  readonly examples?: Record<string, Example>;
  readonly content?: Record<string, DereferencedMediaType>;
}

interface PathParameterFields {
  readonly in: 'path';
  readonly required: boolean;
  readonly style?: 'matrix' | 'label' | 'simple';
}

interface QueryParameterFields {
  readonly in: 'query';
  readonly allowEmptyValue?: boolean;
  readonly style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';
  readonly allowReserved?: boolean;
}

interface HeaderParameterFields {
  readonly in: 'header';
  readonly allowEmptyValue?: boolean;
  readonly style?: 'simple';
}

interface CookieParameterFields {
  readonly in: 'cookie';
  readonly allowEmptyValue?: boolean;
  readonly style?: 'form';
}

export type PathParameter = BaseParameter & PathParameterFields;
export type QueryParameter = BaseParameter & QueryParameterFields;
export type HeaderParameter = BaseParameter & HeaderParameterFields;
export type CookieParameter = BaseParameter & CookieParameterFields;

export type DereferencedPathParameter = DereferencedBaseParameter & PathParameterFields;
export type DereferencedQueryParameter = DereferencedBaseParameter & QueryParameterFields;
export type DereferencedHeaderParameter = DereferencedBaseParameter & HeaderParameterFields;
export type DereferencedCookieParameter = DereferencedBaseParameter & CookieParameterFields;

export type Parameter =
| PathParameter
| QueryParameter
| HeaderParameter
| CookieParameter;

export type DereferencedParameter =
| DereferencedPathParameter
| DereferencedQueryParameter
| DereferencedHeaderParameter
| DereferencedCookieParameter;

export type Encoding = {
  readonly contentType: string;
  readonly headers: Record<string, Header | Reference>;
  readonly style: string;
  readonly explode: boolean;
  readonly allowReserved: boolean;
  readonly [k: string]: unknown;
};

export interface DereferencedEncoding extends Encoding {
  readonly headers: Record<string, Header>;
}

export type MediaType = {
  readonly schema?: JSONSchema;
  readonly example?: any;
  readonly examples?: Record<string, Example | Reference>;
  readonly encoding?: Record<string, Encoding>;
  readonly [k: string]: unknown;
};

export interface DereferencedMediaType extends MediaType {
  readonly schema?: DereferencedJSONSchema;
  readonly examples?: Record<string, Example>;
  readonly encoding?: Record<string, DereferencedEncoding>;
}

export type Header = {
  readonly allowEmptyValue?: boolean;
  readonly style?: 'simple';
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly explode?: boolean;
  readonly schema?: JSONSchema;
  readonly example?: any;
  readonly examples?: Record<string, Example | Reference>;
  readonly content?: Record<string, MediaType>;
  readonly [k: string]: unknown;
};

export interface DereferencedHeader extends Header {
  readonly schema?: DereferencedJSONSchema;
  readonly examples?: Record<string, Example>;
  readonly content?: Record<string, DereferencedMediaType>;
}

export interface APIKeySecurityScheme {
  readonly type: 'apiKey';
  readonly name: string;
  readonly in: 'header' | 'query' | 'cookie';
  readonly description?: string;
  readonly [k: string]: unknown;
}

export interface OAuth2SecurityScheme {
  readonly type: 'oauth2';
  readonly flows: OAuthFlows;
  readonly description?: string;
  readonly [k: string]: unknown;
}

export type HTTPSecurityScheme =
 | {
   readonly scheme?: string;
   readonly [k: string]: unknown;
 }
 | {
   readonly scheme?: Record<string, unknown>;
   readonly [k: string]: unknown;
 };

export interface OpenIdConnectSecurityScheme {
  readonly type: 'openIdConnect';
  readonly openIdConnectUrl: string;
  readonly description?: string;
  readonly [k: string]: unknown;
}

export type SecurityScheme =
 | APIKeySecurityScheme
 | HTTPSecurityScheme
 | OAuth2SecurityScheme
 | OpenIdConnectSecurityScheme;

export interface Info {
  readonly title: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: Contact;
  readonly license?: License;
  readonly version: string;
  readonly [k: string]: unknown;
}
export interface Contact {
  readonly name?: string;
  readonly url?: string;
  readonly email?: string;
  readonly [k: string]: unknown;
}
export interface License {
  readonly name: string;
  readonly url?: string;
  readonly [k: string]: unknown;
}
export interface ExternalDocumentation {
  readonly description?: string;
  readonly url: string;
  readonly [k: string]: unknown;
}
export interface Server {
  readonly url: string;
  readonly description?: string;
  readonly variables?: Record<string, ServerVariable>;
  readonly [k: string]: unknown;
}
export interface ServerVariable {
  readonly enum?: readonly string[];
  readonly default: string;
  readonly description?: string;
  readonly [k: string]: unknown;
}
export type SecurityRequirement = Record<string, readonly string[]>;

export interface Tag {
  readonly name: string;
  readonly description?: string;
  readonly externalDocs?: ExternalDocumentation;
  readonly [k: string]: unknown;
}
export type Paths = Record<string, PathItem>;

export type DereferencedPaths = Record<string, DereferencedPathItem>;

export interface PathItem {
  readonly $ref?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly servers?: readonly Server[];
  readonly parameters?: readonly (Parameter | Reference)[];
  readonly get?: Operation;
  readonly post?: Operation;
  readonly patch?: Operation;
  readonly put?: Operation;
  readonly delete?: Operation;
  readonly options?: Operation;
  readonly head?: Operation;
  readonly trace?: Operation;
}

export interface DereferencedPathItem {
  readonly summary?: string;
  readonly description?: string;
  readonly servers?: readonly Server[];
  readonly parameters?: readonly DereferencedParameter[];
  readonly get?: DereferencedOperation;
  readonly post?: DereferencedOperation;
  readonly patch?: DereferencedOperation;
  readonly put?: DereferencedOperation;
  readonly delete?: DereferencedOperation;
  readonly options?: DereferencedOperation;
  readonly head?: DereferencedOperation;
  readonly trace?: DereferencedOperation;
}

export type Reference = {
  readonly $ref: string;
  readonly summary?: string;
  readonly description?: string;
};

export interface Operation {
  readonly tags?: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly externalDocs?: ExternalDocumentation;
  readonly operationId?: string;
  readonly parameters?: readonly (Parameter | Reference)[];
  readonly requestBody?: RequestBody | Reference;
  readonly responses: Responses;
  readonly callbacks?: Record<string, Callback>;
  readonly deprecated?: boolean;
  readonly security?: readonly SecurityRequirement[];
  readonly servers?: readonly Server[];
  readonly [k: string]: unknown;
}

export interface DereferencedOperation extends Operation {
  readonly parameters?: readonly DereferencedParameter[];
  readonly requestBody?: DereferencedRequestBody;
  readonly responses: DereferencedResponses;
  readonly callbacks?: Record<string, DereferencedCallback>;
}

export interface RequestBody {
  readonly description?: string;
  readonly content: Record<string, MediaType>;
  readonly required?: boolean;
  readonly [k: string]: unknown;
}

export interface DereferencedRequestBody extends RequestBody {
  readonly content: Record<string, DereferencedMediaType>;
}

export type Responses = Readonly<Record<string, Response | Reference>>;
export type DereferencedResponses = Readonly<Record<string, DereferencedResponse>>;

export interface Response {
  readonly description: string;
  readonly headers?: Record<string, Header | Reference>;
  readonly content?: Record<string, MediaType>;
  readonly links?: Record<string, Link | Reference>;
  readonly [k: string]: unknown;
}

export interface DereferencedResponse extends Response {
  readonly headers?: Record<string, DereferencedHeader>;
  readonly content?: Record<string, DereferencedMediaType>;
  readonly links?: Record<string, Link>;
}

export interface Link {
  readonly operationId?: string;
  readonly operationRef?: string;
  readonly parameters?: Record<string, unknown>;
  readonly requestBody?: unknown;
  readonly description?: string;
  readonly server?: Server;
  readonly [k: string]: unknown;
}

export type Callback = Record<string, PathItem>;

export type DereferencedCallback = Record<string, DereferencedPathItem>;

export interface Components {
  readonly schemas?: Record<string, JSONSchema | Reference>;
  readonly responses?: Record<string, Reference | Response>;
  readonly parameters?: Record<string, Reference | Parameter>;
  readonly examples?: Record<string, Reference | Example>;
  readonly requestBodies?: Record<string, Reference | RequestBody>;
  readonly headers?: Record<string, Reference | Header>;
  readonly securitySchemes?: Record<string, Reference | SecurityScheme>;
  readonly links?: Record<string, Reference | Link>;
  readonly callbacks?: Record<string, Reference | Callback>;
  readonly [k: string]: unknown;
}

export interface DereferencedComponents {
  readonly schemas?: Record<string, DereferencedJSONSchema>;
  readonly responses?: Record<string, DereferencedResponse>;
  readonly parameters?: Record<string, DereferencedParameter>;
  readonly examples?: Record<string, Example>;
  readonly requestBodies?: Record<string, DereferencedRequestBody>;
  readonly headers?: Record<string, DereferencedHeader>;
  readonly securitySchemes?: Record<string, SecurityScheme>;
  readonly links?: Record<string, Link>;
  readonly callbacks?: Record<string, DereferencedCallback>;
  readonly [k: string]: unknown;
}

export interface JSONSchema {
  readonly title?: string;
  readonly multipleOf?: number;
  readonly maximum?: number;
  readonly exclusiveMaximum?: number;
  readonly minimum?: number;
  readonly exclusiveMinimum?: number;
  readonly maxLength?: number;
  readonly minLength?: number;
  readonly pattern?: string;
  readonly maxItems?: number;
  readonly minItems?: number;
  readonly uniqueItems?: boolean;
  readonly maxProperties?: number;
  readonly minProperties?: number;
  readonly required?: readonly string[];
  readonly enum?: readonly unknown[];
  readonly type?: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string' | 'null';
  readonly not?: JSONSchema | Reference;
  readonly allOf?: readonly (JSONSchema | Reference)[];
  readonly oneOf?: readonly (JSONSchema | Reference)[];
  readonly anyOf?: readonly (JSONSchema | Reference)[];
  readonly items?: JSONSchema | Reference;
  readonly properties?: Record<string, JSONSchema | Reference>;
  readonly patternProperties?: Record<string, JSONSchema | Reference>;
  readonly additionalProperties?: JSONSchema | Reference | boolean;
  readonly description?: string;
  readonly format?: string;
  readonly default?: unknown;
  readonly nullable?: boolean;
  readonly discriminator?: Discriminator;
  readonly readOnly?: boolean;
  readonly writeOnly?: boolean;
  readonly example?: unknown;
  readonly externalDocs?: ExternalDocumentation;
  readonly deprecated?: boolean;
  readonly xml?: XML;
  readonly [k: string]: unknown;
}

export interface DereferencedJSONSchema extends JSONSchema {
  readonly not?: DereferencedJSONSchema;
  readonly allOf?: readonly DereferencedJSONSchema[];
  readonly oneOf?: readonly DereferencedJSONSchema[];
  readonly anyOf?: readonly DereferencedJSONSchema[];
  readonly items?: DereferencedJSONSchema;
  readonly properties?: Record<string, DereferencedJSONSchema>;
  readonly patternProperties?: Record<string, DereferencedJSONSchema>;
  readonly additionalProperties?: DereferencedJSONSchema | boolean;
}

export interface Discriminator {
  readonly propertyName: string;
  readonly mapping?: Record<string, string>;
  readonly [k: string]: unknown;
}

export interface XML {
  readonly name?: string;
  readonly namespace?: string;
  readonly prefix?: string;
  readonly attribute?: boolean;
  readonly wrapped?: boolean;
  readonly [k: string]: unknown;
}

export interface Example {
  readonly summary?: string;
  readonly description?: string;
  readonly value?: unknown;
  readonly externalValue?: string;
  readonly [k: string]: unknown;
}

export interface OAuthFlows {
  readonly implicit?: ImplicitOAuthFlow;
  readonly password?: PasswordOAuthFlow;
  readonly clientCredentials?: ClientCredentialsFlow;
  readonly authorizationCode?: AuthorizationCodeOAuthFlow;
  readonly [k: string]: unknown;
}

export interface ImplicitOAuthFlow {
  readonly authorizationUrl: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
  readonly [k: string]: unknown;
}

export interface PasswordOAuthFlow {
  readonly tokenUrl: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
  readonly [k: string]: unknown;
}

export interface ClientCredentialsFlow {
  readonly tokenUrl: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
  readonly [k: string]: unknown;
}

export interface AuthorizationCodeOAuthFlow {
  readonly authorizationUrl: string;
  readonly tokenUrl: string;
  readonly refreshUrl?: string;
  readonly scopes: Record<string, string>;
  readonly [k: string]: unknown;
}

// Validation schema for OpenAPI Specification 3.0.X.
export interface OpenApi {
  readonly openapi: string;
  readonly info: Info;
  readonly externalDocs?: ExternalDocumentation;
  readonly servers?: readonly Server[];
  readonly security?: readonly SecurityRequirement[];
  readonly tags?: readonly Tag[];
  readonly paths: Paths;
  readonly components?: Components;
  readonly [k: string]: unknown;
}

export interface DereferencedOpenApi extends OpenApi {
  readonly paths: DereferencedPaths;
  readonly components?: DereferencedComponents;
}
