import path from 'path';
import fs from 'fs';

import ts from 'typescript'
import { OpenAPIV3 } from 'openapi-types';

export type ParsedJsDocTags = {
    param: {[key: string]: string};
    path: string;
    method: string;
    description: string;
}

type ReducerFunction = (openAPIDoc: OpenAPIV3.Document)
    => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;

export default class TypesParser {
    private typesDirectoryPath: string;
    private typesFiles: string[];
    private reducerFuncs: ReducerFunction[];
    private openAPIDoc: OpenAPIV3.Document;

    constructor(typesDirectoryPath: string) {
        this.typesDirectoryPath = typesDirectoryPath;
        this.typesFiles = fs.
            readdirSync(path.join(__dirname, typesDirectoryPath)).
            filter(f => f.endsWith(".ts")).
            filter(f => f !== "index.ts");

        this.reducerFuncs = [];
        this.openAPIDoc = {} as OpenAPIV3.Document;
    }

    public getOpenAPIDoc() {
        return this.openAPIDoc
    }

    public loadBaseOpenAPIDoc(apiDoc: OpenAPIV3.Document) {
        this.openAPIDoc = apiDoc;
    }

    public loadReducerFunctions(reducerFuncs: ReducerFunction[] | ReducerFunction ) {
        if (Array.isArray(reducerFuncs)) {
            this.reducerFuncs = this.reducerFuncs.concat(reducerFuncs);
        } else {
            this.reducerFuncs.push(reducerFuncs);
        }
    }

    public parseTypeFiles() {
        for (const f of this.typesFiles) {
            const mainEntryPoint = path.join(__dirname, `${this.typesDirectoryPath}/${f}`);
            const program = ts.createProgram([mainEntryPoint], {});
            const typeChecker = program.getTypeChecker();
            const sourceFile = program.getSourceFile(mainEntryPoint);

            if (!sourceFile) {
                throw new Error(`Could not find source file: ${mainEntryPoint}`);
            }

            this.parseTypeFile(sourceFile, typeChecker);
        }
    }

    private parseTypeFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
        for (const statement of sourceFile.statements) {
            if (ts.isInterfaceDeclaration(statement)) {
                this.parseInterface(statement, sourceFile, typeChecker);
            }
        }
    }

    private parseInterface(interfaceDeclaration: ts.Statement, sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
        if (ts.isInterfaceDeclaration(interfaceDeclaration)) {
            const type = typeChecker.getTypeAtLocation(interfaceDeclaration);
            const parsedJsDocTags = this.parseCommentsToObject(interfaceDeclaration, typeChecker);

            for (const f of this.reducerFuncs) {
                this.openAPIDoc = f(this.openAPIDoc)(interfaceDeclaration, type, typeChecker, parsedJsDocTags);
            }
        }
    }

    private parseCommentsToObject(interfaceDeclaration: ts.Statement, typeChecker: ts.TypeChecker): ParsedJsDocTags {
        // for some reason, the official ts schema doesn't recognize that the name property exists on a ts.Statement
        // @ts-ignore
        const symbol = typeChecker.getSymbolAtLocation(interfaceDeclaration.name) as ts.Symbol;
        const jsDocTagsInfo = symbol.getJsDocTags(typeChecker);
        const parsedJsDocTags = { param: {}} as ParsedJsDocTags;

        for (const tag of jsDocTagsInfo) {
            if (tag.name === "param") {
                const paramName = tag.text?.slice(0,1)[0].text || "";
                const paramDescription = tag.text?.slice(1).map(t => t.text).join("") || "";
                parsedJsDocTags["param"][paramName] = paramDescription;
            } else {
                // @ts-ignore
                parsedJsDocTags[tag.name] = tag.text?.map(t => t.text).join("");
            }
        }

        return parsedJsDocTags;
    }

}