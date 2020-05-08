import {argv, exit} from 'process'
import {Config, generateSamples, generateSpec, mergeFiles} from './lib'

if (argv.length < 3) {
    console.log(`Usage: node ${argv[1]} generate outputFilename.json inputHarFile1.json inputHarFile2.json inputHarFile3.json...`)
    console.log(`Usage: node ${argv[1]} samples inputFilename.json outputFilename.json`)
    console.log(`Usage: node ${argv[1]} merge masterFilename.json toMergeFilename.json outputFilename.json`)
} else {
    switch (argv[2]) {
        case 'generate':

            // grab input and output filenames
            if (argv.length < 5) {
                console.log(`Usage: node ${argv[1]} ${argv[2]} outputFilename.json inputHarFile1.json inputHarFile2.json inputHarFile3.json...`)
                exit(0)
            }
            const outputFilename = argv[3]
            const inputFilenames = argv.slice(4)

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

        case 'samples':
            if (argv.length < 5) {
                console.log(`Usage: node ${argv[1]} ${argv[2]} inputFilename.json outputFilename.json`)
                exit(0)
            }
            const sampleInput = argv[3]
            const sampleOutput = argv[4]
            generateSamples(sampleInput, sampleOutput)
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
