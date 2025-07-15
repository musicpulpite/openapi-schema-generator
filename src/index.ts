import path from 'path';
import fs from 'fs';
import { program } from 'commander';

import TypesParser from "./types_parser";
import * as ReducerFunctions from './reducer_functions'

program
  .option('-t, --types-directory <typesDirectory>', 'Types directory path')
  .option('-b, --base-openapi-doc <baseOpenApiDoc>', 'Base OpenAPI doc path')
  .option('-o, --output <output>', 'Output path')
  .parse(process.argv);
const options = program.opts();

const typesDirectoryPath = options.typesDirectory;
const baseOpenApiDoc = options.baseOpenapiDoc;
const outputPath = options.output || path.resolve("./openapi.json");

if (!fs.existsSync(typesDirectoryPath)) {
  console.error(`Types directory ${typesDirectoryPath} does not exist`);
  process.exit(1);
}

const typesParser = new TypesParser(typesDirectoryPath);
if (baseOpenApiDoc && fs.existsSync(baseOpenApiDoc)) {
  typesParser.loadBaseOpenAPIDoc(JSON.parse(fs.readFileSync(path.resolve(baseOpenApiDoc), 'utf8')));
}
for (const f of Object.values(ReducerFunctions)) {
  typesParser.loadReducerFunctions(f);
}

typesParser.parseTypeFiles();

fs.writeFileSync(outputPath, JSON.stringify(typesParser.getOpenAPIDoc(), null, 2));
