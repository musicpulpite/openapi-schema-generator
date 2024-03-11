# openapi-schema-generator

## Note
This CLI utility was used for a very particular use case and is intended only as an illustrative example of how to parse a Typescript AST to extract useful information that can be translated into other languages/schemas/formats. It is almost certainly not extensible to your use-case.

This CLI utility expects to iterate through a single-level directory of Typescript type files (*.d.ts) that contain interfaces of the given form and converts them into API endpoint documentation using the [openapi specification](https://spec.openapis.org/oas/latest.html).

```
 * The description for the api endpoint at /rootpath/subpathendpoint
 * @path /rootpath/subpathendpoint
 * @method POST
 * @param {string} parameter1 - The first param's description
 * @param {number} parameter2 - The second param's description
 * @param {boolean} [parameter3] - The third param's description
 * @description - the description of the endpoint
 */
export interface RootpathSubpathendpointPostRequest {
  parameter1: string;
  parameter2: number;
  parameter3?: boolean;
}
```

## Setup
```
❯ npm install

up to date, audited 96 packages in 321ms

21 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
❯ npm run build

> openapi-schema-generator@1.0.0 build
> rimraf ./dist && rollup -c


./src/index.ts → ./dist/index.cjs...
(!) Plugin typescript: @rollup/plugin-typescript: Rollup 'sourcemap' option must be set to generate source maps.
created ./dist/index.cjs in 4.9s
❯ npm uninstall -g openapi-schema-generator && npm install -g

removed 1 package in 143ms

added 1 package in 99ms
❯ openapi-schema-generator --help
Usage: openapi-schema-generator [options]

Options:
  -t, --types-directory <typesDirectory>   Types directory path
  -b, --base-openapi-doc <baseOpenApiDoc>  Base OpenAPI doc path
  -o, --output <output>                    Output path
  -h, --help                               display help for command
```

## CLI Options
1. --types-directory: [REQUIRED]relative path to the directory that contains `.ts` type interface files (TypesParser automatically filters for top-level `.ts` files therin and excludes any `index.ts` files)
2. --base-open-api-doc: [OPTIONAL] expects well-formatted `.json` file comforming to the OpenAPIV3 spec. If included will combine all rules into the existing base document, otherwise will start from scratch. This is useful to include basic info such as API version number, and other meta information.
3. --output: [OPTIONAL] relative path of file to be written to once all operations have been completed and json document has been generated. Otherwise, defaults to `./openapi.json`.
