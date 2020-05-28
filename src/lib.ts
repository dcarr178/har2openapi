import {createEmptyApiSpec, OpenApiSpec, OperationObject} from "@loopback/openapi-v3-types";
import * as merge from "deepmerge";
import {readFileSync, writeFileSync} from 'fs'
import {Har} from "har-format";
import * as YAML from 'js-yaml'
import * as jsonSchemaGenerator from 'json-schema-generator'
import * as parseJson from 'parse-json'
import * as pluralize from 'pluralize'
import {exit} from 'process'
import * as sortJson from 'sort-json'

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
            const variableType = variable.replace(/Id/, '')
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
const createXcodeSamples = (spec: OpenApiSpec) => {
    Object.keys(spec.paths).forEach(path => {
        Object.keys(spec.paths[path]).forEach(lMethod => {
            if (lMethod === 'parameters') return
            const method = spec.paths[path][lMethod]
            const samples = []

            // create curl code
            let curlCode = `curl -X ${lMethod.toUpperCase()} ${method.meta.originalPath}`
            if (!method.meta.originalPath.includes('public')) curlCode += ` \\\n  -H 'Authorization: Bearer 598d9e1105ad96dac7ab528f0928996e'`
            const data = method.requestBody?.content?.["application/json"]?.examples?.['example-1']?.value
            if (data) {
                curlCode += ` \\\n  -H 'Content-Type: application/json'`
                // which data style do you prefer?
                curlCode += ` -d '\n${JSON.stringify(data, null, 2)}\n'`
                // curlCode += ` \\\n  -d '${JSON.stringify(data)}'`
                // curlCode += ` \\\n  --data-binary @- << EOF \n${JSON.stringify(data, null, 2)}\nEOF`
                // curlCode += ` -d '\n  ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')}\n'`
            }
            samples.push({
                lang: "SHELL",
                source: replaceApos(curlCode),
                syntaxLang: "bash"
            })

            // create javascript code
            const operationVariable = method.operationId.split('-').map((part, index) => index ? capitalize(part) : part).join('').trim()
            let jsCode = []

            // turn query string into search params
            let urlVar = ""
            if (method.meta.originalPath.includes("?")) {
                const pieces = method.meta.originalPath.split('?')
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
            jsCode.push(`  ${urlVar || "'" + method.meta.originalPath + "'"}, {`)
            jsCode.push(`   method: '${lMethod.toUpperCase()}',`)

            if (!method.meta.originalPath.includes('public')) {
                jsCode.push(`   headers: {`)
                jsCode.push(`    'Authorization': 'Bearer 598d9e1105ad96dac7ab528f0928996e'`)
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
                switch (method.meta.element) {
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
            samples.push({
                "lang": "JAVASCRIPT",
                "source": replaceApos(jsCode.join('\n')),
                "syntaxLang": "javascript"
            })

            // set x-code-samples
            method['x-code-samples'] = samples

        })
    })
}
const deriveSummary = (method, path) => {
    const pathParts = path.split('/')
    const lastParam = pathParts.length > 1 ? pathParts[pathParts.length - 2] : ""
    const lastLastParam = pathParts.length > 3 ? pathParts[pathParts.length - 4] : ""
    const obj = lastParam.includes("Id") ? lastParam.replace(/[{}]|Id/g, "") : ""
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
const generateSamples = (inputFilename: string, outputFilename: string) => {

    // load input file into memory
    const spec = parseJsonFile(inputFilename) as OpenApiSpec

    createJsonSchemas(spec)
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
        if (!item.request.url.includes(config.apiBasePath)) return

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
        if (item.request.bodySize > 0) mergeRequestExample(specMethod, item.request.postData)

        // merge response example
        if (item.response.bodySize > 0) mergeResponseExample(specMethod, item.response.status.toString(), item.response.content, method, filteredUrl)

        // writeFileSync('test.json', JSON.stringify(item, null, 2))
        // exit(0);

    })
    shortenExamples(spec);

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

            if (!specMethod['requestBody']) {
                specMethod['requestBody'] = {
                    "content": {
                        "application/json": {
                            "examples": {
                                "example-1": {}
                            },
                            "schema": {
                                "properties": {},
                                "type": "object"
                            }
                        }
                    }
                }
                specMethod.requestBody.content["application/json"].examples["example-1"]
            }
            const examples = specMethod.requestBody["content"]["application/json"].examples;

            // merge this object with other objects found
            examples["example-1"].value = merge(examples["example-1"].value, data, {arrayMerge: overwriteMerge})

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

        if (data !== null) {
            // create response example if it doesn't exist
            if (!specMethod.responses[statusString]['content']) {
                specMethod.responses[statusString]['content'] = {
                    "application/json": {
                        "examples": {
                            "example-1": {
                                "value": {}
                            }
                        },
                        "schema": {
                            "properties": {},
                            "type": "object"
                        }
                    }
                }
            }

            // merge current response into other response examples
            const examples = specMethod.responses[statusString].content["application/json"].examples['example-1']
            examples["value"] = merge(examples["value"], data, {arrayMerge: overwriteMerge})

            // set endpoint description from shoji description
            if (data.description) specMethod.description = data.description

            // capture metadata
            if (data.element) specMethod.meta['element'] = data.element

        }

    } catch (err) {

    }

}
const overwriteMerge = (destinationArray, sourceArray) => sourceArray
const parseHarFile = (filename: string): object => {
    const file = readFileSync(filename, 'utf8')
    try {
        const data = JSON.parse(file)
        if (!data.log) {
            console.log('Invalid har file')
            exit(1)
        }
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
const replaceApos = (s: string): string => s.replace(/'/g, "&apos;")
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
    mergeFiles,
    Config
}
