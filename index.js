"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = require("process");
const lib_1 = require("./lib");
const recursive = require("recursive-readdir");
if (process_1.argv.length < 3) {
    console.log(`Usage: node ${process_1.argv[1]} examples inputHarFile1.json inputHarFile2.json inputHarFile3.json...`);
    console.log(`Usage: node ${process_1.argv[1]} schema`);
    console.log(`Usage: node ${process_1.argv[1]} xcode`);
    console.log(`Usage: node ${process_1.argv[1]} merge masterFilename.json toMergeFilename.json outputFilename.json`);
}
else {
    switch (process_1.argv[2]) {
        case 'examples':
            if (process_1.argv.length < 4) {
                console.log(`Usage: node ${process_1.argv[1]} ${process_1.argv[2]} inputHarFile1.json inputHarFile2.json inputHarFile3.json...`);
                process_1.exit(0);
            }
            const outputFilename = 'output/examples.spec.json';
            const inputFilenames = process_1.argv.slice(3);
            let config;
            try {
                config = require('./config.json');
            }
            catch (_a) {
                console.log('File config.json not found. Please copy config.json.template to config.json');
                process_1.exit(0);
            }
            config.pathReplace[config.apiBasePath] = "";
            lib_1.generateSpec(inputFilenames, outputFilename, config);
            break;
        case 'schema':
            if (process_1.argv.length < 4) {
                console.log(`Usage: node ${process_1.argv[1]} ${process_1.argv[2]} examplesFilename.json`);
                process_1.exit(0);
            }
            const exampleFile = process_1.argv[3];
            lib_1.generateSchema(exampleFile).then(spec => {
                lib_1.generateSamples(spec, 'output/schema.spec.json');
            });
            break;
        case "xcode":
            recursive("/home/dcarr/git/crunch/zoom/server/src/cr/server/api", ["*.py*"], function (err, files) {
                for (const file of files) {
                    if (file.includes("openapi"))
                        lib_1.updateXcode(file);
                }
            });
            break;
        case 'post':
            lib_1.postProduction();
            break;
        case 'list':
            lib_1.listEndpoints();
            break;
        case 'merge':
            if (process_1.argv.length < 6) {
                console.log(`Usage: node ${process_1.argv[1]} ${process_1.argv[2]} masterFilename.json toMergeFilename.json outputFilename.json`);
                process_1.exit(0);
            }
            const masterFilename = process_1.argv[3];
            const toMergeFilename = process_1.argv[4];
            const mergeOutput = process_1.argv[5];
            lib_1.mergeFiles(masterFilename, toMergeFilename, mergeOutput);
            break;
        case 'individual':
            lib_1.parseHarFileIntoIndividualFiles(process_1.argv[3]);
            break;
        default:
            console.log(`Command ${process_1.argv[2]} not recognized`);
    }
}
