import ts from 'typescript';
import { OpenAPIV3 } from 'openapi-types';
export type ParsedJsDocTags = {
    param: {
        [key: string]: string;
    };
    path: string;
    method: string;
    description: string;
};
export type ReducerFunction = (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;
export declare const addDescription: (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;
export declare const addPostBodyParameters: (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;
export declare const addResponseSchema: (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;
