import merge from 'lodash/merge';
import mergeWith from 'lodash/mergeWith';

import ts from 'typescript';
import { OpenAPIV3 } from 'openapi-types';

// declare namespace ts {
//     interface Statement {
//         name: ts.Identifier;
//     }
// }

export type ParsedJsDocTags = {
    param: {[key: string]: string};
    path: string;
    method: string;
    description: string;
}

export type ReducerFunction = (openAPIDoc: OpenAPIV3.Document)
    => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags) => OpenAPIV3.Document;

export const addDescription = (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags): OpenAPIV3.Document => {
    const { description, path, method } = parsedJsDocTags;

    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.endsWith("Request")) return openAPIDoc;

    if (!path || !method || !description) {
        return openAPIDoc;
    }

    merge(openAPIDoc, {
        paths: {
            [path]: {
                [method.toLowerCase()]: {
                    description
                }
            }
        }
    })

    return openAPIDoc
}

export const addPostBodyParameters = (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags): OpenAPIV3.Document => {
    // for some reason, the official ts schema doesn't recognize that the name property exists on a ts.Statement

    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.endsWith("Request")) return openAPIDoc;
    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.includes("Post")) return openAPIDoc;

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
        const propType = typeChecker.getTypeAtLocation(prop.valueDeclaration!).intrinsicName;

        let comment = ts.displayPartsToString(prop.getDocumentationComment(typeChecker));
        if (parsedJsDocTags.param[prop.name]) comment = parsedJsDocTags.param[prop.name];

        // @ts-ignore
        const childProperties = prop.valueDeclaration.type.members?.map(member => {
            // @ts-ignore
            const childPropType = typeChecker.getTypeAtLocation(member).intrinsicName;
            const isRequired = member.symbol.declarations?.every(d => d.questionToken === undefined);

            let childComment = ts.displayPartsToString(member.symbol.getDocumentationComment(typeChecker));
            if (parsedJsDocTags.param[member.name]) childComment = parsedJsDocTags.param[member.name];

            return [
                member.name.escapedText,
                {
                    name: member.name.escapedText,
                    type: childPropType,
                    ...(isRequired ? { required: true } : {}),
                    ...(childComment.length > 0 ? { description: childComment } : {})
                }
            ]
        }) || [];

        mergeWith(openAPIDoc, {
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
                                                ...(comment.length > 0 ? { description: comment} : {}),
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
        }, customizer)
    }

    return openAPIDoc;
}


export const addResponseSchema = (openAPIDoc: OpenAPIV3.Document) => (interfaceDeclaration: ts.Statement, type: ts.Type, typeChecker: ts.TypeChecker, parsedJsDocTags: ParsedJsDocTags): OpenAPIV3.Document => {
    
    // @ts-ignore
    if (!interfaceDeclaration.name.escapedText.endsWith("Response")) return openAPIDoc;
    
    const { description, path, method } = parsedJsDocTags;

    if (!path || !method) {
        return openAPIDoc;
    }

    for (const prop of type.getProperties()) {
        
        // @ts-ignore
        let comment = ts.displayPartsToString(prop.getDocumentationComment(typeChecker));
        if (parsedJsDocTags.param[prop.name]) comment = parsedJsDocTags.param[prop.name];

        // @ts-ignore
        const propType = typeChecker.getTypeAtLocation(prop.valueDeclaration!).intrinsicName;

        // @ts-ignore
        const isRequired = prop.declarations?.every(d => d.questionToken === undefined);
        
        // @ts-ignore
        const childProperties = prop.valueDeclaration.type.members?.map(member => {
            // @ts-ignore
            const childPropType = typeChecker.getTypeAtLocation(member).intrinsicName;
            const isRequired = member.symbol.declarations?.every(d => d.questionToken === undefined);

            let childComment = ts.displayPartsToString(member.symbol.getDocumentationComment(typeChecker));
            if (parsedJsDocTags.param[member.name]) childComment = parsedJsDocTags.param[member.name];

            return [
                member.name.escapedText,
                {
                    name: member.name.escapedText,
                    type: childPropType,
                    ...(isRequired ? { required: true } : {}),
                    ...(childComment.length > 0 ? { description: childComment } : {})
                }
            ]
        }) || [];

        merge(openAPIDoc, {
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
        })
    }

    return openAPIDoc;
}

