import {argv, exit} from 'process'
import {Config, generateSamples, generateSpec, mergeFiles, generateSchema} from './lib'

if (argv.length < 3) {
    console.log(`Usage: node ${argv[1]} examples inputHarFile1.json inputHarFile2.json inputHarFile3.json...`)
    console.log(`Usage: node ${argv[1]} schema`)
    console.log(`Usage: node ${argv[1]} merge masterFilename.json toMergeFilename.json outputFilename.json`)
} else {
    switch (argv[2]) {
        case 'examples':

            // grab input and output filenames
            if (argv.length < 4) {
                console.log(`Usage: node ${argv[1]} ${argv[2]} inputHarFile1.json inputHarFile2.json inputHarFile3.json...`)
                exit(0)
            }
            const outputFilename = 'output/examples.spec.json'
            const inputFilenames = argv.slice(3)

            // grab config file
            let config: Config
            try {
                config = require('./config.json')
            } catch {
                console.log('File config.json not found. Please copy config.json.template to config.json')
                exit(0)
            }
            config.pathReplace[config.apiBasePath] = "" // add base path to replace out

            // generate spec file
            generateSpec(inputFilenames, outputFilename, config)
            break;

        case 'schema':
            if (argv.length < 4) {
                console.log(`Usage: node ${argv[1]} ${argv[2]} examplesFilename.json`)
                exit(0)
            }
            const exampleFile = argv[3]
            generateSchema(exampleFile).then(spec => {
                generateSamples(spec, 'output/schema.spec.json')
            })
            break;

        case 'merge':
            if (argv.length < 6) {
                console.log(`Usage: node ${argv[1]} ${argv[2]} masterFilename.json toMergeFilename.json outputFilename.json`)
                exit(0)
            }
            const masterFilename = argv[3]
            const toMergeFilename = argv[4]
            const mergeOutput = argv[5]
            mergeFiles(masterFilename, toMergeFilename, mergeOutput)
            break;

        default:
            console.log(`Command ${argv[2]} not recognized`)
    }
}
