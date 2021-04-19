import {createEmptyApiSpec, OpenApiBuilder, OpenApiSpec, OperationObject} from "@loopback/openapi-v3-types";
import * as merge from "deepmerge";
import {readFileSync, writeFileSync} from 'fs'
import {Har} from "har-format";
import * as YAML from 'js-yaml'
import * as jsonSchemaGenerator from 'json-schema-generator'
import * as parseJson from 'parse-json'
import * as pluralize from 'pluralize'
import {exit} from 'process'
import * as sortJson from 'sort-json'
import {JSONSchema4, JSONSchema6} from 'json-schema'
import {jsonInputForTargetLanguage, quicktype, InputData, JSONSchemaInput, JSONSchemaStore} from 'quicktype-core'
import * as refParser from '@apidevtools/json-schema-ref-parser'
import * as deref from 'json-schema-deref-sync'
import * as toOpenApiSchema from '@openapi-contrib/json-schema-to-openapi-schema'
import * as recursive from 'recursive-readdir'

interface ExampleFile {
    [path: string]: {
        [method: string]: {
            request: {
                [exampleName: string]: any
            },
            response: {
                [statusCode: string]: {
                    [exampleName: string]: any
                }
            }
        }
    }
}

interface SchemaFile {
    [path: string]: {
        [method: string]: {
            request: any,
            response: {
                [statusCode: string]: any
            }
        }
    }
}

