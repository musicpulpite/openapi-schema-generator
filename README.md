# openapi-schema-generator

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