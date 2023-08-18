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
type ReducerFunction = (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;
export default class TypesParser {
    private typesDirectoryPath;
    private typesFiles;
    private reducerFuncs;
    private openAPIDoc;
    constructor(typesDirectoryPath: string);
    getOpenAPIDoc(): OpenAPIV3.Document<{}>;
    loadBaseOpenAPIDoc(apiDoc: OpenAPIV3.Document): void;
    loadReducerFunctions(reducerFuncs: ReducerFunction[] | ReducerFunction): void;
    parseTypeFiles(): void;
    private parseTypeFile;
    private parseInterface;
    private parseCommentsToObject;
}
export {};