const pad = (m: number, width: number, z = '0') => {
    const n = m.toString()
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

async function quicktypeJSON(targetLanguage, typeName, sampleArray) {
    const jsonInput = jsonInputForTargetLanguage(targetLanguage);

    await jsonInput.addSource({
        name: typeName,
        samples: sampleArray,
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    const result = await quicktype({
        inputData,
        lang: targetLanguage,
        alphabetizeProperties: true,
        allPropertiesOptional: true,
        ignoreJsonRefs: true
    });

    const returnJSON = JSON.parse(result.lines.join("\n"))
    // return refParser.dereference(returnJSON) // this one contains references
    return deref(returnJSON) // this one does not contain references
}

const addMethod = (method: string, filteredUrl: string, originalPath: string, methodList: string[], spec: OpenApiSpec, config: Config) => {
    // generate operation id
    let operationId = filteredUrl.replace(/(^\/|\/$|{|})/g, "").replace(/\//g, "-");
    operationId = `${method}-${operationId}`

    // create method
    const summary = deriveSummary(method, filteredUrl)
    const tag = deriveTag(filteredUrl, config)
    spec.paths[filteredUrl][method] = {
        operationId,
        summary,
        description: "",
        parameters: [],
        responses: {},
        tags: [tag],
        meta: {
            originalPath,
            element: ""
        }
    };

    methodList.push(`${tag}\t${filteredUrl}\t${method}\t${summary}`)
}
const addPath = (filteredUrl: string, spec: OpenApiSpec): void => {

    // identify what parameters this path has
    const parameters = []
    const parameterList = filteredUrl.match(/{.*?}/g)
    if (parameterList) {
        parameterList.forEach(parameter => {
            const variable = parameter.replace(/[{}]/g, '')
            const variableType = variable.replace(/_id/, '')
            parameters.push({
                "description": `Unique ID of the ${variableType} you are working with`,
                "in": "path",
                "name": variable,
                "required": true,
                "schema": {
                    "type": "string"
                }
            })
        })
    }

    // create path with parameters
    spec.paths[filteredUrl] = {
        parameters
    }

}
const addQueryStringParams = (specMethod, harParams: any[]) => {
    const methodQueryParameters = [];
    specMethod.parameters.forEach(param => {
        if (param.in === 'query') methodQueryParameters.push(param.name)
    })
    harParams.forEach(param => {
        if (!methodQueryParameters.includes(param.name)) {
            // add query parameter
            specMethod.parameters.push({
                schema: {
                    type: "string",
                    default: param.value,
                    example: param.value
                },
                in: "query",
                name: param.name,
                description: param.name
            })
        }
    })

}
const addResponse = (status: number, method: string, specPath: OperationObject): void => {
    switch (status) {
        case 200:
            switch (method) {
                case 'get':
                    specPath.responses["200"] = {"description": "Success"}
                    break;
                case 'delete':
                    specPath.responses["200"] = {"description": "Item deleted"}
                    break;
                case 'patch':
                    specPath.responses["200"] = {"description": "Item updated"}
                    break;
                case 'post':
                    specPath.responses["200"] = {"description": "Item created"}
                    break;
            }
            break;
        case 201:
            switch (method) {
                case 'post':
                    specPath.responses["201"] = {"description": "Item created"}
                    break;
            }
            break;
        case 202:
            switch (method) {
                case 'post':
                    specPath.responses["202"] = {"description": "Item created"}
                    break;
            }
            break;
        case 204:
            switch (method) {
                case 'get':
                    specPath.responses["204"] = {"description": "Success"}
                    break;
                case 'delete':
                    specPath.responses["204"] = {"description": "Item deleted"}
                    break;
                case 'patch':
                case 'put':
                    specPath.responses["204"] = {"description": "Item updated"}
                    break;
                case 'post':
                    specPath.responses["202"] = {"description": "Item created"}
                    break;
            }
            break;
        case 400:
            switch (method) {
                case 'delete':
                    specPath.responses["400"] = {"description": "Deletion failed - item in use"}
                    break;
                default:
                    specPath.responses["400"] = {"description": "Bad request"}
            }
            break;
        case 401:
            specPath.responses["401"] = {"description": "Unauthorized"}
            break;
        case 404:
            specPath.responses["404"] = {"description": "Item not found"}
            break;
        case 405:
            specPath.responses["405"] = {"description": "Not allowed"}
            break;
    }

}
const capitalize = (s: string): string => {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}
const combineMerge = (target, source, options): void => {
    const destination = target.slice()

    source.forEach((item, index) => {
        if (typeof destination[index] === 'undefined') {
            destination[index] = options.cloneUnlessOtherwiseSpecified(item, options)
        } else if (options.isMergeableObject(item)) {
            destination[index] = merge(target[index], item, options)
        } else if (target.indexOf(item) === -1) {
            destination.push(item)
        }
    })
    return destination
}
/*
const createJsonSchemas = (spec: OpenApiSpec): void => {
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(method => {
            const requestExample = spec.paths[path][method].requestBody?.content["application/json"]?.examples["example-1"]?.value
            if (requestExample) {
                // translate request example-1 into request schema somehow
                // spec.paths[path][method].requestBody.content["application/json"].schema = toJsonSchema(requestExample)
                spec.paths[path][method].requestBody.content["application/json"].schema = jsonSchemaGenerator(requestExample)
                delete spec.paths[path][method].requestBody.content["application/json"].schema["$schema"]
            }
            for (const response in spec.paths[path][method].responses) {
                // translate response example-1 into response schema
                const responseExample = spec.paths[path][method].responses[response]?.content?.["application/json"]?.examples["example-1"]?.value
                // if (responseExample) spec.paths[path][method].responses[response].content["application/json"].schema = toJsonSchema(responseExample)
                if (responseExample) {
                    spec.paths[path][method].responses[response].content["application/json"].schema = jsonSchemaGenerator(responseExample)
                    delete spec.paths[path][method].responses[response].content["application/json"].schema["$schema"]
                }
            }

        })
    })
}
*/
const createXcodeSamples = (spec: OpenApiSpec) => {
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(lMethod => {
            if (lMethod === 'parameters') return
            const method = spec.paths[path][lMethod]
            const samples = []
            const scrubbedPath = path
                .replace(/{dataset_id}/g, '0001a')
                .replace(/{variable_id}/g, '0001b')
                .replace(/{user_id}/g, '0001c')
                .replace(/{subvariable_id}/g, '0001d')
                .replace(/{folder_id}/g, '0001e')
                .replace(/{slide_id}/g, '0001f')
                .replace(/{deck_id}/g, '0001g')
                .replace(/{analysis_id}/g, '0001h')
                .replace(/{tag_name}/g, '0001i')
                .replace(/{project_id}/g, '0001j')
                .replace(/{integration_id}/g, '0001k')
                .replace(/{integration_partner}/g, '0001l')
                .replace(/{team_id}/g, '0001m')
                .replace(/{savepoint_id}/g, '0001n')
                .replace(/{script_id}/g, '0001o')
                .replace(/{multitable_id}/g, '0001p')
                .replace(/{subdomain}/g, '0001q')
                .replace(/{account_id}/g, '0001r')
                .replace(/{filter_id}/g, '0001s')
                .replace(/{geodata_id}/g, '0001t')
                .replace(/{task_id}/g, '0001u')
                .replace(/{flag_id}/g, '0001v')
                .replace(/{source_id}/g, '0001w')
                .replace(/{batch_id}/g, '0001x')
                .replace(/{action_hash}/g, '0001y')
                .replace(/{boxdata_id}/g, '0001z')
                .replace(/{datasetName}/g, '0001aa')
                .replace(/{format}/g, '0001ab')
                .replace(/{dashboard_id}/g, '0001ac')


            if (!method['x-code-samples']) method['x-code-samples'] = []

            // create curl code
            let data
            const originalPath = `https://app.crunch.io/api${method?.meta?.originalPath || scrubbedPath}`
            let curlCode = `curl -X ${lMethod.toUpperCase()} ${originalPath}`
            if (!originalPath.includes('public')) curlCode += ` \\\n  -H 'Authorization: Bearer 598d9e1105'`
            const examples = method.requestBody?.content?.["application/json"]?.examples
            if (examples) {
                const exampleList = Object.keys(examples)
                if (exampleList.length) {
                    const firstExample = exampleList[0]
                    data = method.requestBody?.content?.["application/json"]?.examples?.[firstExample]?.value
                }
            }
            if (data) {
                curlCode += ` \\\n  -H 'Content-Type: application/json'`
                // which data style do you prefer?
                curlCode += ` -d '\n${JSON.stringify(data, null, 2)}\n'`
                // curlCode += ` \\\n  -d '${JSON.stringify(data)}'`
                // curlCode += ` \\\n  --data-binary @- << EOF \n${JSON.stringify(data, null, 2)}\nEOF`
                // curlCode += ` -d '\n  ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')}\n'`
            }

            // overwrite existing SHELL array element if exists
            let found = false
            const shellCodeSample = {
                lang: "SHELL",
                source: replaceApos(curlCode),
                syntaxLang: "bash"
            }
            for (let codeSample in method['x-code-samples']) {
                if (method['x-code-samples'][codeSample].lang == "SHELL") {
                    found = true
                    method['x-code-samples'][codeSample] = shellCodeSample
                }
            }
            if (!found) {
                method['x-code-samples'].push(shellCodeSample)
            }

            // create javascript code
            const operationVariable = method.operationId.split('-').map((part, index) => index ? capitalize(part) : part).join('').trim()
            let jsCode = []

            // turn query string into search params
            let urlVar = ""
            if (originalPath.includes("?")) {
                const pieces = originalPath.split('?')
                urlVar = operationVariable + 'URL'
                jsCode.push(`const ${urlVar} = new URL('${pieces[0]}')`)
                jsCode.push(`${urlVar}.search = new URLSearchParams({`)
                pieces[1].split('&').forEach(keyval => {
                    const smallPieces = keyval.split('=')
                    jsCode.push(`  ${smallPieces[0]}: '${smallPieces[1]}'`)
                })
                jsCode.push(`})`)

            }

            jsCode.push(`const ${operationVariable} = await fetch(`)
            jsCode.push(`  ${urlVar || "'" + originalPath + "'"}, {`)
            jsCode.push(`   method: '${lMethod.toUpperCase()}',`)

            if (!originalPath.includes('public')) {
                jsCode.push(`   headers: {`)
                jsCode.push(`    'Authorization': 'Bearer 598d9e1105'`)
                if (data) {
                    jsCode[jsCode.length - 1] += ','
                    jsCode.push(`    'Content-Type': 'application/json'`)
                }
                jsCode.push(`   }`)
            }

            if (data) {
                jsCode[jsCode.length - 1] += ','
                const lines = `   body: JSON.stringify(${JSON.stringify(data, null, 2)})`.replace(/\n/g, '\n   ').split('\n')
                jsCode = jsCode.concat(lines)
            }
            jsCode.push(` })`)

            const firstResponse = Object.keys(method.responses)[0] || "";
            if (method.responses?.[firstResponse]?.content?.["application/json"]?.examples?.['example-1']?.value) {
                jsCode.push(` .then(response => response.json())`)
                switch (method.responses?.[firstResponse]?.content?.["application/json"]?.examples?.['example-1']?.value?.element) {
                    case 'shoji:catalog':
                        jsCode.push(` .then(jsonResponse => jsonResponse.index)`)
                        break
                    case 'shoji:entity':
                        jsCode.push(` .then(jsonResponse => jsonResponse.body)`)
                        break
                    case 'shoji:view':
                        jsCode.push(` .then(jsonResponse => jsonResponse.value)`)
                        break
                }
            }

            // overwrite existing JAVASCRIPT array element if exists
            found = false
            const jsCodeSample = {
                "lang": "JAVASCRIPT",
                "source": replaceApos(jsCode.join('\n')),
                "syntaxLang": "javascript"
            }
            for (let codeSample in method['x-code-samples']) {
                if (method['x-code-samples'][codeSample].lang == "JAVASCRIPT") {
                    found = true
                    method['x-code-samples'][codeSample] = jsCodeSample
                }
            }
            if (!found) {
                method['x-code-samples'].push(jsCodeSample)
            }

            // set x-code-samples
            // if you do this you'll overwrite any R or python code samples by mistake
            // method['x-code-samples'] = samples

        })
    })
}
const deriveSummary = (method, path) => {
    const pathParts = path.split('/')
    const lastParam = pathParts.length > 1 ? pathParts[pathParts.length - 2] : ""
    const lastLastParam = pathParts.length > 3 ? pathParts[pathParts.length - 4] : ""
    const obj = lastParam.includes("_id") ? lastParam.replace(/[{}]|_id/g, "") : ""
    switch (lastParam) {
        case 'login':
            return "Log in"
        case 'logout':
            return "Log out"
    }
    if (obj) {
        switch (method) {
            case 'get':
                return `${capitalize(obj)} details`
            case 'post':
                return `Create ${obj}`
            case 'patch':
            case 'put':
                return `Update ${obj}`
            case 'delete':
                return `Delete ${obj}`
        }
    }
    switch (method) {
        case 'get':
            return `List ${pluralize(lastLastParam, 1)}${lastLastParam ? " " : ""}${pluralize(lastParam)}`
        case 'post':
            return `Create ${pluralize(lastLastParam, 1)}${lastLastParam ? " " : ""}${pluralize(lastParam, 1)}`
        case 'put':
        case 'patch':
            return `Update ${pluralize(lastLastParam, 1)}${lastLastParam ? " " : ""}${pluralize(lastParam)}`
        case 'delete':
            return `Delete ${pluralize(lastLastParam, 1)}${lastLastParam ? " " : ""}${pluralize(lastParam)}`
    }
    return "SUMMARY"
}
const deriveTag = (path: string, config: Config) => {
    for (const item of config.tags) {
        if (path.includes(item[0])) return item.length > 1 ? item[1] : capitalize(item[0])
    }
    return "Miscellaneous"
}
const filterUrl = (config: Config, inputUrl: string): string => {
    let filteredUrl = inputUrl
    // filteredUrl = filteredUrl.replace(/by_name\/.*\//, 'by_name/{dataset-name}/')

    for (const key in config.pathReplace) {
        const re = new RegExp(key, 'g')
        filteredUrl = filteredUrl.replace(re, config.pathReplace[key])
    }

    return filteredUrl
}
const generateSamples = (spec: OpenApiSpec, outputFilename: string) => {

    // createJsonSchemas(spec)
    createXcodeSamples(spec)

    // perform the final strip where we take out things we don't want to see in final spec
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(lMethod => {
            delete spec.paths[path][lMethod]['meta']
        })
    })
    const stripedSpec = JSON.parse(JSON.stringify(spec)
        .replace(/stable\.crunch\.io/g, 'app.crunch.io')
        .replace(/A\$dfasdfasdf/g, 'abcdef')
        .replace(/captain@crunch.io/g, 'user@crunch.io')
    )

    writeFileSync(outputFilename, JSON.stringify(stripedSpec, null, 2))
    writeFileSync(outputFilename + '.yaml', YAML.dump(stripedSpec))

    console.log(`${outputFilename} created`)

}
const generateSpec = (inputFilenames: string[], outputFilename: string, config: Config) => {

    // load input files into memory
    const inputHars = inputFilenames.map(filename => parseHarFile(filename))
    const har = merge.all(inputHars) as Har
    console.log(`Network requests found in har file(s): ${har.log.entries.length}`)

    // loop through har entries
    const spec = createEmptyApiSpec()
    const methodList = []
    har.log.entries.sort().forEach(item => {

        // only care about urls that match target api
        if (!item.request.url.includes(config.apiBasePath)) {
            // requests to superadmin will not have url in path
            // I also check instead for html vs json response
            if (item.request.url.includes('api') || item.response?.content?.mimeType?.includes('application/json')) {
                console.log('apiBasePath mismatch', item.request.url)
            }
            return
        }

        // filter and collapse path urls
        let filteredUrl = filterUrl(config, item.request.url)

        // continue if url is blank
        if (!filteredUrl) return

        // create path
        if (!spec.paths[filteredUrl]) addPath(filteredUrl, spec)

        // create method
        const method = item.request.method.toLowerCase()
        if (!spec.paths[filteredUrl][method]) addMethod(method, filteredUrl, item.request.url, methodList, spec, config)
        const specMethod = spec.paths[filteredUrl][method]

        // set original path to last request received
        specMethod.meta.originalPath = item.request.url

        // console.log(filteredUrl, method)
        // if (method === 'post' && filteredUrl === '/account/users/') {
        //     console.log('hello')
        // }

        // generate response
        addResponse(item.response.status, method, specMethod)

        // add query string parameters
        addQueryStringParams(specMethod, item.request.queryString)

        // merge request example
        if (item.request.bodySize > 0 && item.response.status < 400) mergeRequestExample(specMethod, item.request.postData)

        // merge response example
        if (item.response.bodySize > 0) mergeResponseExample(specMethod, item.response.status.toString(), item.response.content, method, filteredUrl)

        // writeFileSync('test.json', JSON.stringify(item, null, 2))
        // exit(0);

    })

    // ia am removing this for now because full examples will give us better json schema detection
    // shortenExamples(spec);

    // sort paths
    spec.paths = sortJson(spec.paths, {depth: 200})

    // global replace
    let specString = JSON.stringify(spec)
    for (const key in config.replace) {
        const re = new RegExp(key, 'g')
        specString = specString.replace(re, config.replace[key])
    }
    const outputSpec = parseJson(specString)

    writeFileSync(outputFilename, JSON.stringify(outputSpec, null, 2))
    writeFileSync(outputFilename + '.yaml', YAML.dump(outputSpec))

    writeExamples(outputSpec)

    // write urlList to debug
    writeFileSync('output/pathList.txt', Object.keys(outputSpec.paths).join('\n'))

    //write method list to debug
    writeFileSync('output/methodList.txt', methodList.sort().join('\n'))

    console.log('Paths created:', Object.keys(outputSpec.paths).length)
    console.log('Operations created:', methodList.length)

}
const mergeFiles = (masterFilename: string, toMergeFilename: string, outputFilename: string) => {

    // load input file into memory
    const master = parseJsonFile(masterFilename) as OpenApiSpec
    const toMerge = parseJsonFile(toMergeFilename) as OpenApiSpec

    // only copy over methods that do not exist in master
    for (const path in toMerge.paths) {
        if (!master.paths[path]) {
            master.paths[path] = toMerge.paths[path]
        } else {
            for (const method in toMerge.paths[path]) {
                if (!master.paths[path][method]) master.paths[path][method] = toMerge.paths[path][method]
            }
        }
    }

    master.paths = sortJson(master.paths, {depth: 200})
    writeFileSync(outputFilename, JSON.stringify(master, null, 2))
    writeFileSync(outputFilename + '.yaml', YAML.safeDump(master))

    console.log(`${outputFilename} created`)

}
const mergeRequestExample = (specMethod: OperationObject, postData: any) => {
    // if (postData.mimeType === null) { // data sent
    if (postData.text) { // data sent
        try {
            const data = JSON.parse(postData.encoding == 'base64' ? Buffer.from(postData.text, 'base64').toString() : postData.text)
            // if (Object.keys(data).length < 1) return;

            if (!specMethod['requestBody']) {
                specMethod['requestBody'] = {
                    "content": {
                        "application/json": {
                            "examples": {
                                "example-0001": {
                                    value: {}
                                }
                            },
                            "schema": {
                                "properties": {},
                                "type": "object"
                            }
                        }
                    }
                }
                specMethod.requestBody.content["application/json"].examples["example-0001"]
            }
            const examples = specMethod.requestBody["content"]["application/json"].examples;

            // do not add example if it is duplicate of another example
            const dataString = JSON.stringify(data)
            for (const example in examples) {
                const compare = JSON.stringify(examples[example]['value'])
                if (dataString === compare) return
            }

            // merge this object with other objects found
            examples["example-0001"]["value"] = merge(examples["example-0001"]["value"], data, {arrayMerge: overwriteMerge})

            // also add a new example
            examples[`example-${pad(Object.keys(examples).length + 1, 4)}`] = {
                value: data
            }

        } catch (err) {
        }
    } else { // binary file sent
        if (!specMethod['requestBody']) {
            specMethod['requestBody'] = {
                "content": {
                    "multipart/form-data": {
                        "schema": {
                            "properties": {
                                "filename": {
                                    "description": "",
                                    "format": "binary",
                                    "type": "string"
                                }
                            },
                            "type": "object"
                        }
                    }
                }
            }
        }
    }

}
const mergeResponseExample = (specMethod: OperationObject, statusString: string, content, method, filteredUrl) => {
    try {
        const data = JSON.parse(content.encoding == 'base64' ? Buffer.from(content.text, 'base64').toString() : content.text)

        // remove data traceback if exists
        delete data['traceback']

        if (data !== null && Object.keys(data).length > 1) {
            // create response example if it doesn't exist
            if (!specMethod.responses[statusString]['content']) {
                specMethod.responses[statusString]['content'] = {
                    "application/json": {
                        "examples": {
                            "example-0001": {
                                value: {}
                            }
                        },
                        "schema": {
                            "properties": {},
                            "type": "object"
                        }
                    }
                }
            }

            // const examples = specMethod.responses[statusString].content["application/json"].examples['example-1']
            const examples = specMethod.responses[statusString].content["application/json"].examples

            // do not add example if it is duplicate of another example
            const dataString = JSON.stringify(data)
            for (const example in examples) {
                const compare = JSON.stringify(examples[example]['value'])
                if (dataString === compare) return
            }

            // merge current response into other response examples
            examples["example-0001"]["value"] = merge(examples["example-0001"]["value"], data, {arrayMerge: overwriteMerge})

            // also add a new example
            examples[`example-${pad(Object.keys(examples).length + 1, 4)}`] = {
                value: data
            }

            // set endpoint description from shoji description
            if (data.description) specMethod.description = data.description

            // capture metadata
            if (data.element) specMethod.meta['element'] = data.element

        }

    } catch (err) {

    }

}
const overwriteMerge = (destinationArray, sourceArray) => sourceArray
const parseHarFileIntoIndividualFiles = (filename: string): void => {
    const file = readFileSync(`input/${filename}`, 'utf8')
    try {
        const data: Har = JSON.parse(file)
        if (!data.log) {
            console.log('Invalid har file')
            exit(1)
        }

        // decode base64 now before writing pretty har file
        data.log.entries.forEach((item, index) => {
            if (item.response.content.encoding === 'base64') {
                data.log.entries[index].response.content.text = Buffer.from(item.response.content.text, 'base64').toString()
                delete data.log.entries[index].response.content.encoding
            }
            writeFileSync(`output/individualHars/${filename.replace(/\//g, '-')}-${index}.json`, JSON.stringify(data.log.entries[index], null, 2))
        })

    } catch (err) {
        console.log(`${filename} contains invalid json`)
        exit(1)
    }
}
const parseHarFile = (filename: string): object => {
    const file = readFileSync(filename, 'utf8')
    try {
        const data: Har = JSON.parse(file)
        if (!data.log) {
            console.log('Invalid har file')
            exit(1)
        }

        // decode base64 now before writing pretty har file
        data.log.entries.forEach((item, index) => {
            if (item.response.content.encoding === 'base64') {
                data.log.entries[index].response.content.text = Buffer.from(item.response.content.text, 'base64').toString()
                delete data.log.entries[index].response.content.encoding
            }
        })

        // save pretty har file
        writeFileSync(`output/${filename.replace(/\//g, '-')}`, JSON.stringify(data, null, 2))

        return data
    } catch (err) {
        console.log(`${filename} contains invalid json`)
        exit(1)
    }
}
const parseJsonFile = (filename: string): object => {
    const file = readFileSync(filename, 'utf8')
    try {
        return JSON.parse(file)
    } catch (err) {
        console.log(`${filename} contains invalid json`)
        exit(1)
    }
}
const replaceApos = (s: string): string => s; // rapidoc now supports single quote
// const replaceApos = (s: string): string => s.replace(/'/g, "&apos;")
const writeExamples = (spec: OpenApiSpec) => {
    const specExamples = {}
    Object.keys(spec.paths).forEach(path => {
        specExamples[path] = {}
        Object.keys(spec.paths[path]).forEach(lMethod => {
            if (lMethod === 'parameters') return
            if (lMethod === 'options') return
            specExamples[path][lMethod] = {
                request: {},
                response: {}
            }
            const method = spec.paths[path][lMethod]

            // find request examples
            let examples = method.requestBody?.content?.["application/json"]?.examples
            if (examples) {

                // if valid examples contain contain shoji and non-shoji requests then we have to delete the non-shoji
                // requests in order to not display them as examples and not pollute our json schema
                let shoji = false
                for (const example in examples) {
                    if (examples[example]['value']['element']?.includes('shoji')) shoji = true
                }

                // add examples to list
                const exampleCount = Object.keys(examples).length
                let exampleNum = 0;
                for (const example in examples) {
                    exampleNum++
                    if (exampleNum < 2 || exampleCount != 2) {
                        if (!shoji || examples[example]['value']['element']?.includes('shoji')) {
                            specExamples[path][lMethod]['request'][example] = examples[example]['value']
                        } else {

                            // console.log('non-shoji found in', path, lMethod)
                        }
                    }
                }
            }

            // look at responses
            for (const status in method.responses) {
                examples = method.responses?.[status]?.content?.["application/json"]?.examples
                if (examples) {
                    specExamples[path][lMethod]['response'][status] = {}
                    const exampleCount = Object.keys(examples).length
                    let exampleNum = 0;
                    for (const example in examples) {
                        exampleNum++
                        if (exampleNum < 2 || exampleCount != 2) specExamples[path][lMethod]['response'][status][example] = examples[example]['value']
                    }
                }
            }

        })
    })

    // sort examples
    const sortedExamples = sortJson(specExamples, {depth: 200})

    // dump as yaml
    writeFileSync('output/examples.yaml', YAML.dump(sortedExamples))
    writeFileSync('output/examples.json', JSON.stringify(sortedExamples, null, 2))
}
const shortenExamples = (spec: OpenApiSpec) => {
    // limit size after all responses and requests have been merged
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(lMethod => {
            const method = spec.paths[path][lMethod]

            // look at requestBody
            let data = method.requestBody?.content?.["application/json"]?.examples?.['example-1']?.value?.body?.table
            if (data) {
                const dataKeys = ['metadata']
                dataKeys.forEach(dataKey => {
                    if (data[dataKey] && Object.keys(data[dataKey].length > 2)) {
                        const keys = Object.keys(data[dataKey])
                        const newData = {}
                        for (let i = 2; i > 0; i--) {
                            newData[keys[keys.length - i]] = data[dataKey][keys[keys.length - i]]
                        }
                        data[dataKey] = newData
                    }
                })
            }
            data = method.requestBody?.content?.["application/json"]?.examples?.['example-1']?.value
            if (data) {
                const dataKeys = ['variables', 'index']
                dataKeys.forEach(dataKey => {
                    if (data[dataKey] && Object.keys(data[dataKey].length > 3)) {
                        const keys = Object.keys(data[dataKey])
                        const newData = {}
                        for (let i = 3; i > 0; i--) {
                            newData[keys[keys.length - i]] = data[dataKey][keys[keys.length - i]]
                        }
                        data[dataKey] = newData
                    }
                })
            }
            data = method.requestBody?.content?.["application/json"]?.examples?.['example-1']?.value?.body?.preferences
            if (data) {
                const dataKeys = ['openedDecks']
                dataKeys.forEach(dataKey => {
                    if (data[dataKey] && Object.keys(data[dataKey].length > 2)) {
                        const keys = Object.keys(data[dataKey])
                        const newData = {}
                        for (let i = 2; i > 0; i--) {
                            newData[keys[keys.length - i]] = data[dataKey][keys[keys.length - i]]
                        }
                        data[dataKey] = newData
                    }
                })
            }

            // look at responses
            for (const status in method.responses) {
                const data = method.responses?.[status]?.content?.["application/json"]?.examples?.['example-1']?.value
                if (data) {
                    // if index.length > 2 then remove all but last 2 entries
                    const dataKeys = ['metadata', 'index', 'graph']
                    dataKeys.forEach(dataKey => {
                        if (data[dataKey] && Object.keys(data[dataKey].length > 2)) {
                            const keys = Object.keys(data[dataKey])
                            const newData = {}
                            for (let i = 2; i > 0; i--) {
                                newData[keys[keys.length - i]] = data[dataKey][keys[keys.length - i]]
                            }
                            data[dataKey] = newData
                        }
                    })
                }
            }

        })
    })
}
const validateExampleList = (exampleObject: Object, exampleObjectName: string, exampleFilename: string) => {
    const exampleCount = Object.keys(exampleObject).length
    let gexampleCount = 0
    const allExamples = []
    const publishExamplesArray = []
    for (const exampleName in exampleObject) {
        allExamples.push(JSON.stringify(exampleObject[exampleName]))
        if (exampleName.includes('gexample')) {
            gexampleCount += 1
            publishExamplesArray.push(exampleObject[exampleName])
        }
    }
    if (exampleCount && !gexampleCount) {
        console.log(`${exampleObjectName} has ${exampleCount} examples with no gexamples - edit ${exampleFilename} again`)
        exit(1)
    }
    // renumber examples
    const padWidth = Math.floor(publishExamplesArray.length / 10) + 1
    const publishExamples = {}
    let firstExample: any
    for (let i = 0; i < publishExamplesArray.length; i++) {
        const exampleName = `example-${pad(i + 1, padWidth)}`
        if (!firstExample) firstExample = publishExamplesArray[i]
        publishExamples[exampleName] = {value: publishExamplesArray[i]}
    }

    return {
        allExamples,
        publishExamples,
        firstExample
    }
}
const generateSchema = async (exampleFilename: string) => {
    const masterExamples = parseJsonFile(exampleFilename) as ExampleFile
    const oldSpec = parseJsonFile('output/examples.spec.json') as OpenApiSpec
    const newSpec: OpenApiSpec = {
        openapi: oldSpec.openapi,
        info: oldSpec.info,
        servers: oldSpec.servers,
        paths: {}
    }
    for (const path in masterExamples) {

        // start with path object from examples spec
        if (oldSpec.paths[path]) {
            newSpec.paths[path] = oldSpec.paths[path]
        } else {
            newSpec.paths[path] = {}
        }

        for (const method in masterExamples[path]) {

            // create a spec if none exists. i.e. we added an example where there was no unit test
            if (!newSpec.paths[path][method]) {
                let operationId = path.replace(/(^\/|\/$|{|})/g, "").replace(/\//g, "-");
                operationId = `${method}-${operationId}`
                newSpec.paths[path][method] = {
                    operationId,
                    summary: operationId,
                    description: "",
                    parameters: [],
                    responses: {},
                    tags: ['UNKNOWN'],
                    meta: {
                        originalPath: `https://app.crunch.io/api${path}`
                    },

                };

            }

            const methodObject = newSpec.paths[path][method]

            const numExamples = Object.keys(masterExamples[path][method].request).length
            console.log(path, method, 'request', numExamples)
            if (numExamples) {
                const exampleStats = validateExampleList(masterExamples[path][method].request, `${path} ${method} requests`, exampleFilename)
                const jsonSchema = await quicktypeJSON('schema', [path, method, 'request'].join("-"), exampleStats.allExamples)
                if (jsonSchema.properties?.element) {
                    switch (exampleStats.firstExample.element) {
                        case 'shoji:entity':
                            jsonSchema.properties.element = {
                                $ref: '#/components/schemas/Shoji-entity-element'
                            }
                            break;
                        case 'shoji:catalog':
                            jsonSchema.properties.element = {
                                $ref: '#/components/schemas/Shoji-catalog-element'
                            }
                            break;
                        case 'shoji:view':
                            jsonSchema.properties.element = {
                                $ref: '#/components/schemas/Shoji-view-element'
                            }
                            break;

                    }
                }
                if (!methodObject.requestBody) methodObject.requestBody = {
                    content: {
                        "application/json": {}
                    }
                }
                methodObject.requestBody.content["application/json"].schema = await toOpenApiSchema(jsonSchema)
                    .catch(err => {
                        console.log('ERROR CONVERTING TO OPENAPI SCHEMA, USING JSON SCHEMA')
                        methodObject.requestBody.content["application/json"].schema = jsonSchema
                    })
                methodObject.requestBody.content["application/json"].examples = exampleStats.publishExamples
            }

            for (const statusCode in masterExamples[path][method].response) {
                const numExamples = Object.keys(masterExamples[path][method].response[statusCode]).length
                console.log(path, method, statusCode, numExamples)
                if (numExamples) {
                    const exampleStats = validateExampleList(masterExamples[path][method].response[statusCode], `${path} ${method} requests`, exampleFilename)
                    const jsonSchema = await quicktypeJSON('schema', [path, method, 'request'].join("-"), exampleStats.allExamples)
                    if (jsonSchema.properties?.element) {
                        switch (exampleStats.firstExample.element) {
                            case 'shoji:entity':
                                jsonSchema.properties.element = {
                                    $ref: '#/components/schemas/Shoji-entity-element'
                                }
                                break;
                            case 'shoji:catalog':
                                jsonSchema.properties.element = {
                                    $ref: '#/components/schemas/Shoji-catalog-element'
                                }
                                break;
                            case 'shoji:view':
                                jsonSchema.properties.element = {
                                    $ref: '#/components/schemas/Shoji-view-element'
                                }
                                break;

                        }
                    }
                    if (!methodObject.responses[statusCode]) {
                        methodObject.responses[statusCode] = {
                            content: {
                                "application/json": {}
                            }
                        }
                    }
                    methodObject.responses[statusCode].content["application/json"].schema = await toOpenApiSchema(jsonSchema)
                        .catch(err => {
                            console.log('ERROR CONVERTING TO OPENAPI SCHEMA, USING JSON SCHEMA')
                            methodObject.responses[statusCode].content["application/json"].schema = jsonSchema
                        })
                    methodObject.responses[statusCode].content["application/json"].examples = exampleStats.publishExamples
                }
            }
        }
    }

    return newSpec

}
const updateXcode = (filename: string) => {
    console.log(filename)
    // input file yaml to json object
    const file: OpenApiSpec = YAML.safeLoad(readFileSync(filename))

    // generate new samples
    createXcodeSamples(file)

    // write file back to orig yaml
    writeFileSync(filename, YAML.safeDump(file))
}

const QAPaths = (spec: OpenApiSpec) => {
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(lMethod => {
            if (lMethod === 'parameters') return
            const method = spec.paths[path][lMethod]

            const examples = method.requestBody?.content?.["application/json"]?.examples
            let firstExample
            if (examples) {
                const exampleList = Object.keys(examples)
                for (let exampleName of exampleList) {
                    const exampleData = method.requestBody?.content?.["application/json"]?.examples?.[exampleName]?.value
                    if (!firstExample) firstExample = exampleData // to use later

                    // log places where examples do not use shoji elements so we can correct them manually
                    const elementType = exampleData.element
                    if (!elementType) {
                        console.log(path, lMethod, exampleName, 'NO SHOJI ELEMENT')
                    }
                }
            }

            // search json schema for element is string not ref and change them
            const requestSchemaElement = method.requestBody?.content?.["application/json"]?.schema?.properties?.element
            if (requestSchemaElement) {
                if (!requestSchemaElement['$ref']) {
                    console.log(requestSchemaElement)
                    console.log('element', firstExample.element)
                    switch (firstExample.element) {
                        case "shoji:order":
                            method.requestBody.content["application/json"].schema.properties.element = {'$ref': '#/components/schemas/Shoji-order-element'}
                            break;
                        case "shoji:entity":
                            method.requestBody.content["application/json"].schema.properties.element = {'$ref': '#/components/schemas/Shoji-entity-element'}
                            break;
                        case "shoji:catalog":
                            method.requestBody.content["application/json"].schema.properties.element = {'$ref': '#/components/schemas/Shoji-catalog-element'}
                            break;
                        case "shoji:view":
                            method.requestBody.content["application/json"].schema.properties.element = {'$ref': '#/components/schemas/Shoji-view-element'}
                            break;
                    }
                }
            }

            if (method.responses) {
                for (let responseCode in method.responses) {

                    // delete 404 where nothing matches URI
                    if (responseCode == '404') {
                        const responseExampleMessage = method.responses[responseCode].content?.['application/json']?.examples['example-1']?.value?.message
                        if (responseExampleMessage == 'Nothing matches the given URI') {
                            console.log(responseExampleMessage)
                            delete method.responses[responseCode]
                        }

                    }

                    // turn 202 responses into standard object
                    if (responseCode == '202') {
                        method.responses[responseCode] = {
                            "content": {
                                "application/json": {
                                    "examples": {
                                        "example-1": {
                                            "value": {
                                                "element": "shoji:view",
                                                "self": "https://app.crunch.io/api/datasets/a5a3d3890a6e453d85662e9c66a9b7e9/decks/5f9720247f1145d6918d0a4463b17131/export/",
                                                "value": "https://app.crunch.io/api/progress/3Aa5a3d3890a6e453d85662e9c66a9b7e9%24a3af7cb7765f3fee01c49225bf34415d/"
                                            }
                                        }
                                    },
                                    "schema": {
                                        "$ref": '#/components/schemas/202-response'
                                    }
                                }
                            },
                            "description": "Asynchronous task started. \n\nThe `location` header contains a URL for the resource requested, which will become available when the asynchronous task has completed.\n\nThe `value` element in the JSON response contains a progress URL which you can query to monitor task completion. See **Task progress** endpoint for more details.",
                            "headers": {
                                "Location": {
                                    "description": "URL for resource requested, available when the asynchronous task has completed.",
                                    "schema": {
                                        "type": "string"
                                    }
                                }
                            }
                        }
                    }
                }
            }




        })
    })

}

