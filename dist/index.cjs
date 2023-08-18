#!/usr/bin/env node
'use strict';

var path = require('path');
var fs = require('fs');
var commander = require('commander');
var ts = require('typescript');
var lodash = require('lodash');

class TypesParser {
    constructor(typesDirectoryPath) {
        this.typesDirectoryPath = typesDirectoryPath;
        this.typesFiles = fs.
            readdirSync(path.join(__dirname, typesDirectoryPath)).
            filter(f => f.endsWith(".ts")).
            filter(f => f !== "index.ts");
        this.reducerFuncs = [];
        this.openAPIDoc = {};
    }
    getOpenAPIDoc() {
        return this.openAPIDoc;
    }
    loadBaseOpenAPIDoc(apiDoc) {
        this.openAPIDoc = apiDoc;
    }
    loadReducerFunctions(reducerFuncs) {
        if (Array.isArray(reducerFuncs)) {
            this.reducerFuncs = this.reducerFuncs.concat(reducerFuncs);
        }
        else {
            this.reducerFuncs.push(reducerFuncs);
        }
    }
    parseTypeFiles() {
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
    parseTypeFile(sourceFile, typeChecker) {
        for (const statement of sourceFile.statements) {
            if (ts.isInterfaceDeclaration(statement)) {
                this.parseInterface(statement, sourceFile, typeChecker);
            }
        }
    }
    parseInterface(interfaceDeclaration, sourceFile, typeChecker) {
        if (ts.isInterfaceDeclaration(interfaceDeclaration)) {
            const type = typeChecker.getTypeAtLocation(interfaceDeclaration);
            const parsedJsDocTags = this.parseCommentsToObject(interfaceDeclaration, typeChecker);
            for (const f of this.reducerFuncs) {
                this.openAPIDoc = f(this.openAPIDoc)(interfaceDeclaration, type, typeChecker, parsedJsDocTags);
            }
        }
    }
    parseCommentsToObject(interfaceDeclaration, typeChecker) {
        // for some reason, the official ts schema doesn't recognize that the name property exists on a ts.Statement
        // @ts-ignore
        const symbol = typeChecker.getSymbolAtLocation(interfaceDeclaration.name);
        const jsDocTagsInfo = symbol.getJsDocTags(typeChecker);
        const parsedJsDocTags = { param: {} };
        for (const tag of jsDocTagsInfo) {
            if (tag.name === "param") {
                const paramName = tag.text?.slice(0, 1)[0].text || "";
                const paramDescription = tag.text?.slice(1).map(t => t.text).join("") || "";
                parsedJsDocTags["param"][paramName] = paramDescription;
            }
            else {
                // @ts-ignore
                parsedJsDocTags[tag.name] = tag.text?.map(t => t.text).join("");
            }
        }
        return parsedJsDocTags;
    }
}

const addDescription = (openAPIDoc) => (interfaceDeclaration, type, typeChecker, parsedJsDocTags) => {
    const { description, path, method } = parsedJsDocTags;
    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.endsWith("Request"))
        return openAPIDoc;
    if (!path || !method || !description) {
        return openAPIDoc;
    }
    lodash.merge(openAPIDoc, {
        paths: {
            [path]: {
                [method.toLowerCase()]: {
                    description
                }
            }
        }
    });
    return openAPIDoc;
};
const addPostBodyParameters = (openAPIDoc) => (interfaceDeclaration, type, typeChecker, parsedJsDocTags) => {
    // for some reason, the official ts schema doesn't recognize that the name property exists on a ts.Statement
    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.endsWith("Request"))
        return openAPIDoc;
    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.includes("Post"))
        return openAPIDoc;
    const { path, method } = parsedJsDocTags;
    if (!path || !method) {
        return openAPIDoc;
    }
    function customizer(obj, src) {
        if (Array.isArray(obj)) {
            return obj.concat(src);
        }
    }
    for (const prop of type.getProperties()) {
        // @ts-ignore
        const isRequired = prop.declarations?.every(d => d.questionToken === undefined);
        // @ts-ignore
        const propType = typeChecker.getTypeAtLocation(prop.valueDeclaration).intrinsicName;
        let comment = ts.displayPartsToString(prop.getDocumentationComment(typeChecker));
        if (parsedJsDocTags.param[prop.name])
            comment = parsedJsDocTags.param[prop.name];
        // @ts-ignore
        const childProperties = prop.valueDeclaration.type.members?.map(member => {
            // @ts-ignore
            const childPropType = typeChecker.getTypeAtLocation(member).intrinsicName;
            const isRequired = member.symbol.declarations?.every((d) => d.questionToken === undefined);
            let childComment = ts.displayPartsToString(member.symbol.getDocumentationComment(typeChecker));
            if (parsedJsDocTags.param[member.name])
                childComment = parsedJsDocTags.param[member.name];
            return [
                member.name.escapedText,
                {
                    name: member.name.escapedText,
                    type: childPropType,
                    ...(isRequired ? { required: true } : {}),
                    ...(childComment.length > 0 ? { description: childComment } : {})
                }
            ];
        }) || [];
        lodash.mergeWith(openAPIDoc, {
            paths: {
                [path]: {
                    [method.toLowerCase()]: {
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        // @ts-ignore
                                        "$id": interfaceDeclaration.name.escapedText,
                                        type: "object",
                                        properties: {
                                            [prop.name]: {
                                                type: propType,
                                                ...(isRequired ? { required: true } : {}),
                                                ...(comment.length > 0 ? { description: comment } : {}),
                                                ...(childProperties.length > 0 ? { properties: Object.fromEntries(childProperties) } : {})
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }, customizer);
    }
    return openAPIDoc;
};
const addResponseSchema = (openAPIDoc) => (interfaceDeclaration, type, typeChecker, parsedJsDocTags) => {
    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.endsWith("Response"))
        return openAPIDoc;
    const { description, path, method } = parsedJsDocTags;
    if (!path || !method) {
        return openAPIDoc;
    }
    for (const prop of type.getProperties()) {
        // @ts-ignore
        let comment = ts.displayPartsToString(prop.getDocumentationComment(typeChecker));
        if (parsedJsDocTags.param[prop.name])
            comment = parsedJsDocTags.param[prop.name];
        // @ts-ignore
        const propType = typeChecker.getTypeAtLocation(prop.valueDeclaration).intrinsicName;
        // @ts-ignore
        const isRequired = prop.declarations?.every(d => d.questionToken === undefined);
        // @ts-ignore
        const childProperties = prop.valueDeclaration.type.members?.map(member => {
            // @ts-ignore
            const childPropType = typeChecker.getTypeAtLocation(member).intrinsicName;
            const isRequired = member.symbol.declarations?.every((d) => d.questionToken === undefined);
            let childComment = ts.displayPartsToString(member.symbol.getDocumentationComment(typeChecker));
            if (parsedJsDocTags.param[member.name])
                childComment = parsedJsDocTags.param[member.name];
            return [
                member.name.escapedText,
                {
                    name: member.name.escapedText,
                    type: childPropType,
                    ...(isRequired ? { required: true } : {}),
                    ...(childComment.length > 0 ? { description: childComment } : {})
                }
            ];
        }) || [];
        lodash.merge(openAPIDoc, {
            paths: {
                [path]: {
                    [method.toLowerCase()]: {
                        responses: {
                            "200": {
                                description,
                                content: {
                                    "application/json": {
                                        schema: {
                                            // @ts-ignore
                                            "$id": interfaceDeclaration.name.escapedText,
                                            type: "object",
                                            properties: {
                                                [prop.name]: {
                                                    type: propType,
                                                    ...(isRequired ? { required: true } : {}),
                                                    ...(comment.length > 0 ? { description: comment } : {}),
                                                    ...(childProperties.length > 0 ? { properties: Object.fromEntries(childProperties) } : {})
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    return openAPIDoc;
};

var ReducerFunctions = /*#__PURE__*/Object.freeze({
    __proto__: null,
    addDescription: addDescription,
    addPostBodyParameters: addPostBodyParameters,
    addResponseSchema: addResponseSchema
});

commander.program
    .option('-t, --types-directory <typesDirectory>', 'Types directory path')
    .option('-b, --base-openapi-doc <baseOpenApiDoc>', 'Base OpenAPI doc path')
    .option('-o, --output <output>', 'Output path')
    .parse(process.argv);
const options = commander.program.opts();
const typesDirectoryPath = options.typesDirectory;
const baseOpenApiDoc = options.baseOpenapiDoc;
const outputPath = options.output || path.join(__dirname, "./openapi.json");
if (!fs.existsSync(typesDirectoryPath)) {
    console.error(`Types directory ${typesDirectoryPath} does not exist`);
    process.exit(1);
}
const typesParser = new TypesParser(typesDirectoryPath);
if (baseOpenApiDoc && fs.existsSync(baseOpenApiDoc)) {
    typesParser.loadBaseOpenAPIDoc(JSON.parse(fs.readFileSync(path.join(__dirname, baseOpenApiDoc), 'utf8')));
}
for (const f of Object.values(ReducerFunctions)) {
    typesParser.loadReducerFunctions(f);
}
typesParser.parseTypeFiles();
fs.writeFileSync(outputPath, JSON.stringify(typesParser.getOpenAPIDoc(), null, 2));