const postProduction = () => {
    const yamlFiles = []
    recursive("/home/dcarr/git/crunch/zoom/server/src/cr/server/api", ["*.py*"], function (err, files) {
        for (const filename of files) {
            if (filename.includes("openapi") && !filename.includes("openapi.json")) {
                console.log(`ANALYZING OPENAPI FILE ${filename}`)
                const file: OpenApiSpec = YAML.safeLoad(readFileSync(filename))

                // generate new samples
                createXcodeSamples(file)
                QAPaths(file)

                // write file back to orig yaml
                writeFileSync(filename, YAML.safeDump(file))
            }
        }
    });
}

const listEndpoints = () => {
    const file = readFileSync('/home/dcarr/git/crunch/zoom/server/src/cr/server/api/static/openapi.json', 'utf8')
    const spec: OpenApiSpec = JSON.parse(file)
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(lMethod => {
            if (lMethod !== 'parameters') {
                const method = spec.paths[path][lMethod]
                const methodPath = `${lMethod.toUpperCase()} ${path}`
                const url = `https://crunch.io/api/reference/#${lMethod}-${path.replace(/[{}]/g, '-')}`
                console.log([
                    methodPath,
                    method.summary,
                    url
                ].join('\t'))
            }
        })
    })

}

interface Config {
    apiBasePath: string,
    pathReplace: {
        [search: string]: string;
    },
    replace: {
        [search: string]: string;
    },
    tags: string[][]
}

export {
    generateSamples,
    generateSpec,
    generateSchema,
    mergeFiles,
    updateXcode,
    parseHarFileIntoIndividualFiles,
    postProduction,
    listEndpoints,
    Config
}

